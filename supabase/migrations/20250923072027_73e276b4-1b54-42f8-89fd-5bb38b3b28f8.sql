-- Add created_by_user_id to track who added guest signups
ALTER TABLE games_schedule_signups 
ADD COLUMN created_by_user_id uuid;

-- Update RLS policy to allow users to remove guest signups they created
DROP POLICY IF EXISTS "Users can remove their own signups" ON games_schedule_signups;

CREATE POLICY "Users can remove their own signups and guest signups they created" 
ON games_schedule_signups 
FOR DELETE 
USING (
  -- Can remove their own player signup
  (EXISTS (
    SELECT 1 FROM players 
    WHERE players.id = games_schedule_signups.player_id 
    AND players.user_id = auth.uid()
  ))
  OR 
  -- Can remove guest signups they created
  (is_guest = true AND created_by_user_id = auth.uid())
);