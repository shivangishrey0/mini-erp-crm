import { Request, Response } from "express";
import { Prisma, WorkOrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
  listWorkOrdersQuerySchema,
} from "../schemas/workOrder.schema";
import { lockInventoryRecord, availableQty } from "../lib/inventoryLock";

type TxClient = Prisma.TransactionClient;

async function generateWorkOrderNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.workOrder.count({ where: { workOrderNumber: { startsWith: `WO-${year}-` } } });
  return `WO-${year}-${String(count + 1).padStart(4, "0")}`;
}

// Sum of Available (physical - reserved) for this product across every
// batch at the work order's location - the brief's shortage example
// compares required quantity against "available at location", not a
// single batch.
async function availableAtLocation(productId: string, locationId: string): Promise<number> {
  const records = await prisma.inventoryRecord.findMany({ where: { productId, locationId } });
  return records.reduce((sum, r) => sum + availableQty(r), 0);
}

function withShortage<T extends { requiredQty: number }>(workOrder: T, available: number) {
  return { ...workOrder, availableAtLocation: available, shortage: Math.max(0, workOrder.requiredQty - available) };
}

const includeRefs = {
  location: { select: { id: true, name: true, code: true } },
  product: { select: { id: true, name: true, sku: true } },
  assignedUser: { select: { id: true, name: true, email: true } },
} as const;

export async function create(req: Request, res: Response) {
  const parsed = createWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { locationId, productId, requiredQty, assignedUserId } = parsed.data;

  const [location, product, assignedUser] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId } }),
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.user.findUnique({ where: { id: assignedUserId } }),
  ]);
  if (!location) throw new AppError(404, "Location not found");
  if (!product) throw new AppError(404, "Product not found");
  if (!assignedUser) throw new AppError(404, "Assigned user not found");

  const workOrder = await prisma.$transaction(async (tx) => {
    const workOrderNumber = await generateWorkOrderNumber(tx);
    return tx.workOrder.create({
      data: { workOrderNumber, locationId, productId, requiredQty, assignedUserId },
      include: includeRefs,
    });
  });

  const available = await availableAtLocation(productId, locationId);
  res.status(201).json({ workOrder: withShortage(workOrder, available) });
}

export async function list(req: Request, res: Response) {
  const parsed = listWorkOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { page, pageSize, status, locationId } = parsed.data;

  const where: Prisma.WorkOrderWhereInput = {
    ...(status ? { status } : {}),
    ...(locationId ? { locationId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.workOrder.findMany({
      where,
      include: includeRefs,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.workOrder.count({ where }),
  ]);

  const withShortages = await Promise.all(
    data.map(async (wo) => withShortage(wo, await availableAtLocation(wo.productId, wo.locationId)))
  );

  res.json({ data: withShortages, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const workOrder = await prisma.workOrder.findUnique({ where: { id }, include: includeRefs });
  if (!workOrder) {
    throw new AppError(404, "Work order not found");
  }

  const available = await availableAtLocation(workOrder.productId, workOrder.locationId);
  res.json({ workOrder: withShortage(workOrder, available) });
}

const NEXT_STATUS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: null,
};

// Advances exactly one step at a time (ASSIGNED -> IN_PROGRESS ->
// COMPLETED). Completing a work order consumes its required quantity from
// physical stock at that location - if the shortage hasn't been resolved
// (e.g. via an Internal Transfer) yet, this fails rather than allowing
// stock to go negative.
export async function updateStatus(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = updateWorkOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { status: requestedStatus } = parsed.data;

  const workOrder = await prisma.$transaction(async (tx) => {
    const existing = await tx.workOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Work order not found");
    }

    const allowedNext = NEXT_STATUS[existing.status];
    if (existing.status === "COMPLETED") {
      throw new AppError(400, "Work order is already completed");
    }
    if (requestedStatus !== allowedNext) {
      throw new AppError(400, `Work order must move from ${existing.status} to ${allowedNext}, not ${requestedStatus}`);
    }

    if (requestedStatus === "COMPLETED") {
      // Consume required quantity across whatever batches exist at this
      // location, in a fixed order (by batch name) so two concurrent
      // completions touching overlapping batches always lock them in the
      // same order and can't deadlock each other. Each batch is locked
      // individually before reading its quantity.
      const batches = await tx.inventoryRecord.findMany({
        where: { productId: existing.productId, locationId: existing.locationId },
        orderBy: { batch: "asc" },
        select: { batch: true },
      });

      let remaining = existing.requiredQty;
      const consumptions: { batch: string; qty: number }[] = [];

      for (const { batch } of batches) {
        if (remaining <= 0) break;
        const record = await lockInventoryRecord(tx, {
          productId: existing.productId,
          locationId: existing.locationId,
          batch,
        });
        const consumable = Math.min(remaining, availableQty(record));
        if (consumable <= 0) continue;

        await tx.inventoryRecord.update({
          where: { id: record.id },
          data: { physicalQty: { decrement: consumable } },
        });
        consumptions.push({ batch, qty: consumable });
        remaining -= consumable;
      }

      if (remaining > 0) {
        throw new AppError(
          400,
          `Cannot complete: shortage of ${remaining} still unresolved for this work order. Transfer stock in first.`
        );
      }

      for (const { batch, qty } of consumptions) {
        await tx.stockMovement.create({
          data: {
            productId: existing.productId,
            locationId: existing.locationId,
            batch,
            quantity: qty,
            type: "OUT",
            reason: `Work order ${existing.workOrderNumber} completed`,
            userId: req.user!.userId,
          },
        });
      }
    }

    return tx.workOrder.update({ where: { id }, data: { status: requestedStatus }, include: includeRefs });
  });

  const available = await availableAtLocation(workOrder.productId, workOrder.locationId);
  res.json({ workOrder: withShortage(workOrder, available) });
}
