/*
# Add one-time Master account bootstrap

1. Overview
This migration adds a single-use database marker for creating the first MediCore Master account. It allows the initial administrator to be created safely before any authenticated user exists.

2. New Table
- `master_bootstrap`
  - `id` is a singleton key that can only be true.
  - `claimed_at` records when first-run setup was consumed.

3. Security
- Row-level security is enabled.
- Anonymous and authenticated Data API access is removed.
- Only the server-side account-management function uses this marker.

4. Data Safety
- The table contains no patient, billing, or staff data.
- The marker is claimed atomically and can be used only once.
*/

CREATE TABLE IF NOT EXISTS master_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  claimed_at timestamptz
);

INSERT INTO master_bootstrap (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE master_bootstrap ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON master_bootstrap FROM anon, authenticated;
GRANT SELECT, UPDATE ON master_bootstrap TO service_role;
