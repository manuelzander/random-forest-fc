DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  bio text,
  favorite_position text,
  favorite_club text,
  years_playing integer,
  football_skills jsonb,
  skill_ratings jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.user_id,
    p.display_name,
    p.bio,
    p.favorite_position,
    p.favorite_club,
    p.years_playing,
    COALESCE(p.football_skills, '[]'::jsonb),
    COALESCE(p.skill_ratings, '{}'::jsonb)
  FROM public.profiles p
  WHERE p.user_id = p_user_id
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;