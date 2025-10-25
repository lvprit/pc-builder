/*
  Warnings:

  - You are about to drop the column `shopifyProductId` on the `Component` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyVariantId` on the `Component` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Component" DROP COLUMN "shopifyProductId",
DROP COLUMN "shopifyVariantId",
ALTER COLUMN "sourceType" DROP NOT NULL,
ALTER COLUMN "isMultiSelct" DROP NOT NULL,
ALTER COLUMN "order" DROP NOT NULL;
