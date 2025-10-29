-- 001_add_compliance_id.sql
BEGIN;
-- 1) Add column if it doesn't exist
ALTER TABLE risk_scores
  ADD COLUMN IF NOT EXISTS compliance_id INTEGER;

-- 2) Backfill compliance_id by matching commit_hash where possible
UPDATE risk_scores r
SET compliance_id = c.id
FROM compliance_results c
WHERE r.commit_hash IS NOT NULL
  AND r.commit_hash = c.commit_hash;

-- 3) Add foreign key constraint if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_risk_compliance'
  ) THEN
    ALTER TABLE risk_scores
      ADD CONSTRAINT fk_risk_compliance
      FOREIGN KEY (compliance_id) REFERENCES compliance_results(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 4) Add index to speed queries
CREATE INDEX IF NOT EXISTS idx_risk_compliance_id ON risk_scores(compliance_id);

COMMIT;
