import { z } from "zod";
import { MovementType } from "@prisma/client";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listInventoryQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  locationId: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});

export const adjustInventorySchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  batch: z.string().min(1).default("DEFAULT"),
  quantity: z.coerce.number().int().positive(),
  type: z.nativeEnum(MovementType),
  reason: z.string().min(1),
});
