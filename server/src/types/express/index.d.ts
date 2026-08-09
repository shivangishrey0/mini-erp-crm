import { JwtPayload } from "../../lib/jwt";

// Declaration merging: extends Express's own Request type so `req.user`
// is known and type-checked everywhere, instead of using `req as any`.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
