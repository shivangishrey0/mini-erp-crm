import { z } from "zod";

// Product is catalog-only now (name/sku/category/price/alert threshold) -
// stock quantities live on InventoryRecord (per location+batch), not here.
const productFields = {
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.coerce.number().positive(),
  minStockAlert: z.coerce.number().int().min(0),
};

export const createProductSchema = z.object({
  ...productFields,
  minStockAlert: productFields.minStockAlert.default(0),
});

export const updateProductSchema = z.object(productFields).partial();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
});
