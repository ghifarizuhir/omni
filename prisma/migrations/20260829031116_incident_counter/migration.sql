-- CreateTable
CREATE TABLE "IncidentCounter" (
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IncidentCounter_pkey" PRIMARY KEY ("year")
);

-- Backfill: seed each year's counter from the highest existing numeric
-- publicId suffix so new creates continue past pre-existing INC-YYYY-NNNNN ids.
INSERT INTO "IncidentCounter" ("year", "seq")
SELECT "year", MAX("seq")
FROM (
  SELECT
    CAST(SUBSTRING("publicId" FROM '^INC-([0-9]{4})-[0-9]{5}$') AS INTEGER) AS "year",
    CAST(SUBSTRING("publicId" FROM '^INC-[0-9]{4}-([0-9]{5})$') AS INTEGER) AS "seq"
  FROM "Incident"
  WHERE "publicId" ~ '^INC-[0-9]{4}-[0-9]{5}$'
) AS "t"
GROUP BY "year";
