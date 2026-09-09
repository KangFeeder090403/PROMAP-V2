-- DropForeignKey
ALTER TABLE "ActionPlan" DROP CONSTRAINT "ActionPlan_divisionId_fkey";

-- AlterTable
ALTER TABLE "ActionPlan" ALTER COLUMN "divisionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
