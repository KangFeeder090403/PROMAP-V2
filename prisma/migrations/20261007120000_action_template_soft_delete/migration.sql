-- AlterTable
ALTER TABLE "ActionTemplate" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ActionTemplate_deletedAt_idx" ON "ActionTemplate"("deletedAt");
