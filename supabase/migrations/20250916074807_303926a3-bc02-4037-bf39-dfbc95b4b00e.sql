-- Add columns to games_schedule_signups to allow guest signups without creating player records
ALTER TABLE public.games_schedule_signups 
ADD COLUMN guest_name text,
ADD COLUMN is_guest boolean DEFAULT false;

-- Make player_id nullable since guests won't have player records
ALTER TABLE public.games_schedule_signups 
ALTER COLUMN player_id DROP NOT NULL;

-- Add constraint to ensure either player_id is provided OR it's a guest signup
ALTER TABLE public.games_schedule_signups 
ADD CONSTRAINT check_player_or_guest 
CHECK (
  (player_id IS NOT NULL AND is_guest = false) OR 
  (player_id IS NULL AND is_guest = true AND guest_name IS NOT NULL)
);

-- Update RLS policies to allow anonymous signups for guests
CREATE POLICY "Anyone can signup as guest for scheduled games" 
ON public.games_schedule_signups 
FOR INSERT 
WITH CHECK (is_guest = true);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Anyone can signup for scheduled games" ON public.games_schedule_signups;

CREATE POLICY "Authenticated users can signup for scheduled games" 
ON public.games_schedule_signups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND is_guest = false);