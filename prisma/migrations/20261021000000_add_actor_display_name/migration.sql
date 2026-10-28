-- Add a human-readable, non-authoritative label for actors.
ALTER TABLE "Actor" ADD COLUMN "displayName" VARCHAR(80);

-- Keep labels unique without considering letter case while allowing NULL for legacy actors.
CREATE UNIQUE INDEX "Actor_displayName_lower_key"
ON "Actor" (LOWER("displayName"))
WHERE "displayName" IS NOT NULL;
