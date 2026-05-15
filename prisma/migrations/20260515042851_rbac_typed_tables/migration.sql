-- AlterTable
ALTER TABLE "User" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "divisionId" TEXT,
ADD COLUMN     "isSuperadmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criticality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationTeam" (
    "applicationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "ApplicationTeam_pkey" PRIMARY KEY ("applicationId","teamId")
);

-- CreateTable
CREATE TABLE "FunctionalRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunctionalRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFunctionalRole" (
    "userId" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,

    CONSTRAINT "UserFunctionalRole_pkey" PRIMARY KEY ("userId","functionalRoleId")
);

-- CreateIndex
CREATE INDEX "Division_tenantId_idx" ON "Division"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Division_tenantId_code_key" ON "Division"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE INDEX "Department_divisionId_idx" ON "Department"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tenantId_code_key" ON "Team"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Application_tenantId_idx" ON "Application"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_tenantId_code_key" ON "Application"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ApplicationTeam_teamId_idx" ON "ApplicationTeam"("teamId");

-- CreateIndex
CREATE INDEX "FunctionalRole_tenantId_idx" ON "FunctionalRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalRole_tenantId_code_key" ON "FunctionalRole"("tenantId", "code");

-- CreateIndex
CREATE INDEX "UserFunctionalRole_functionalRoleId_idx" ON "UserFunctionalRole"("functionalRoleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTeam" ADD CONSTRAINT "ApplicationTeam_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTeam" ADD CONSTRAINT "ApplicationTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalRole" ADD CONSTRAINT "FunctionalRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunctionalRole" ADD CONSTRAINT "UserFunctionalRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunctionalRole" ADD CONSTRAINT "UserFunctionalRole_functionalRoleId_fkey" FOREIGN KEY ("functionalRoleId") REFERENCES "FunctionalRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Backfill from Document JSON blobs ────────────────────────────────────────

-- Divisions
INSERT INTO "Division" (id, "tenantId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-division'
ON CONFLICT (id) DO NOTHING;

-- Departments (only those whose division resolved)
INSERT INTO "Department" (id, "tenantId", "divisionId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'divisionId'),
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-department'
  AND EXISTS (SELECT 1 FROM "Division" v WHERE v.id = (d.data::jsonb ->> 'divisionId'))
ON CONFLICT (id) DO NOTHING;

-- Teams
INSERT INTO "Team" (id, "tenantId", "departmentId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'departmentId'),
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-team'
  AND EXISTS (SELECT 1 FROM "Department" p WHERE p.id = (d.data::jsonb ->> 'departmentId'))
ON CONFLICT (id) DO NOTHING;

-- Applications
INSERT INTO "Application" (id, "tenantId", code, name, criticality, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  (d.data::jsonb ->> 'criticality'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-application'
ON CONFLICT (id) DO NOTHING;

-- ApplicationTeam: include ownerTeamId, and any teams array if present
INSERT INTO "ApplicationTeam" ("applicationId", "teamId")
SELECT DISTINCT
  (d.data::jsonb ->> 'id') AS app_id,
  team_id
FROM "Document" d,
     LATERAL (
       SELECT (d.data::jsonb ->> 'ownerTeamId') AS team_id
       UNION ALL
       SELECT jsonb_array_elements_text(COALESCE(d.data::jsonb -> 'teams', '[]'::jsonb))
     ) t
WHERE d.kind = 'rbac-application'
  AND t.team_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Team" tm WHERE tm.id = t.team_id)
  AND EXISTS (SELECT 1 FROM "Application" a WHERE a.id = (d.data::jsonb ->> 'id'))
ON CONFLICT DO NOTHING;

-- FunctionalRole
INSERT INTO "FunctionalRole" (id, "tenantId", code, name, description, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  (d.data::jsonb ->> 'description'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-role'
ON CONFLICT (id) DO NOTHING;

-- ── Merge rbac-user docs into User by email ──────────────────────────────────

-- Update existing real users with org fields and superadmin flag
UPDATE "User" u
SET
  "isSuperadmin" = COALESCE((d.data::jsonb ->> 'isSuperadmin')::boolean, FALSE),
  "level"        = NULLIF(d.data::jsonb ->> 'level', ''),
  "divisionId"   = NULLIF(d.data::jsonb ->> 'divisionId', ''),
  "departmentId" = NULLIF(d.data::jsonb ->> 'departmentId', ''),
  "teamId"       = NULLIF(d.data::jsonb ->> 'teamId', '')
FROM "Document" d
WHERE d.kind = 'rbac-user'
  AND (d.data::jsonb ->> 'email') = u.email;

-- Insert synthetic-only users (org-only, no passwordHash → cannot log in)
INSERT INTO "User" (id, email, name, "isSuperadmin", "level", "divisionId", "departmentId", "teamId", "createdAt")
SELECT
  (d.data::jsonb ->> 'id'),
  (d.data::jsonb ->> 'email'),
  (d.data::jsonb ->> 'name'),
  COALESCE((d.data::jsonb ->> 'isSuperadmin')::boolean, FALSE),
  NULLIF(d.data::jsonb ->> 'level', ''),
  NULLIF(d.data::jsonb ->> 'divisionId', ''),
  NULLIF(d.data::jsonb ->> 'departmentId', ''),
  NULLIF(d.data::jsonb ->> 'teamId', ''),
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-user'
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.email = (d.data::jsonb ->> 'email'))
ON CONFLICT (id) DO NOTHING;

-- Functional role assignments
INSERT INTO "UserFunctionalRole" ("userId", "functionalRoleId")
SELECT
  u.id,
  fr.id
FROM "Document" d
JOIN "User" u            ON u.email = (d.data::jsonb ->> 'email')
JOIN LATERAL jsonb_array_elements_text(COALESCE(d.data::jsonb -> 'functionalRoles', '[]'::jsonb)) AS code(value) ON TRUE
JOIN "FunctionalRole" fr ON fr.code = code.value AND fr."tenantId" = d."tenantId"
WHERE d.kind = 'rbac-user'
ON CONFLICT DO NOTHING;

-- ── Drop old document rows ──────────────────────────────────────────────────
DELETE FROM "Document" WHERE kind IN ('rbac-division', 'rbac-department', 'rbac-team', 'rbac-application', 'rbac-role', 'rbac-user');
