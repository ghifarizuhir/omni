-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT,
    "data" TEXT NOT NULL,
    "scheduledStart" DATETIME
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "startedAt" DATETIME,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DeploymentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "DeploymentLog_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "KBArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_publicId_key" ON "Problem"("publicId");

-- CreateIndex
CREATE INDEX "Problem_tenantId_status_idx" ON "Problem"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Change_publicId_key" ON "Change"("publicId");

-- CreateIndex
CREATE INDEX "Change_tenantId_status_idx" ON "Change"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Change_tenantId_scheduledStart_idx" ON "Change"("tenantId", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "Release_publicId_key" ON "Release"("publicId");

-- CreateIndex
CREATE INDEX "Release_tenantId_status_idx" ON "Release"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_publicId_key" ON "Deployment"("publicId");

-- CreateIndex
CREATE INDEX "Deployment_tenantId_status_idx" ON "Deployment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DeploymentLog_tenantId_deploymentId_idx" ON "DeploymentLog"("tenantId", "deploymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_publicId_key" ON "ServiceRequest"("publicId");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_status_idx" ON "ServiceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CatalogItem_tenantId_idx" ON "CatalogItem"("tenantId");

-- CreateIndex
CREATE INDEX "Integration_tenantId_enabled_idx" ON "Integration"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "KBArticle_publicId_key" ON "KBArticle"("publicId");

-- CreateIndex
CREATE INDEX "KBArticle_tenantId_status_idx" ON "KBArticle"("tenantId", "status");
