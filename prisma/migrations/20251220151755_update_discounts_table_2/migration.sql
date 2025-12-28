-- AlterTable
ALTER TABLE "public"."DiscountRule" ADD COLUMN     "itemCount" INTEGER,
ALTER COLUMN "minSubtotal" DROP NOT NULL;
