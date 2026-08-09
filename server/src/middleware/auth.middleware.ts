import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { AppError } from "./errorHandler";

// Answers "who is this?" - verifies the JWT and attaches the decoded
// payload to req.user. Does NOT check what they're allowed to do; that's
// roleGuard's job, kept separate so routes can compose the two freely.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }

  next();
}
