import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { formatZodError } from "../lib/validation";

const listUsersQuerySchema = z.object({ role: z.nativeEnum(Role).optional() });

// Minimal - just enough for role-scoped assignee pickers (e.g. Work Order's
// "Assigned User"). No create/update here; users are seeded, not
// self-registered, per the brief's auth model.
export async function list(req: Request, res: Response) {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, formatZodError(parsed.error));
  }

  const users = await prisma.user.findMany({
    where: parsed.data.role ? { role: parsed.data.role } : undefined,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  res.json({ data: users });
}
