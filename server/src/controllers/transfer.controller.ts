import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { createTransferSchema, listTransfersQuerySchema } from "../schemas/transfer.schema";
import { lockInventoryRecord } from "../lib/inventoryLock";

type TxClient = Prisma.TransactionClient;

async function generateTransferNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.transfer.count({ where: { transferNumber: { startsWith: `TR-${year}-` } } });
  return `TR-${year}-${String(count + 1).padStart(4, "0")}`;
}

const includeRefs = {
  sourceLocation: { select: { id: true, name: true, code: true } },
  destinationLocation: { select: { id: true, name: true, code: true } },
  product: { select: { id: true, name: true, sku: true } },
  requestedBy: { select: { id: true, name: true, email: true } },
} as const;

export async function create(req: Request, res: Response) {
  const parsed = createTransferSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { sourceLocationId, destinationLocationId, productId, batch, quantity } = parsed.data;

  const [source, destination, product] = await Promise.all([
    prisma.location.findUnique({ where: { id: sourceLocationId } }),
    prisma.location.findUnique({ where: { id: destinationLocationId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!source) throw new AppError(404, "Source location not found");
  if (!destination) throw new AppError(404, "Destination location not found");
  if (!product) throw new AppError(404, "Product not found");

  // Requesting doesn't move stock - it's just a record that a transfer is
  // wanted. No lock needed here.
  const transfer = await prisma.$transaction(async (tx) => {
    const transferNumber = await generateTransferNumber(tx);
    return tx.transfer.create({
      data: {
        transferNumber,
        sourceLocationId,
        destinationLocationId,
        productId,
        batch,
        quantity,
        requestedById: req.user!.userId,
      },
      include: includeRefs,
    });
  });

  res.status(201).json({ transfer });
}

export async function list(req: Request, res: Response) {
  const parsed = listTransfersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { page, pageSize, status } = parsed.data;

  const where: Prisma.TransferWhereInput = { ...(status ? { status } : {}) };

  const [data, total] = await prisma.$transaction([
    prisma.transfer.findMany({
      where,
      include: includeRefs,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.transfer.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const transfer = await prisma.transfer.findUnique({ where: { id }, include: includeRefs });
  if (!transfer) {
    throw new AppError(404, "Transfer not found");
  }

  res.json({ transfer });
}

// Source inventory reduces immediately on dispatch. Destination is
// untouched until receive.
export async function dispatch(req: Request, res: Response) {
  const id = req.params.id as string;

  const transfer = await prisma.$transaction(async (tx) => {
    const existing = await tx.transfer.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Transfer not found");
    }
    if (existing.status !== "REQUESTED") {
      throw new AppError(400, `Transfer must be REQUESTED to dispatch, currently ${existing.status}`);
    }

    const sourceRecord = await lockInventoryRecord(tx, {
      productId: existing.productId,
      locationId: existing.sourceLocationId,
      batch: existing.batch,
    });

    if (existing.quantity > sourceRecord.physicalQty) {
      throw new AppError(
        400,
        `Insufficient stock to dispatch: available ${sourceRecord.physicalQty}, requested ${existing.quantity}`
      );
    }

    await tx.inventoryRecord.update({
      where: { id: sourceRecord.id },
      data: { physicalQty: { decrement: existing.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: existing.productId,
        locationId: existing.sourceLocationId,
        batch: existing.batch,
        quantity: existing.quantity,
        type: "OUT",
        reason: `Transfer ${existing.transferNumber} dispatched`,
        userId: req.user!.userId,
      },
    });

    return tx.transfer.update({
      where: { id },
      data: { status: "DISPATCHED", dispatchedAt: new Date() },
      include: includeRefs,
    });
  });

  res.json({ transfer });
}

// Locks the Transfer row itself first and checks status === DISPATCHED
// before doing anything else - this is what prevents the same transfer
// from being received twice under concurrent requests, not just a
// pre-check that a race could slip past.
export async function receive(req: Request, res: Response) {
  const id = req.params.id as string;

  const transfer = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM "Transfer" WHERE id = ${id} FOR UPDATE
    `;
    const locked = rows[0];
    if (!locked) {
      throw new AppError(404, "Transfer not found");
    }
    if (locked.status !== "DISPATCHED") {
      throw new AppError(400, `Transfer must be DISPATCHED to receive, currently ${locked.status}`);
    }

    const existing = await tx.transfer.findUniqueOrThrow({ where: { id } });

    await lockInventoryRecord(tx, {
      productId: existing.productId,
      locationId: existing.destinationLocationId,
      batch: existing.batch,
    });

    await tx.inventoryRecord.update({
      where: {
        productId_locationId_batch: {
          productId: existing.productId,
          locationId: existing.destinationLocationId,
          batch: existing.batch,
        },
      },
      data: { physicalQty: { increment: existing.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: existing.productId,
        locationId: existing.destinationLocationId,
        batch: existing.batch,
        quantity: existing.quantity,
        type: "IN",
        reason: `Transfer ${existing.transferNumber} received`,
        userId: req.user!.userId,
      },
    });

    return tx.transfer.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: includeRefs,
    });
  });

  res.json({ transfer });
}
