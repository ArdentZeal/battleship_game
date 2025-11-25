-- Create game_rooms table for multiplayer games
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_player_name VARCHAR(50) NOT NULL,
  guest_player_name VARCHAR(50),
  host_board JSONB,
  guest_board JSONB,
  current_turn VARCHAR(10), -- 'host' or 'guest'
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- 'waiting', 'placing', 'playing', 'finished'
  winner VARCHAR(50),
  host_ready BOOLEAN DEFAULT false,
  guest_ready BOOLEAN DEFAULT false,
  game_start_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_moves table for move history
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_type VARCHAR(10) NOT NULL, -- 'host' or 'guest'
  coordinate JSONB NOT NULL, -- {row, col}
  result VARCHAR(20) NOT NULL, -- 'hit', 'miss', 'sunk'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add game_mode column to leaderboard
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) DEFAULT 'vsAI';
-- game_mode: 'vsAI' or 'vsPlayer'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_room_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_updated ON game_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_moves_room ON game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_mode ON leaderboard(game_mode);

-- Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create rooms" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can view rooms" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can view moves" ON game_moves;
DROP POLICY IF EXISTS "Anyone can insert moves" ON game_moves;

-- RLS Policies for game_rooms (allow anonymous access for now)
CREATE POLICY "Anyone can create rooms"
  ON game_rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view rooms"
  ON game_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update rooms"
  ON game_rooms
  FOR UPDATE
  USING (true);

-- RLS Policies for game_moves
CREATE POLICY "Anyone can view moves"
  ON game_moves
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert moves"
  ON game_moves
  FOR INSERT
  WITH CHECK (true);

-- Function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
