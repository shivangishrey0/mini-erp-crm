import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  paginationQuerySchema,
  followUpNoteSchema,
} from "../schemas/customer.schema";

function formatZodError(error: { issues: { message: string }[] }): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function list(req: Request, res: Response) {
  const parsed = listCustomersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const { page, pageSize, search, type, status } = parsed.data;

  const where: Prisma.CustomerWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { businessName: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export async function getById(req: Request, res: Response) {
  const id = req.params.id as string;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  res.json({ customer });
}

export async function create(req: Request, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json({ customer });
}

export async function update(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "Customer not found");
  }

  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  res.json({ customer });
}

export async function addFollowUpNote(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = followUpNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  const followUp = await prisma.followUpNote.create({
    data: { note: parsed.data.note, customerId: id, userId: req.user!.userId },
  });

  res.status(201).json({ followUp });
}

export async function listFollowUpNotes(req: Request, res: Response) {
  const id = req.params.id as string;

  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  const { page, pageSize } = parsed.data;
  const where = { customerId: id };

  const [data, total] = await prisma.$transaction([
    prisma.followUpNote.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.followUpNote.count({ where }),
  ]);

  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
