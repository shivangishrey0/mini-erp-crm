import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import request from "supertest";
import { prisma } from "../src/lib/prisma";
import { createApp } from "../src/app";
import { Role } from "@prisma/client";

export const app = createApp();

const PASSWORD = "Password123!";

export async function createUserAndLogin(role: Role) {
  const email = `${role.toLowerCase()}-${randomUUID()}@example.com`;
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: { name: `${role} Test User`, email, password: passwordHash, role },
  });

  const res = await request(app).post("/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Login failed for seeded test user: ${JSON.stringify(res.body)}`);
  }

  return { user, token: res.body.token as string };
}

export async function createLocation(namePrefix = "Loc") {
  return prisma.location.create({
    data: { name: `${namePrefix} ${randomUUID()}`, code: randomUUID().slice(0, 8) },
  });
}

export async function createProduct(overrides: Partial<{ name: string; category: string; unitPrice: string; minStockAlert: number }> = {}) {
  return prisma.product.create({
    data: {
      name: overrides.name ?? "Test Product",
      sku: `SKU-${randomUUID()}`,
      category: overrides.category ?? "Test",
      unitPrice: overrides.unitPrice ?? "10.00",
      minStockAlert: overrides.minStockAlert ?? 0,
    },
  });
}

export async function createInventoryRecord(params: {
  productId: string;
  locationId: string;
  batch?: string;
  physicalQty: number;
  reservedQty?: number;
}) {
  return prisma.inventoryRecord.create({
    data: {
      productId: params.productId,
      locationId: params.locationId,
      batch: params.batch ?? "DEFAULT",
      physicalQty: params.physicalQty,
      reservedQty: params.reservedQty ?? 0,
    },
  });
}

export async function createCustomer() {
  return prisma.customer.create({
    data: {
      name: "Test Customer",
      mobile: "9999999999",
      businessName: "Test Business",
      type: "RETAIL",
      address: "Test Address",
    },
  });
}
