-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionKey")
);

-- CreateTable
CREATE TABLE "MembershipRole" (
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationItem" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDiscoveredAt" TIMESTAMP(3),
    "openIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "recentChangeCount" INTEGER NOT NULL DEFAULT 0,
    "monitoringRuleCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConfigurationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CIRelationship" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromCiId" TEXT NOT NULL,
    "toCiId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CIRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CIAuditEntry" (
    "id" TEXT NOT NULL,
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
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CIAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
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
    "firedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "linkedIncidentId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "tags" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringRule" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "MonitoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRoute" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "AlertRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTimelineEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "IncidentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT,
    "data" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3),

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "data" TEXT NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "DeploymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KBArticle" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "KBArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT,
    "publicId" TEXT,
    "data" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceKind" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE INDEX "RolePermission_permissionKey_idx" ON "RolePermission"("permissionKey");

-- CreateIndex
CREATE INDEX "MembershipRole_roleId_idx" ON "MembershipRole"("roleId");

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

-- CreateIndex
CREATE INDEX "Document_tenantId_kind_idx" ON "Document"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "Document_tenantId_kind_publicId_idx" ON "Document"("tenantId", "kind", "publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_kind_key_key" ON "Document"("tenantId", "kind", "key");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resourceKind_resourceId_idx" ON "AuditLog"("tenantId", "resourceKind", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationItem" ADD CONSTRAINT "ConfigurationItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CIRelationship" ADD CONSTRAINT "CIRelationship_fromCiId_fkey" FOREIGN KEY ("fromCiId") REFERENCES "ConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CIRelationship" ADD CONSTRAINT "CIRelationship_toCiId_fkey" FOREIGN KEY ("toCiId") REFERENCES "ConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CIAuditEntry" ADD CONSTRAINT "CIAuditEntry_ciId_fkey" FOREIGN KEY ("ciId") REFERENCES "ConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringRule" ADD CONSTRAINT "MonitoringRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRoute" ADD CONSTRAINT "AlertRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComment" ADD CONSTRAINT "IncidentComment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTimelineEvent" ADD CONSTRAINT "IncidentTimelineEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentLog" ADD CONSTRAINT "DeploymentLog_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
