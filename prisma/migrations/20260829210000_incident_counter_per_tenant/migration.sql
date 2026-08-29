-- Drop the global publicId unique and recreate as composite (tenantId, publicId)
-- Note: Prisma created constraint "Incident_publicId_key"
DROP INDEX IF EXISTS "Incident_publicId_key";
-- In case it was a constraint:
ALTER TABLE "Incident" DROP CONSTRAINT IF EXISTS "Incident_publicId_key";

-- Recreate IncidentCounter as per-tenant
DROP TABLE IF EXISTS "IncidentCounter";

CREATE TABLE "IncidentCounter" (
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IncidentCounter_pkey" PRIMARY KEY ("tenantId", "year")
);

-- Backfill per (tenantId, year) from highest existing publicId suffix per tenant
INSERT INTO "IncidentCounter" ("tenantId", "year", "seq")
SELECT "tenantId", "year", MAX("seq")
FROM (
  SELECT
    "tenantId",
    CAST(SUBSTRING("publicId" FROM '^INC-([0-9]{4})-[0-9]{5}$') AS INTEGER) AS "year",
    CAST(SUBSTRING("publicId" FROM '^INC-[0-9]{4}-([0-9]{5})$') AS INTEGER) AS "seq"
  FROM "Incident"
  WHERE "publicId" ~ '^INC-[0-9]{4}-[0-9]{5}$'
) AS "t"
GROUP BY "tenantId", "year";

-- Create composite unique index on (tenantId, publicId)
CREATE UNIQUE INDEX "Incident_tenantId_publicId_key" ON "Incident"("tenantId", "publicId");
