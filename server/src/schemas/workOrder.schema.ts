import { z } from "zod";
import { WorkOrderStatus } from "@prisma/client";

export const createWorkOrderSchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  requiredQty: z.coerce.number().int().positive(),
  assignedUserId: z.string().min(1),
});

// Status can only move forward one step at a time - enforced in the
// controller, not here, since it needs the current row to check against.
export const updateWorkOrderStatusSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listWorkOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(WorkOrderStatus).optional(),
  locationId: z.string().optional(),
});
