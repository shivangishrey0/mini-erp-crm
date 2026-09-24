import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});
