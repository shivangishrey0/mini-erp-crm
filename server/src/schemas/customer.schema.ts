import { z } from "zod";
import { CustomerType, CustomerStatus } from "@prisma/client";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email().optional(),
  businessName: z.string().min(1),
  gstNumber: z.string().optional(),
  type: z.nativeEnum(CustomerType),
  address: z.string().min(1),
  status: z.nativeEnum(CustomerStatus).optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// .partial() makes every field optional - PATCH only updates what's sent.
export const updateCustomerSchema = createCustomerSchema.partial();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  type: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
});

export const followUpNoteSchema = z.object({
  note: z.string().min(1),
});
