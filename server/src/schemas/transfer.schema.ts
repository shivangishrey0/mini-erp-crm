import { z } from "zod";
import { TransferStatus } from "@prisma/client";

export const createTransferSchema = z
  .object({
    sourceLocationId: z.string().min(1),
    destinationLocationId: z.string().min(1),
    productId: z.string().min(1),
    batch: z.string().min(1).default("DEFAULT"),
    quantity: z.coerce.number().int().positive(),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "Source and destination location must be different",
    path: ["destinationLocationId"],
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listTransfersQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TransferStatus).optional(),
});
