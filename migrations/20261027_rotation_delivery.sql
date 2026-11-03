-- Back up the database before applying. Run once in a maintenance window.
ALTER TABLE api_rotation_counter ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 0;
ALTER TABLE api_rotation_reservation ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 0;
ALTER TABLE like_transaction ADD COLUMN IF NOT EXISTS confirmed_response jsonb;
ALTER TABLE like_transaction ADD COLUMN IF NOT EXISTS reserved_likes integer NOT NULL DEFAULT 0;
ALTER TABLE like_transaction ADD COLUMN IF NOT EXISTS usage_date timestamp;
-- Existing rows must be preserved; new epochs can coexist with old pending reservations.
DROP INDEX IF EXISTS api_rotation_provider_region_idx;
CREATE UNIQUE INDEX IF NOT EXISTS api_rotation_provider_region_epoch_idx ON api_rotation_counter(provider_id, region_id, epoch);
