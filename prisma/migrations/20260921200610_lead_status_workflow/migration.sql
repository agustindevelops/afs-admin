-- AlterTable
ALTER TABLE "LeadStatus" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "LeadStatus_sortOrder_idx" ON "LeadStatus"("sortOrder");

-- Sales workflow: unseen → seen → called → sold
INSERT INTO "LeadStatus" ("code", "label", "description", "sortOrder", "updatedAt")
VALUES
  ('UNSEEN', 'Unseen', 'Submitted and not yet opened', 1, CURRENT_TIMESTAMP),
  ('SEEN', 'Seen', 'Opened and reviewed', 2, CURRENT_TIMESTAMP),
  ('CALLED', 'Called', 'An agent has called this lead', 3, CURRENT_TIMESTAMP),
  ('SOLD', 'Sold', 'Coverage was sold', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Lead" AS lead
SET "statusId" = next.id
FROM "LeadStatus" AS current, "LeadStatus" AS next
WHERE lead."statusId" = current.id
  AND current.code = 'NEW'
  AND next.code = 'UNSEEN';

UPDATE "Lead" AS lead
SET "statusId" = next.id
FROM "LeadStatus" AS current, "LeadStatus" AS next
WHERE lead."statusId" = current.id
  AND current.code IN ('CONTACTED', 'ENGAGED', 'QUALIFIED', 'NURTURING')
  AND next.code = 'CALLED';

UPDATE "Lead" AS lead
SET "statusId" = next.id
FROM "LeadStatus" AS current, "LeadStatus" AS next
WHERE lead."statusId" = current.id
  AND current.code = 'CONVERTED'
  AND next.code = 'SOLD';

UPDATE "Lead" AS lead
SET "statusId" = next.id
FROM "LeadStatus" AS current, "LeadStatus" AS next
WHERE lead."statusId" = current.id
  AND current.code IN ('UNQUALIFIED', 'LOST')
  AND next.code = 'SEEN';

DELETE FROM "LeadStatus"
WHERE code NOT IN ('UNSEEN', 'SEEN', 'CALLED', 'SOLD');
