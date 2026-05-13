-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfigurationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "criticality" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerTeamId" TEXT NOT NULL,
    "serviceId" TEXT,
    "health" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastDiscoveredAt" DATETIME,
    "openIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "recentChangeCount" INTEGER NOT NULL DEFAULT 0,
    "monitoringRuleCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ConfigurationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CIRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "fromCiId" TEXT NOT NULL,
    "toCiId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CIRelationship_fromCiId_fkey" FOREIGN KEY ("fromCiId") REFERENCES "ConfigurationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CIRelationship_toCiId_fkey" FOREIGN KEY ("toCiId") REFERENCES "ConfigurationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CIAuditEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "ciId" TEXT NOT NULL,
    "ciPublicId" TEXT NOT NULL,
    "ciName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "field" TEXT,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "source" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" DATETIME NOT NULL,
    CONSTRAINT "CIAuditEntry_ciId_fkey" FOREIGN KEY ("ciId") REFERENCES "ConfigurationItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ruleId" TEXT,
    "rulePublicId" TEXT,
    "ruleName" TEXT,
    "affectedCIIds" TEXT NOT NULL,
    "affectedCIPublicIds" TEXT NOT NULL,
    "correlationKey" TEXT NOT NULL,
    "groupCount" INTEGER NOT NULL DEFAULT 1,
    "firedAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "acknowledgedAt" DATETIME,
    "acknowledgedBy" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "linkedIncidentId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "tags" TEXT NOT NULL,
    CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoringRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" DATETIME,
    CONSTRAINT "MonitoringRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "AlertRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isMajor" BOOLEAN NOT NULL DEFAULT false,
    "linkedProblemPublicId" TEXT,
    "affectedCIIds" TEXT NOT NULL,
    "affectedCIPublicIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentComment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentTimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "IncidentTimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceKind" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationItem_publicId_key" ON "ConfigurationItem"("publicId");

-- CreateIndex
CREATE INDEX "ConfigurationItem_tenantId_type_idx" ON "ConfigurationItem"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ConfigurationItem_tenantId_environment_idx" ON "ConfigurationItem"("tenantId", "environment");

-- CreateIndex
CREATE INDEX "CIRelationship_tenantId_idx" ON "CIRelationship"("tenantId");

-- CreateIndex
CREATE INDEX "CIRelationship_fromCiId_idx" ON "CIRelationship"("fromCiId");

-- CreateIndex
CREATE INDEX "CIRelationship_toCiId_idx" ON "CIRelationship"("toCiId");

-- CreateIndex
CREATE INDEX "CIAuditEntry_tenantId_ciId_idx" ON "CIAuditEntry"("tenantId", "ciId");

-- CreateIndex
CREATE INDEX "CIAuditEntry_tenantId_timestamp_idx" ON "CIAuditEntry"("tenantId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Event_publicId_key" ON "Event"("publicId");

-- CreateIndex
CREATE INDEX "Event_tenantId_status_idx" ON "Event"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Event_tenantId_severity_idx" ON "Event"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "Event_tenantId_firedAt_idx" ON "Event"("tenantId", "firedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringRule_publicId_key" ON "MonitoringRule"("publicId");

-- CreateIndex
CREATE INDEX "MonitoringRule_tenantId_enabled_idx" ON "MonitoringRule"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRoute_publicId_key" ON "AlertRoute"("publicId");

-- CreateIndex
CREATE INDEX "AlertRoute_tenantId_idx" ON "AlertRoute"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_publicId_key" ON "Incident"("publicId");

-- CreateIndex
CREATE INDEX "Incident_tenantId_status_idx" ON "Incident"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Incident_tenantId_isMajor_idx" ON "Incident"("tenantId", "isMajor");

-- CreateIndex
CREATE INDEX "Incident_tenantId_linkedProblemPublicId_idx" ON "Incident"("tenantId", "linkedProblemPublicId");

-- CreateIndex
CREATE INDEX "IncidentComment_tenantId_incidentId_idx" ON "IncidentComment"("tenantId", "incidentId");

-- CreateIndex
CREATE INDEX "IncidentTimelineEvent_tenantId_incidentId_idx" ON "IncidentTimelineEvent"("tenantId", "incidentId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resourceKind_resourceId_idx" ON "AuditLog"("tenantId", "resourceKind", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
