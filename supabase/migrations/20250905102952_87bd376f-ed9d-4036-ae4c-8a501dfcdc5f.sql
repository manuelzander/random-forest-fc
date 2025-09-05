-- Drop the function that references the player_stats view
DROP FUNCTION IF EXISTS public.get_player_stats();

-- Drop the player_stats view since we're no longer using it
DROP VIEW IF EXISTS public.player_stats;