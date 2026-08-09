import { z } from "zod";
import { MovementType } from "@prisma/client";

// Field schemas shared between create/update, WITHOUT .default() - a
// .default() survives .partial() (Zod fills it in when the key is simply
// omitted), which would silently reset minStockAlert to 0 on every PATCH
// that doesn't explicitly include it. The default is applied separately,
// only in createProductSchema below.
const productFields = {
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.coerce.number().positive(),
  minStockAlert: z.coerce.number().int().min(0),
  location: z.string().min(1),
};

// currentStock is intentionally absent - every product starts at 0 and the
// only way to change stock is POST /products/:id/stock-movements, so the
// audit log has zero exceptions (not "every change except the first one").
export const createProductSchema = z.object({
  ...productFields,
  minStockAlert: productFields.minStockAlert.default(0),
});

export const updateProductSchema = z.object(productFields).partial();

export const stockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  type: z.nativeEnum(MovementType),
  reason: z.string().min(1),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});
