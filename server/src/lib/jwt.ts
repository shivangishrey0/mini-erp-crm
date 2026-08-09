import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// Kept minimal on purpose: just enough to identify the user and authorize
// them, so the token stays small and never goes stale if name/email change.
export interface JwtPayload {
  userId: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = "8h";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
