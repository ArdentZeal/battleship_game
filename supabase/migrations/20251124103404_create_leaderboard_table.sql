-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(50) NOT NULL,
  completion_time INTEGER NOT NULL, -- in seconds
  ai_difficulty VARCHAR(20) NOT NULL CHECK (ai_difficulty IN ('random', 'smart')),
  moves_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_completion_time ON leaderboard(completion_time);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ai_difficulty ON leaderboard(ai_difficulty);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at DESC);

-- Enable Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard;
DROP POLICY IF EXISTS "Anyone can submit scores" ON leaderboard;
DROP POLICY IF EXISTS "No updates allowed" ON leaderboard;
DROP POLICY IF EXISTS "No deletes allowed" ON leaderboard;

-- Create policy for reading (anyone can read)
CREATE POLICY "Anyone can view leaderboard"
  ON leaderboard
  FOR SELECT
  USING (true);

-- Create policy for inserting (anyone can submit scores)
CREATE POLICY "Anyone can submit scores"
  ON leaderboard
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes (scores are immutable)
CREATE POLICY "No updates allowed"
  ON leaderboard
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes allowed"
  ON leaderboard
  FOR DELETE
  USING (false);
