-- 1) Safe public projection of profiles (no email, no credit)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true) AS
SELECT
  user_id,
  display_name,
  bio,
  favorite_position,
  favorite_club,
  years_playing,
  football_skills,
  skill_ratings,
  created_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = false);

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Remove the blanket public read policy on profiles
DROP POLICY IF EXISTS "Anyone can view profiles for public pages" ON public.profiles;

-- 3) Keep public achievement aggregates working without the blanket policy
CREATE OR REPLACE FUNCTION public.get_player_achievements()
 RETURNS TABLE(id uuid, name text, user_id uuid, avatar_url text, points integer, games_played integer, wins integer, draws integer, losses integer, mvp_awards integer, goal_difference integer, football_skills jsonb, skill_ratings jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH game_participants AS (
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team1_goals > g.team2_goals THEN 'win' WHEN g.team1_goals = g.team2_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team1_goals - g.team2_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    UNION ALL
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team2_goals > g.team1_goals THEN 'win' WHEN g.team2_goals = g.team1_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM games g
    CROSS JOIN LATERAL unnest(g.team2_players) AS t(player_id)
  ),
  agg AS (
    SELECT
      gp.player_id,
      (SUM(CASE WHEN gp.result = 'win' THEN 3 WHEN gp.result = 'draw' THEN 1 ELSE 0 END)
        + SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END)
        + SUM(CASE WHEN gp.is_bibs THEN 1 ELSE 0 END))::INTEGER AS points,
      COUNT(*)::INTEGER AS games_played,
      SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END)::INTEGER AS wins,
      SUM(CASE WHEN gp.result = 'draw' THEN 1 ELSE 0 END)::INTEGER AS draws,
      SUM(CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END)::INTEGER AS losses,
      SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END)::INTEGER AS mvp_awards,
      COALESCE(SUM(gp.goal_difference),0)::INTEGER AS goal_difference
    FROM game_participants gp
    GROUP BY gp.player_id
  )
  SELECT
    p.id, p.name, p.user_id, p.avatar_url,
    COALESCE(agg.points, 0), COALESCE(agg.games_played, 0), COALESCE(agg.wins, 0),
    COALESCE(agg.draws, 0), COALESCE(agg.losses, 0), COALESCE(agg.mvp_awards, 0),
    COALESCE(agg.goal_difference, 0),
    COALESCE(pr.football_skills, '[]'::jsonb),
    COALESCE(pr.skill_ratings, '{}'::jsonb)
  FROM players p
  LEFT JOIN agg ON agg.player_id = p.id
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  ORDER BY p.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_archived_player_achievements(p_season_id uuid)
 RETURNS TABLE(id uuid, name text, user_id uuid, avatar_url text, points integer, games_played integer, wins integer, draws integer, losses integer, mvp_awards integer, goal_difference integer, football_skills jsonb, skill_ratings jsonb)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH game_participants AS (
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team1_goals > g.team2_goals THEN 'win' WHEN g.team1_goals = g.team2_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team1_goals - g.team2_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM archived_games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    WHERE g.season_id = p_season_id
    UNION ALL
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team2_goals > g.team1_goals THEN 'win' WHEN g.team2_goals = g.team1_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM archived_games g
    CROSS JOIN LATERAL unnest(g.team2_players) AS t(player_id)
    WHERE g.season_id = p_season_id
  ),
  agg AS (
    SELECT
      gp.player_id,
      (SUM(CASE WHEN gp.result = 'win' THEN 3 WHEN gp.result = 'draw' THEN 1 ELSE 0 END)
        + SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END)
        + SUM(CASE WHEN gp.is_bibs THEN 1 ELSE 0 END))::INTEGER AS points,
      COUNT(*)::INTEGER AS games_played,
      SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END)::INTEGER AS wins,
      SUM(CASE WHEN gp.result = 'draw' THEN 1 ELSE 0 END)::INTEGER AS draws,
      SUM(CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END)::INTEGER AS losses,
      SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END)::INTEGER AS mvp_awards,
      COALESCE(SUM(gp.goal_difference),0)::INTEGER AS goal_difference
    FROM game_participants gp
    GROUP BY gp.player_id
  )
  SELECT
    p.id, p.name, p.user_id, p.avatar_url,
    agg.points, agg.games_played, agg.wins, agg.draws, agg.losses, agg.mvp_awards, agg.goal_difference,
    COALESCE(pr.football_skills, '[]'::jsonb),
    COALESCE(pr.skill_ratings, '{}'::jsonb)
  FROM agg
  JOIN players p ON p.id = agg.player_id
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  ORDER BY p.name;
END;
$function$;