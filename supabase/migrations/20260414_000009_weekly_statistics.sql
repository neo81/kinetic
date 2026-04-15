-- Create weekly_statistics table to store historical weekly performance snapshots
CREATE TABLE weekly_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  total_volume numeric(10,2) DEFAULT 0, -- total kg lifted
  total_volume_minutes numeric(8,2) DEFAULT 0, -- total time-based exercise minutes
  total_exercises integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  average_duration_minutes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Create index for fast queries on user_id and week_start_date
CREATE INDEX idx_weekly_statistics_user_week
  ON weekly_statistics(user_id, week_start_date DESC);

-- Enable Row Level Security
ALTER TABLE weekly_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own statistics
CREATE POLICY "users_view_own_weekly_stats" ON weekly_statistics
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Service role / app can insert statistics
CREATE POLICY "app_insert_weekly_stats" ON weekly_statistics
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: App can update statistics
CREATE POLICY "app_update_weekly_stats" ON weekly_statistics
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
