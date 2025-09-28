-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "receiptFileName" TEXT,
ADD COLUMN     "receiptFileSize" INTEGER,
ADD COLUMN     "receiptFileUrl" TEXT,
ADD COLUMN     "receiptMimeType" TEXT;

-- AlterTable
ALTER TABLE "public"."savings_transactions" ADD COLUMN     "receiptFileName" TEXT,
ADD COLUMN     "receiptFileSize" INTEGER,
ADD COLUMN     "receiptFileUrl" TEXT,
ADD COLUMN     "receiptMimeType" TEXT;
