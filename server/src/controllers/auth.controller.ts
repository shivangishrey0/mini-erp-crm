import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";
import { loginSchema } from "../schemas/auth.schema";

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "email and password are required");
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same error/status for "no such user" and "wrong password" so a caller
  // can't use the response to enumerate which registered emails exist.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  res.json({ user });
}
