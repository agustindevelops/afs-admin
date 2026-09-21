-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "preferredCallTimeId" INTEGER;

-- CreateTable
CREATE TABLE "PreferredCallTime" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferredCallTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreferredCallTime_code_key" ON "PreferredCallTime"("code");

-- CreateIndex
CREATE INDEX "Lead_preferredCallTimeId_idx" ON "Lead"("preferredCallTimeId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_preferredCallTimeId_fkey" FOREIGN KEY ("preferredCallTimeId") REFERENCES "PreferredCallTime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
