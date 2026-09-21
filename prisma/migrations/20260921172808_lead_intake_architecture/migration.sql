/*
  Warnings:

  - You are about to drop the column `clientId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('SINGLE', 'MULTI', 'TEXT', 'EMAIL', 'PHONE', 'ZIP', 'BOOLEAN', 'DATE', 'CONSENT');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('QUOTE_FORM', 'INTAKE_FLOW');

-- CreateEnum
CREATE TYPE "QuestionOutcome" AS ENUM ('CREATE_LEAD', 'REDIRECT', 'COMPLETE');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clientId_fkey";

-- DropIndex
DROP INDEX "User_clientId_idx";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clientId",
ADD COLUMN     "passwordHash" TEXT;

-- DropTable
DROP TABLE "Client";

-- CreateTable
CREATE TABLE "LeadStatus" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeFlow" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "flowId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "helpText" TEXT,
    "answerType" "AnswerType" NOT NULL,
    "mapsToLeadField" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionEdge" (
    "id" SERIAL NOT NULL,
    "fromQuestionId" INTEGER NOT NULL,
    "toQuestionId" INTEGER,
    "choiceKey" TEXT NOT NULL,
    "choiceLabel" TEXT NOT NULL,
    "choiceDescription" TEXT,
    "outcome" "QuestionOutcome",
    "redirectUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "flowId" INTEGER,
    "source" "LeadSource" NOT NULL,
    "coverageType" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAnswer" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "edgeId" INTEGER,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadStatus_code_key" ON "LeadStatus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeFlow_slug_key" ON "IntakeFlow"("slug");

-- CreateIndex
CREATE INDEX "Question_flowId_idx" ON "Question"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_flowId_key_key" ON "Question"("flowId", "key");

-- CreateIndex
CREATE INDEX "QuestionEdge_fromQuestionId_idx" ON "QuestionEdge"("fromQuestionId");

-- CreateIndex
CREATE INDEX "QuestionEdge_toQuestionId_idx" ON "QuestionEdge"("toQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionEdge_fromQuestionId_choiceKey_key" ON "QuestionEdge"("fromQuestionId", "choiceKey");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- CreateIndex
CREATE INDEX "Lead_statusId_idx" ON "Lead"("statusId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_coverageType_idx" ON "Lead"("coverageType");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "LeadAnswer_leadId_idx" ON "LeadAnswer"("leadId");

-- CreateIndex
CREATE INDEX "LeadAnswer_questionId_idx" ON "LeadAnswer"("questionId");

-- CreateIndex
CREATE INDEX "LeadAnswer_edgeId_idx" ON "LeadAnswer"("edgeId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "IntakeFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionEdge" ADD CONSTRAINT "QuestionEdge_fromQuestionId_fkey" FOREIGN KEY ("fromQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionEdge" ADD CONSTRAINT "QuestionEdge_toQuestionId_fkey" FOREIGN KEY ("toQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "LeadStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "IntakeFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnswer" ADD CONSTRAINT "LeadAnswer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnswer" ADD CONSTRAINT "LeadAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnswer" ADD CONSTRAINT "LeadAnswer_edgeId_fkey" FOREIGN KEY ("edgeId") REFERENCES "QuestionEdge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
