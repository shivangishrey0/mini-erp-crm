import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        locationId: z.string().min(1),
        batch: z.string().min(1).default("DEFAULT"),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "At least one item is required"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: z.string().optional(),
});
