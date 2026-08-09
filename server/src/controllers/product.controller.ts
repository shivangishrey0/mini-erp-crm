import { Request, Response } from "express";
import { Prisma, Product } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import {
  createProductSchema,
  updateProductSchema,
  stockMovementSchema,
  listProductsQuerySchema,
  paginationQuerySchema,
} from "../schemas/product.schema";

function withLowStockFlag(product: Product) {
  return { ...product, isLowStock: product.currentStock < product.minStockAlert };
}

export async function list(req: Request, res: Response) {
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const { page, pageSize, search, category, lowStock } = parsed.data;

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (lowStock) {
    // Prisma can't compare two columns of the same row in a `where` clause
    // without raw SQL, so for this filter we fetch matches and paginate in
    // memory - fine at this project's scale, would move to raw SQL at
    // larger scale (documented as a known limitation).
    const all = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
    const filtered = all.filter((p) => p.currentStock < p.minStockAlert);
    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    res.json({
      data: data.map(withLowStockFlag),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
    return;
  }

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    data: data.map(withLowStockFlag),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  res.json({ product: withLowStockFlag(product) });
}

export async function create(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json({ product: withLowStockFlag(product) });
}

export async function update(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Product not found");
  }

  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  res.json({ product: withLowStockFlag(product) });
}

export async function adjustStock(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = stockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }
  const { quantity, type, reason } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  if (type === "OUT" && quantity > product.currentStock) {
    throw new AppError(
      400,
      `Insufficient stock for ${product.name}: available ${product.currentStock}, requested ${quantity}`
    );
  }

  const delta = type === "IN" ? quantity : -quantity;

  const [updatedProduct, movement] = await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { currentStock: { increment: delta } } }),
    prisma.stockMovement.create({ data: { productId: id, quantity, type, reason, userId: req.user!.userId } }),
  ]);

  res.status(201).json({ product: withLowStockFlag(updatedProduct), movement });
}

export async function listMovements(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  const { page, pageSize } = parsed.data;
  const where = { productId: id };

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
