import { z } from "zod";
import { ChallanStatus } from "@prisma/client";

export const createChallanSchema = z.object({
  customerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "At least one item is required"),
  // Defaults to DRAFT in the controller. Only DRAFT/CONFIRMED are valid here -
  // a challan can't be created already CANCELLED.
  status: z.enum(["DRAFT", "CONFIRMED"]).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listChallansQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ChallanStatus).optional(),
  customerId: z.string().optional(),
});
