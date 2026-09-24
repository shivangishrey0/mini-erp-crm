import request from "supertest";
import { app, createUserAndLogin } from "./helpers";

describe("Authorization", () => {
  // Mandatory Test 5: unauthorized user cannot perform restricted operation.
  it("rejects a SALES user creating a Product (ADMIN/OPERATIONS-only write)", async () => {
    const { token } = await createUserAndLogin("SALES");

    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Should Not Be Created", sku: "SKU-UNAUTHORIZED", category: "Test", unitPrice: 1 });

    expect(res.status).toBe(403);
  });

  it("rejects an OPERATIONS user creating a Work Order (ADMIN-only)", async () => {
    const { token } = await createUserAndLogin("OPERATIONS");

    const res = await request(app)
      .post("/work-orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ locationId: "does-not-matter", productId: "does-not-matter", requiredQty: 1, assignedUserId: "does-not-matter" });

    expect(res.status).toBe(403);
  });

  it("rejects requests with no token at all", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(401);
  });
});
