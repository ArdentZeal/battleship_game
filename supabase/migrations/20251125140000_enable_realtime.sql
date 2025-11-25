-- Add tables to supabase_realtime publication to enable listening to changes
BEGIN;
  -- Check if publication exists, if not create it (standard in Supabase but good to be safe)
  -- Actually, we can't easily check inside a block like this in standard SQL without dynamic SQL or ignoring errors.
  -- But usually 'supabase_realtime' exists.
  
  -- We'll just try to add the tables.
  -- Note: This requires the publication to exist.
  
  ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
  ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
COMMIT;
