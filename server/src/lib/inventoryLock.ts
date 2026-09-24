import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export interface InventoryKey {
  productId: string;
  locationId: string;
  batch: string;
}

export interface LockedInventoryRow {
  id: string;
  productId: string;
  locationId: string;
  batch: string;
  physicalQty: number;
  reservedQty: number;
}

// Every stock-mutating flow (reserve, dispatch, receive, work-order
// consumption, manual adjust) goes through this instead of a plain
// findUnique + update. A plain read-then-write is a TOCTOU race: two
// concurrent requests can both read the same stale quantity, both pass
// their validation, and both write - overselling/overdrafting stock. This
// upserts the row (creating it at 0 if a destination has never held this
// product/batch before) then takes a raw `SELECT ... FOR UPDATE` on it, so
// a second transaction touching the same row blocks until the first
// commits and sees the updated numbers - the "solve it at the
// backend/database level" requirement.
export async function lockInventoryRecord(tx: TxClient, key: InventoryKey): Promise<LockedInventoryRow> {
  await tx.inventoryRecord.upsert({
    where: { productId_locationId_batch: key },
    update: {},
    create: { ...key, physicalQty: 0, reservedQty: 0 },
  });

  const rows = await tx.$queryRaw<LockedInventoryRow[]>`
    SELECT id, "productId", "locationId", batch, "physicalQty", "reservedQty"
    FROM "InventoryRecord"
    WHERE "productId" = ${key.productId} AND "locationId" = ${key.locationId} AND batch = ${key.batch}
    FOR UPDATE
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("InventoryRecord not found after upsert");
  }
  return row;
}

export function availableQty(row: { physicalQty: number; reservedQty: number }): number {
  return row.physicalQty - row.reservedQty;
}
