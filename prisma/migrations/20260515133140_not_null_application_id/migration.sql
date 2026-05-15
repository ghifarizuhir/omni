/*
  Warnings:

  - Made the column `applicationId` on table `Change` required. This step will fail if there are existing NULL values in that column.
  - Made the column `primaryApplicationId` on table `ConfigurationItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationId` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationId` on table `Incident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationId` on table `Problem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationId` on table `Release` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationId` on table `ServiceRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Change" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ConfigurationItem" ALTER COLUMN "primaryApplicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Incident" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Problem" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Release" ALTER COLUMN "applicationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ServiceRequest" ALTER COLUMN "applicationId" SET NOT NULL;
