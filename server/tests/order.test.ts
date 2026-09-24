import request from "supertest";
import { app, createUserAndLogin, createLocation, createProduct, createInventoryRecord, createCustomer } from "./helpers";
import { prisma } from "../src/lib/prisma";

describe("Orders / stock reservation", () => {
  // Mandatory Test 1: cannot reserve more than available inventory.
  it("rejects an order that requests more than the available quantity", async () => {
    const { token } = await createUserAndLogin("SALES");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 100 });
    const customer = await createCustomer();

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        items: [{ productId: product.id, locationId: location.id, quantity: 150 }],
      });

    expect(res.status).toBe(400);
  });

  it("reserves stock on create and reduces Available, without touching Physical", async () => {
    const { token } = await createUserAndLogin("SALES");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 100 });
    const customer = await createCustomer();

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        items: [{ productId: product.id, locationId: location.id, quantity: 60 }],
      });

    expect(res.status).toBe(201);

    const record = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: location.id },
    });
    expect(record.physicalQty).toBe(100);
    expect(record.reservedQty).toBe(60);
  });

  // Bonus: proves the row lock actually serializes concurrent reservations
  // instead of both racing past a stale read - "two users must not reserve
  // more stock than actually exists."
  it("only allows one of two concurrent over-committing reservations to succeed", async () => {
    const { token: tokenA } = await createUserAndLogin("SALES");
    const { token: tokenB } = await createUserAndLogin("SALES");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 100 });
    const customer = await createCustomer();

    const [resA, resB] = await Promise.all([
      request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ customerId: customer.id, items: [{ productId: product.id, locationId: location.id, quantity: 80 }] }),
      request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ customerId: customer.id, items: [{ productId: product.id, locationId: location.id, quantity: 50 }] }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const record = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: location.id },
    });
    expect(record.reservedQty).toBeLessThanOrEqual(100);
  });

  it("cancelling a RESERVED order releases the reservation", async () => {
    const { token } = await createUserAndLogin("SALES");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 100 });
    const customer = await createCustomer();

    const created = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ customerId: customer.id, items: [{ productId: product.id, locationId: location.id, quantity: 40 }] });
    expect(created.status).toBe(201);

    const cancelled = await request(app)
      .post(`/orders/${created.body.order.id}/cancel`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancelled.status).toBe(200);

    const record = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: location.id },
    });
    expect(record.reservedQty).toBe(0);
    expect(record.physicalQty).toBe(100);
  });
});
