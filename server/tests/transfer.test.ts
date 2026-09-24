import request from "supertest";
import { app, createUserAndLogin, createLocation, createProduct, createInventoryRecord } from "./helpers";
import { prisma } from "../src/lib/prisma";

async function createTransfer(token: string, params: { sourceLocationId: string; destinationLocationId: string; productId: string; quantity: number }) {
  return request(app).post("/transfers").set("Authorization", `Bearer ${token}`).send(params);
}

describe("Internal transfers", () => {
  // Mandatory Test 2: cannot transfer more than available inventory.
  it("rejects dispatch when quantity exceeds available stock at source", async () => {
    const { token } = await createUserAndLogin("OPERATIONS");
    const source = await createLocation("Source");
    const destination = await createLocation("Destination");
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: source.id, physicalQty: 20 });

    const created = await createTransfer(token, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      productId: product.id,
      quantity: 50,
    });
    expect(created.status).toBe(201);

    const dispatched = await request(app)
      .post(`/transfers/${created.body.transfer.id}/dispatch`)
      .set("Authorization", `Bearer ${token}`);
    expect(dispatched.status).toBe(400);
  });

  // Mandatory Test 3: destination stock increases only after receipt.
  it("only increases destination stock after receive, not on dispatch", async () => {
    const { token } = await createUserAndLogin("OPERATIONS");
    const source = await createLocation("Source");
    const destination = await createLocation("Destination");
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: source.id, physicalQty: 100 });

    const created = await createTransfer(token, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      productId: product.id,
      quantity: 40,
    });

    const dispatched = await request(app)
      .post(`/transfers/${created.body.transfer.id}/dispatch`)
      .set("Authorization", `Bearer ${token}`);
    expect(dispatched.status).toBe(200);

    const sourceRecord = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: source.id },
    });
    expect(sourceRecord.physicalQty).toBe(60);

    const destBeforeReceive = await prisma.inventoryRecord.findFirst({
      where: { productId: product.id, locationId: destination.id },
    });
    expect(destBeforeReceive?.physicalQty ?? 0).toBe(0);

    const received = await request(app)
      .post(`/transfers/${created.body.transfer.id}/receive`)
      .set("Authorization", `Bearer ${token}`);
    expect(received.status).toBe(200);

    const destAfterReceive = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: destination.id },
    });
    expect(destAfterReceive.physicalQty).toBe(40);
  });

  // Mandatory Test 4: same transfer cannot be received twice.
  it("rejects receiving the same transfer a second time", async () => {
    const { token } = await createUserAndLogin("OPERATIONS");
    const source = await createLocation("Source");
    const destination = await createLocation("Destination");
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: source.id, physicalQty: 100 });

    const created = await createTransfer(token, {
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      productId: product.id,
      quantity: 10,
    });
    await request(app).post(`/transfers/${created.body.transfer.id}/dispatch`).set("Authorization", `Bearer ${token}`);

    const firstReceive = await request(app)
      .post(`/transfers/${created.body.transfer.id}/receive`)
      .set("Authorization", `Bearer ${token}`);
    expect(firstReceive.status).toBe(200);

    const secondReceive = await request(app)
      .post(`/transfers/${created.body.transfer.id}/receive`)
      .set("Authorization", `Bearer ${token}`);
    expect(secondReceive.status).toBe(400);

    const destRecord = await prisma.inventoryRecord.findFirstOrThrow({
      where: { productId: product.id, locationId: destination.id },
    });
    expect(destRecord.physicalQty).toBe(10);
  });
});
