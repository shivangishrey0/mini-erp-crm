import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";
import { createLocationSchema } from "../schemas/location.schema";

export async function list(req: Request, res: Response) {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  res.json({ data: locations });
}

export async function create(req: Request, res: Response) {
  const parsed = createLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const location = await prisma.location.create({ data: parsed.data });
  res.status(201).json({ location });
}
