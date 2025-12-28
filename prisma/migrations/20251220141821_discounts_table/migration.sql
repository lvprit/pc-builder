-- CreateEnum
CREATE TYPE "public"."DiscountStatus" AS ENUM ('active', 'inactive', 'draft');

-- CreateEnum
CREATE TYPE "public"."DiscountRuleType" AS ENUM ('spend_threshold', 'item_count', 'reduce_shipping');

-- CreateEnum
CREATE TYPE "public"."DiscountAppliesTo" AS ENUM ('order', 'product', 'shipping');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateTable
CREATE TABLE "public"."DiscountRule" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "metafieldId" TEXT,
    "name" TEXT NOT NULL,
    "status" "public"."DiscountStatus" NOT NULL,
    "ruleType" "public"."DiscountRuleType" NOT NULL,
    "appliesTo" "public"."DiscountAppliesTo" NOT NULL,
    "minSubtotal" INTEGER NOT NULL,
    "discountType" "public"."DiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountRule_shop_idx" ON "public"."DiscountRule"("shop");

-- CreateIndex
CREATE INDEX "DiscountRule_status_idx" ON "public"."DiscountRule"("status");
