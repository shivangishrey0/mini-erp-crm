import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { createOrderSchema, listOrdersQuerySchema } from "../schemas/order.schema";
import { lockInventoryRecord, availableQty } from "../lib/inventoryLock";

type TxClient = Prisma.TransactionClient;

async function generateOrderNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.order.count({ where: { orderNumber: { startsWith: `SO-${year}-` } } });
  return `SO-${year}-${String(count + 1).padStart(4, "0")}`;
}

const includeRefs = {
  items: true,
  customer: { select: { id: true, name: true, businessName: true } },
} as const;

function lineKey(item: { productId: string; locationId: string; batch: string }) {
  return `${item.productId}::${item.locationId}::${item.batch}`;
}

// Creating an order reserves stock immediately - this is the race the
// brief calls out explicitly ("two users must not reserve more stock than
// actually exists"). Every line's InventoryRecord is locked, in a fixed
// order (sorted key) so two orders touching overlapping lines can't
// deadlock each other, and validated against Available (physical -
// reserved) before any reservedQty is incremented. Same-product duplicate
// lines are aggregated first so they can't each individually pass
// validation against a pre-increment snapshot.
export async function create(req: Request, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { customerId, items } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!productMap.has(item.productId)) {
      throw new AppError(400, `Product ${item.productId} not found`);
    }
  }

  const locations = await prisma.location.findMany({ where: { id: { in: items.map((i) => i.locationId) } } });
  const locationIds = new Set(locations.map((l) => l.id));
  for (const item of items) {
    if (!locationIds.has(item.locationId)) {
      throw new AppError(400, `Location ${item.locationId} not found`);
    }
  }

  const aggregated = new Map<string, { productId: string; locationId: string; batch: string; quantity: number }>();
  for (const item of items) {
    const key = lineKey(item);
    const existing = aggregated.get(key);
    aggregated.set(key, { ...item, quantity: (existing?.quantity ?? 0) + item.quantity });
  }
  const sortedKeys = [...aggregated.keys()].sort();

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const order = await prisma.$transaction(async (tx) => {
    for (const key of sortedKeys) {
      const line = aggregated.get(key)!;
      const record = await lockInventoryRecord(tx, line);
      const available = availableQty(record);
      if (line.quantity > available) {
        const product = productMap.get(line.productId)!;
        throw new AppError(
          400,
          `Insufficient available stock for ${product.name}: available ${available}, requested ${line.quantity}`
        );
      }
      await tx.inventoryRecord.update({
        where: { id: record.id },
        data: { reservedQty: { increment: line.quantity } },
      });
    }

    const orderNumber = await generateOrderNumber(tx);

    return tx.order.create({
      data: {
        orderNumber,
        customerId,
        userId: req.user!.userId,
        totalQuantity,
        status: "RESERVED",
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              locationId: item.locationId,
              batch: item.batch,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: includeRefs,
    });
  });

  res.status(201).json({ order });
}

// Converts a reservation into an actual shipment: physical stock and the
// reservation both drop together.
export async function fulfill(req: Request, res: Response) {
  const id = req.params.id as string;

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      throw new AppError(404, "Order not found");
    }
    if (existing.status !== "RESERVED") {
      throw new AppError(400, `Order must be RESERVED to fulfill, currently ${existing.status}`);
    }

    const aggregated = new Map<string, { productId: string; locationId: string; batch: string; quantity: number }>();
    for (const item of existing.items) {
      const key = lineKey(item);
      const prev = aggregated.get(key);
      aggregated.set(key, { ...item, quantity: (prev?.quantity ?? 0) + item.quantity });
    }

    for (const key of [...aggregated.keys()].sort()) {
      const line = aggregated.get(key)!;
      const record = await lockInventoryRecord(tx, line);
      await tx.inventoryRecord.update({
        where: { id: record.id },
        data: { physicalQty: { decrement: line.quantity }, reservedQty: { decrement: line.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          locationId: line.locationId,
          batch: line.batch,
          quantity: line.quantity,
          type: "OUT",
          reason: `Order ${existing.orderNumber} fulfilled`,
          userId: req.user!.userId,
        },
      });
    }

    return tx.order.update({ where: { id }, data: { status: "FULFILLED" }, include: includeRefs });
  });

  res.json({ order });
}

// RESERVED -> release the reservation back to Available. FULFILLED ->
// restock physical (reversal), same shape as releasing a reservation, just
// against physicalQty instead of reservedQty.
export async function cancel(req: Request, res: Response) {
  const id = req.params.id as string;

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      throw new AppError(404, "Order not found");
    }
    if (existing.status === "CANCELLED") {
      throw new AppError(400, "Order is already cancelled");
    }

    const aggregated = new Map<string, { productId: string; locationId: string; batch: string; quantity: number }>();
    for (const item of existing.items) {
      const key = lineKey(item);
      const prev = aggregated.get(key);
      aggregated.set(key, { ...item, quantity: (prev?.quantity ?? 0) + item.quantity });
    }

    for (const key of [...aggregated.keys()].sort()) {
      const line = aggregated.get(key)!;
      const record = await lockInventoryRecord(tx, line);

      if (existing.status === "RESERVED") {
        await tx.inventoryRecord.update({
          where: { id: record.id },
          data: { reservedQty: { decrement: line.quantity } },
        });
      } else {
        await tx.inventoryRecord.update({
          where: { id: record.id },
          data: { physicalQty: { increment: line.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            locationId: line.locationId,
            batch: line.batch,
            quantity: line.quantity,
            type: "IN",
            reason: `Order ${existing.orderNumber} cancelled`,
            userId: req.user!.userId,
          },
        });
      }
    }

    return tx.order.update({ where: { id }, data: { status: "CANCELLED" }, include: includeRefs });
  });

  res.json({ order });
}

export async function list(req: Request, res: Response) {
  const parsed = listOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { page, pageSize, status, customerId } = parsed.data;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true, businessName: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const order = await prisma.order.findUnique({ where: { id }, include: includeRefs });
  if (!order) {
    throw new AppError(404, "Order not found");
  }

  res.json({ order });
}
