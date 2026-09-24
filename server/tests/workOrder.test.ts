import request from "supertest";
import { app, createUserAndLogin, createLocation, createProduct, createInventoryRecord } from "./helpers";

describe("Work orders", () => {
  it("computes shortage automatically when required exceeds available at location", async () => {
    const { token: adminToken } = await createUserAndLogin("ADMIN");
    const { user: opsUser } = await createUserAndLogin("OPERATIONS");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 60 });

    const res = await request(app)
      .post("/work-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ locationId: location.id, productId: product.id, requiredQty: 100, assignedUserId: opsUser.id });

    expect(res.status).toBe(201);
    expect(res.body.workOrder.shortage).toBe(40);
  });

  it("blocks completion while a shortage is unresolved, and only allows one status step at a time", async () => {
    const { token: adminToken } = await createUserAndLogin("ADMIN");
    const { user: opsUser, token: opsToken } = await createUserAndLogin("OPERATIONS");
    const location = await createLocation();
    const product = await createProduct();
    await createInventoryRecord({ productId: product.id, locationId: location.id, physicalQty: 10 });

    const created = await request(app)
      .post("/work-orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ locationId: location.id, productId: product.id, requiredQty: 100, assignedUserId: opsUser.id });
    const id = created.body.workOrder.id;

    // Can't skip straight to COMPLETED from ASSIGNED.
    const skipAttempt = await request(app)
      .patch(`/work-orders/${id}/status`)
      .set("Authorization", `Bearer ${opsToken}`)
      .send({ status: "COMPLETED" });
    expect(skipAttempt.status).toBe(400);

    const toInProgress = await request(app)
      .patch(`/work-orders/${id}/status`)
      .set("Authorization", `Bearer ${opsToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(toInProgress.status).toBe(200);

    const toCompleted = await request(app)
      .patch(`/work-orders/${id}/status`)
      .set("Authorization", `Bearer ${opsToken}`)
      .send({ status: "COMPLETED" });
    expect(toCompleted.status).toBe(400);
  });
});
