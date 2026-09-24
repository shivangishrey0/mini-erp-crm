import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "../schemas/product.schema";

// Catalog only - stock quantities live on InventoryRecord (per
// product+location+batch), see inventory.controller.ts.
export async function list(req: Request, res: Response) {
  const parsed = listProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const { page, pageSize, search, category } = parsed.data;

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

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError(404, "Product not found");
  }

  res.json({ product });
}

export async function create(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json({ product });
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
  res.json({ product });
}
