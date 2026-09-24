import { Request, Response } from "express";
import { Prisma, InventoryRecord } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { listInventoryQuerySchema, adjustInventorySchema, paginationQuerySchema } from "../schemas/inventory.schema";
import { lockInventoryRecord, availableQty } from "../lib/inventoryLock";

type RecordWithRefs = InventoryRecord & {
  product: { id: string; name: string; sku: string; category: string; minStockAlert: number };
  location: { id: string; name: string; code: string };
};

function withComputed(record: RecordWithRefs) {
  return {
    ...record,
    availableQty: availableQty(record),
    isLowStock: record.physicalQty < record.product.minStockAlert,
  };
}

// This endpoint is the brief's "Inventory" screen: one row per
// Item x Location x Batch, with Physical/Reserved/Available.
export async function list(req: Request, res: Response) {
  const parsed = listInventoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { page, pageSize, search, category, locationId, lowStock } = parsed.data;

  const where: Prisma.InventoryRecordWhereInput = {
    ...(locationId ? { locationId } : {}),
    ...(category || search
      ? {
          product: {
            ...(category ? { category } : {}),
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { sku: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
        }
      : {}),
  };

  const include = {
    product: { select: { id: true, name: true, sku: true, category: true, minStockAlert: true } },
    location: { select: { id: true, name: true, code: true } },
  } as const;

  if (lowStock) {
    // Same reasoning as the old Product.currentStock filter: Prisma can't
    // compare two columns of the same row without raw SQL, so this filter
    // runs in application code.
    const all = await prisma.inventoryRecord.findMany({ where, include, orderBy: { updatedAt: "desc" } });
    const filtered = all.filter((r) => r.physicalQty < r.product.minStockAlert);
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    res.json({
      data: data.map(withComputed),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
    return;
  }

  const [data, total] = await prisma.$transaction([
    prisma.inventoryRecord.findMany({
      where,
      include,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inventoryRecord.count({ where }),
  ]);

  res.json({
    data: data.map(withComputed),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const record = await prisma.inventoryRecord.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true, sku: true, category: true, minStockAlert: true } },
      location: { select: { id: true, name: true, code: true } },
    },
  });
  if (!record) {
    throw new AppError(404, "Inventory record not found");
  }

  res.json({ inventoryRecord: withComputed(record) });
}

// Manual IN/OUT adjustment against a specific product+location+batch.
// Replaces the old single-number Product.currentStock adjustment.
export async function adjust(req: Request, res: Response) {
  const parsed = adjustInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { productId, locationId, batch, quantity, type, reason } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    throw new AppError(404, "Location not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const record = await lockInventoryRecord(tx, { productId, locationId, batch });

    if (type === "OUT" && quantity > record.physicalQty) {
      throw new AppError(
        400,
        `Insufficient stock for ${product.name} at ${location.name} (batch ${batch}): available ${record.physicalQty}, requested ${quantity}`
      );
    }

    const delta = type === "IN" ? quantity : -quantity;

    const updated = await tx.inventoryRecord.update({
      where: { id: record.id },
      data: { physicalQty: { increment: delta } },
      include: {
        product: { select: { id: true, name: true, sku: true, category: true, minStockAlert: true } },
        location: { select: { id: true, name: true, code: true } },
      },
    });

    const movement = await tx.stockMovement.create({
      data: { productId, locationId, batch, quantity, type, reason, userId: req.user!.userId },
    });

    return { updated, movement };
  });

  res.status(201).json({ inventoryRecord: withComputed(result.updated), movement: result.movement });
}

export async function listMovements(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const record = await prisma.inventoryRecord.findUnique({ where: { id } });
  if (!record) {
    throw new AppError(404, "Inventory record not found");
  }

  const { page, pageSize } = parsed.data;
  const where = { productId: record.productId, locationId: record.locationId, batch: record.batch };

  const [data, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
