import path from "path";
import dotenv from "dotenv";

// Jest doesn't auto-load .env like ts-node-dev does, and this file is
// imported both from the Jest worker process (via tests/env.ts) and from
// the separate globalSetup/globalTeardown process, so both load it
// explicitly and independently.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const TEST_SCHEMA_NAME = "test";

function withTestSchema(url: string | undefined, label: string): string {
  if (!url) {
    throw new Error(`${label} must be set in server/.env to run tests`);
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}schema=${TEST_SCHEMA_NAME}`;
}

// Tests run against an isolated `test` schema on the same Postgres instance
// as dev, not a separate throwaway container - keeps the test suite
// runnable without a Docker daemon, while still exercising a real Postgres
// (not a mocked Prisma client) for the row-locking/transaction behavior
// under test.
export const TEST_DATABASE_URL = withTestSchema(process.env.DATABASE_URL, "DATABASE_URL");
export const TEST_DIRECT_URL = withTestSchema(process.env.DIRECT_URL, "DIRECT_URL");
