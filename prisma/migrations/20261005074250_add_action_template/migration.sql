-- CreateTable
CREATE TABLE "ActionTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "divisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionTemplate_divisionId_idx" ON "ActionTemplate"("divisionId");

-- AddForeignKey
ALTER TABLE "ActionTemplate" ADD CONSTRAINT "ActionTemplate_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
