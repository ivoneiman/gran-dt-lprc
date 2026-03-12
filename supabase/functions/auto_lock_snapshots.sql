-- Supabase Edge Function to lock snapshots after each gameweek
-- This function should be scheduled to run at 00:00 UTC of each day
-- It sets `locked_at` for all fantasy_team_snapshots whose gameweek status is closed

-- Get current date
WITH today AS (
  SELECT current_date AS date
)
-- Find gameweeks that are closed as of today
, closed_gw AS (
  SELECT id
  FROM gameweeks
  WHERE status = 'closed' AND date = today.date
)
-- Update snapshots for those gameweeks
UPDATE fantasy_team_snapshots
SET locked_at = now()
FROM closed_gw
WHERE fantasy_team_snapshots.gameweek_id = closed_gw.id
  AND fantasy_team_snapshots.locked_at IS NULL;
