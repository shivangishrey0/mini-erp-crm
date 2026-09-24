import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { TEST_DATABASE_URL, TEST_DIRECT_URL, TEST_SCHEMA_NAME } from "./testDbConfig";

export default async function globalSetup(): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url: TEST_DIRECT_URL } } });
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA_NAME}" CASCADE`);
  await client.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA_NAME}"`);
  await client.$disconnect();

  // `db push` (not `migrate deploy`) - syncs the schema directly into the
  // fresh `test` schema without replaying migration history. One of the
  // historical migration files hardcodes a `"public".` schema qualifier
  // (Prisma's own AlterEnum codegen), which only happens to work against
  // the real `public` schema; db push regenerates the SQL fresh so that
  // never matters here, and test schema setup doesn't need migration
  // history/checksums at all.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DIRECT_URL },
  });
}
