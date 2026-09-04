import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().cuid(),
  qty: z.number().int().min(1).max(20).default(1),
});

export const setItemSchema = z.object({
  productId: z.string().cuid(),
  qty: z.number().int().min(0).max(20),
});
