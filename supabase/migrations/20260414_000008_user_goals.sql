-- Create user_goals table to store weekly training targets
CREATE TABLE user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_volume_target numeric(10,2) NOT NULL DEFAULT 20000, -- kg
  weekly_exercises_target integer NOT NULL DEFAULT 30,
  weekly_duration_target integer NOT NULL DEFAULT 300, -- minutes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries by user_id
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);

-- Enable Row Level Security
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own goals
CREATE POLICY "users_view_own_goals" ON user_goals
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can only update their own goals
CREATE POLICY "users_update_own_goals" ON user_goals
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can insert only their own goals
CREATE POLICY "users_insert_own_goals" ON user_goals
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
