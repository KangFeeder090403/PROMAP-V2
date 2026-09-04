-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Proposal_deletedAt_idx" ON "Proposal"("deletedAt");
