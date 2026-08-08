import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across the app (and across ts-node-dev restarts
// in development) instead of opening a new connection pool per import.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
