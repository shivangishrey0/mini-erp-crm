import { PrismaClient } from "@prisma/client";
import { TEST_DIRECT_URL, TEST_SCHEMA_NAME } from "./testDbConfig";

export default async function globalTeardown(): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url: TEST_DIRECT_URL } } });
  await client.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA_NAME}" CASCADE`);
  await client.$disconnect();
}
