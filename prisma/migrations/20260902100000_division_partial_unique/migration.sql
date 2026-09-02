-- Dedupe: kalau ada (companyId, name) aktif yang duplikat, soft-delete semua
-- kecuali baris yang paling lama, supaya index unique di bawah bisa dipasang.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "companyId", "name"
           ORDER BY "createdAt" ASC
         ) AS rn
  FROM "Division"
  WHERE "deletedAt" IS NULL
)
UPDATE "Division"
SET "deletedAt" = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Unik per (companyId, name) hanya untuk baris aktif (deletedAt IS NULL)
CREATE UNIQUE INDEX "Division_companyId_name_active_key"
ON "Division"("companyId", "name")
WHERE "deletedAt" IS NULL;
