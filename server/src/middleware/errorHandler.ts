import { NextFunction, Request, Response } from "express";

// Thrown deliberately by route/service code for expected failure cases
// (validation, not found, business rule violations) with a specific HTTP
// status attached, as opposed to an unexpected bug/exception.
export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognizes this as the error handler specifically because it has
// 4 parameters - must keep this exact signature even though `next` is unused.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
