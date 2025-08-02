-- Add football skills and bio to profiles table
ALTER TABLE public.profiles 
ADD COLUMN bio TEXT,
ADD COLUMN football_skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN favorite_position TEXT,
ADD COLUMN years_playing INTEGER;

-- Add badge functionality to players table
ALTER TABLE public.players
ADD COLUMN badges JSONB DEFAULT '[]'::jsonb;

-- Create a function to auto-assign MVP badges
CREATE OR REPLACE FUNCTION public.update_player_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign MVP Champion badge for players with 5+ MVP awards
  IF NEW.mvp_awards >= 5 THEN
    NEW.badges = COALESCE(NEW.badges, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'type', 'mvp_champion',
        'name', 'MVP Champion',
        'description', '5+ MVP Awards',
        'icon', '👑',
        'earned_at', now()
      )
    );
  END IF;
  
  -- Auto-assign Goal Machine badge for players with high goal difference
  IF NEW.goal_difference >= 10 THEN
    NEW.badges = COALESCE(NEW.badges, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'type', 'goal_machine',
        'name', 'Goal Machine',
        'description', '10+ Goal Difference',
        'icon', '⚽',
        'earned_at', now()
      )
    );
  END IF;
  
  -- Remove duplicate badges
  NEW.badges = (
    SELECT jsonb_agg(DISTINCT badge)
    FROM jsonb_array_elements(NEW.badges) AS badge
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning badges
CREATE TRIGGER update_player_badges_trigger
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_player_badges();