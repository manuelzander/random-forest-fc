-- Improve get_player_stats logic and fix MVP computation per player
-- Also set an explicit search_path for safety
CREATE OR REPLACE FUNCTION public.get_player_stats()
 RETURNS TABLE(
  id uuid,
  name text,
  user_id uuid,
  avatar_url text,
  points integer,
  games_played integer,
  wins integer,
  draws integer,
  losses integer,
  mvp_awards integer,
  goal_difference integer
 )
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH game_participants AS (
    -- Team 1 players expanded
    SELECT 
      g.id AS game_id,
      t.player_id,
      CASE 
        WHEN g.team1_goals > g.team2_goals THEN 'win'
        WHEN g.team1_goals = g.team2_goals THEN 'draw'
        ELSE 'loss'
      END AS result,
      (g.team1_goals - g.team2_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp
    FROM games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    
    UNION ALL
    
    -- Team 2 players expanded
    SELECT 
      g.id AS game_id,
      t.player_id,
      CASE 
        WHEN g.team2_goals > g.team1_goals THEN 'win'
        WHEN g.team2_goals = g.team1_goals THEN 'draw'
        ELSE 'loss'
      END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp
    FROM games g
    CROSS JOIN LATERAL unnest(g.team2_players) AS t(player_id)
  ),
  agg AS (
    SELECT 
      gp.player_id,
      -- 3 for win, 1 for draw, +1 for MVP
      (SUM(
        CASE 
          WHEN gp.result = 'win' THEN 3
          WHEN gp.result = 'draw' THEN 1
          ELSE 0
        END
      ) + SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END))::INTEGER AS points,
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
    p.id,
    p.name,
    p.user_id,
    p.avatar_url,
    COALESCE(agg.points, 0),
    COALESCE(agg.games_played, 0),
    COALESCE(agg.wins, 0),
    COALESCE(agg.draws, 0),
    COALESCE(agg.losses, 0),
    COALESCE(agg.mvp_awards, 0),
    COALESCE(agg.goal_difference, 0)
  FROM players p
  LEFT JOIN agg ON agg.player_id = p.id
  ORDER BY p.name;
END;
$function$