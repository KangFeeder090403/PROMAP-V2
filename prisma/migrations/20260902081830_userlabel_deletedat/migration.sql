-- DropIndex
DROP INDEX "UserLabel_companyId_idx";

-- AlterTable
ALTER TABLE "UserLabel" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UserLabel_companyId_deletedAt_idx" ON "UserLabel"("companyId", "deletedAt");
