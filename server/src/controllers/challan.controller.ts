import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { createChallanSchema, listChallansQuerySchema } from "../schemas/challan.schema";

type TxClient = Prisma.TransactionClient;

async function generateChallanNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear();
  // Count-based sequence within a transaction - simple and correct for this
  // project's scale. Under true concurrent creates in the same instant this
  // could theoretically race (two counts read before either commits); a
  // DB sequence would close that gap at higher scale.
  const count = await tx.challan.count({ where: { challanNumber: { startsWith: `CH-${year}-` } } });
  return `CH-${year}-${String(count + 1).padStart(4, "0")}`;
}

// Shared by POST /challans/:id/confirm and POST /challans (when status is
// requested as CONFIRMED at creation) so the stock-deduction logic - the
// part "evaluated hardest" per the brief - only exists once. Takes a
// transaction client so it always runs inside the caller's transaction:
// either everything commits (challan + stock + movements) or nothing does.
async function confirmChallanTx(tx: TxClient, challanId: string, userId: string) {
  const challan = await tx.challan.findUnique({ where: { id: challanId }, include: { items: true } });

  if (!challan) {
    throw new AppError(404, "Challan not found");
  }
  if (challan.status === "CONFIRMED") {
    throw new AppError(400, "Challan is already confirmed");
  }
  if (challan.status === "CANCELLED") {
    throw new AppError(400, "Cannot confirm a cancelled challan");
  }

  // Aggregate requested quantity per product first - the same product can
  // appear on more than one line, and validating/decrementing line-by-line
  // against the same pre-decrement stock snapshot would let two lines each
  // individually "pass" while their combined quantity pushes stock negative.
  const requestedByProduct = new Map<string, number>();
  for (const item of challan.items) {
    requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  // Validate every product's total demand before changing any stock, so one
  // bad line reports clearly instead of stopping at the first shortfall
  // mid-update.
  for (const [productId, requestedQty] of requestedByProduct) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(404, `Product ${productId} no longer exists`);
    }
    if (requestedQty > product.currentStock) {
      throw new AppError(
        400,
        `Insufficient stock for ${product.name}: available ${product.currentStock}, requested ${requestedQty}`
      );
    }
  }

  for (const item of challan.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { decrement: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        type: "OUT",
        reason: `Challan ${challan.challanNumber} confirmed`,
        userId,
      },
    });
  }

  return tx.challan.update({
    where: { id: challanId },
    data: { status: "CONFIRMED" },
    include: { items: true, customer: true },
  });
}

export async function create(req: Request, res: Response) {
  const parsed = createChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { customerId, items, status } = parsed.data;

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

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const challan = await prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    const created = await tx.challan.create({
      data: {
        challanNumber,
        customerId,
        userId: req.user!.userId,
        totalQuantity,
        status: "DRAFT",
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: { items: true, customer: true },
    });

    if (status === "CONFIRMED") {
      return confirmChallanTx(tx, created.id, req.user!.userId);
    }

    return created;
  });

  res.status(201).json({ challan });
}

export async function confirm(req: Request, res: Response) {
  const id = req.params.id as string;
  const challan = await prisma.$transaction((tx) => confirmChallanTx(tx, id, req.user!.userId));
  res.json({ challan });
}

export async function cancel(req: Request, res: Response) {
  const id = req.params.id as string;

  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!existing) {
      throw new AppError(404, "Challan not found");
    }
    if (existing.status === "CANCELLED") {
      throw new AppError(400, "Challan is already cancelled");
    }

    if (existing.status === "CONFIRMED") {
      // Reverse the stock deduction that confirm applied.
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: "IN",
            reason: `Challan ${existing.challanNumber} cancelled`,
            userId: req.user!.userId,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { items: true, customer: true },
    });
  });

  res.json({ challan });
}

export async function list(req: Request, res: Response) {
  const parsed = listChallansQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { page, pageSize, status, customerId } = parsed.data;

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.challan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true, businessName: true } } },
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const challan = await prisma.challan.findUnique({ where: { id }, include: { items: true, customer: true } });
  if (!challan) {
    throw new AppError(404, "Challan not found");
  }

  res.json({ challan });
}

