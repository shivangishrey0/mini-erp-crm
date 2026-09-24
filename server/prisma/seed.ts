import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Single shared password for all seeded accounts - fine for a dev/test-only
// case study, never do this in a real production seed.
const SEED_PASSWORD = "Password123!";

const users: { name: string; email: string; role: Role }[] = [
  { name: "Admin User", email: "admin@example.com", role: "ADMIN" },
  { name: "Operations User", email: "operations@example.com", role: "OPERATIONS" },
  { name: "Sales User", email: "sales@example.com", role: "SALES" },
];

const locations = [
  { name: "Main Warehouse", code: "MAIN" },
  { name: "Branch Store", code: "BRANCH" },
];

const products = [
  { name: "Steel Bolt 8mm", sku: "SKU-BOLT-8MM", category: "Hardware", unitPrice: "5.50", minStockAlert: 50 },
  { name: "Hydraulic Hose 2m", sku: "SKU-HOSE-2M", category: "Components", unitPrice: "340.00", minStockAlert: 10 },
  { name: "Industrial Bearing", sku: "SKU-BEARING-01", category: "Components", unitPrice: "120.00", minStockAlert: 20 },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role },
      create: { ...user, password: passwordHash },
    });
  }

  for (const location of locations) {
    await prisma.location.upsert({ where: { code: location.code }, update: {}, create: location });
  }

  const main_ = await prisma.location.findUniqueOrThrow({ where: { code: "MAIN" } });
  const branch = await prisma.location.findUniqueOrThrow({ where: { code: "BRANCH" } });

  for (const product of products) {
    await prisma.product.upsert({ where: { sku: product.sku }, update: {}, create: product });
  }

  const dbProducts = await prisma.product.findMany({ where: { sku: { in: products.map((p) => p.sku) } } });

  // Seed inventory so Work Orders/Transfers/Orders have something real to
  // demo: Main Warehouse is well-stocked, Branch Store deliberately has a
  // shortage on the bolts so the shortage/transfer flow is demonstrable.
  const inventorySeeds = [
    { sku: "SKU-BOLT-8MM", locationCode: "MAIN", batch: "DEFAULT", physicalQty: 500 },
    { sku: "SKU-BOLT-8MM", locationCode: "BRANCH", batch: "DEFAULT", physicalQty: 20 },
    { sku: "SKU-HOSE-2M", locationCode: "MAIN", batch: "DEFAULT", physicalQty: 40 },
    { sku: "SKU-HOSE-2M", locationCode: "BRANCH", batch: "DEFAULT", physicalQty: 5 },
    { sku: "SKU-BEARING-01", locationCode: "MAIN", batch: "DEFAULT", physicalQty: 100 },
  ];

  for (const seed of inventorySeeds) {
    const product = dbProducts.find((p) => p.sku === seed.sku)!;
    const location = seed.locationCode === "MAIN" ? main_ : branch;
    await prisma.inventoryRecord.upsert({
      where: { productId_locationId_batch: { productId: product.id, locationId: location.id, batch: seed.batch } },
      update: {},
      create: { productId: product.id, locationId: location.id, batch: seed.batch, physicalQty: seed.physicalQty },
    });
  }

  await prisma.customer.upsert({
    where: { id: "seed-customer-demo" },
    update: {},
    create: {
      id: "seed-customer-demo",
      name: "Rahul Sharma",
      mobile: "9876543210",
      businessName: "Sharma Traders",
      type: "WHOLESALE",
      address: "MG Road, Pune",
      status: "ACTIVE",
    },
  });

  console.log(`Seeded ${users.length} users, ${locations.length} locations, ${products.length} products.`);
  console.log(`Password for all users: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
