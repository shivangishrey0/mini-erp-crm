import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { AppError } from "./errorHandler";

// Answers "is this person allowed to do this?" - must run after
// authMiddleware, which is what populates req.user.
export function roleGuard(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
}
