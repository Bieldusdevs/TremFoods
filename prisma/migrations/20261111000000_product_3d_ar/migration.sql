-- AlterTable (idempotente: pode rodar mais de uma vez)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "modelUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "iosModelUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dims" JSONB;
