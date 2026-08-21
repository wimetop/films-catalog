import { z } from "zod";

export const itemDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

export const itemListCacheSchema = z.object({ value: z.array(itemDtoSchema) });
export const itemCacheSchema = z.object({ value: itemDtoSchema.nullable() });
