-- CreateEnum
CREATE TYPE "ApplicationTeamRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'VIEWER');

-- AlterTable
ALTER TABLE "ApplicationTeam" ADD COLUMN     "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "role" "ApplicationTeamRole" NOT NULL DEFAULT 'CONTRIBUTOR';

-- AlterTable
ALTER TABLE "Change" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "ConfigurationItem" ADD COLUMN     "primaryApplicationId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "Release" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "applicationId" TEXT;

-- CreateIndex
CREATE INDEX "ApplicationTeam_applicationId_role_idx" ON "ApplicationTeam"("applicationId", "role");

-- CreateIndex
CREATE INDEX "Change_tenantId_applicationId_idx" ON "Change"("tenantId", "applicationId");

-- CreateIndex
CREATE INDEX "ConfigurationItem_tenantId_primaryApplicationId_idx" ON "ConfigurationItem"("tenantId", "primaryApplicationId");

-- CreateIndex
CREATE INDEX "Event_tenantId_applicationId_idx" ON "Event"("tenantId", "applicationId");

-- CreateIndex
CREATE INDEX "Incident_tenantId_applicationId_idx" ON "Incident"("tenantId", "applicationId");

-- CreateIndex
CREATE INDEX "Problem_tenantId_applicationId_idx" ON "Problem"("tenantId", "applicationId");

-- CreateIndex
CREATE INDEX "Release_tenantId_applicationId_idx" ON "Release"("tenantId", "applicationId");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_applicationId_idx" ON "ServiceRequest"("tenantId", "applicationId");
