import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Single shared password for all seeded accounts - fine for a dev/test-only
// case study, never do this in a real production seed.
const SEED_PASSWORD = "Password123!";

const users: { name: string; email: string; role: Role }[] = [
  { name: "Admin User", email: "admin@example.com", role: "ADMIN" },
  { name: "Sales User", email: "sales@example.com", role: "SALES" },
  { name: "Warehouse User", email: "warehouse@example.com", role: "WAREHOUSE" },
  { name: "Accounts User", email: "accounts@example.com", role: "ACCOUNTS" },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: passwordHash },
    });
  }

  console.log(`Seeded ${users.length} users. Password for all: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
