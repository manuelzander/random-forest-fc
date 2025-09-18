-- Create a function to get player statistics efficiently
CREATE OR REPLACE FUNCTION get_player_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  user_id UUID,
  avatar_url TEXT,
  points INTEGER,
  games_played INTEGER,
  wins INTEGER,
  draws INTEGER,
  losses INTEGER,
  mvp_awards INTEGER,
  goal_difference INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.user_id,
    p.avatar_url,
    COALESCE(stats.points, 0)::INTEGER as points,
    COALESCE(stats.games_played, 0)::INTEGER as games_played,
    COALESCE(stats.wins, 0)::INTEGER as wins,
    COALESCE(stats.draws, 0)::INTEGER as draws,
    COALESCE(stats.losses, 0)::INTEGER as losses,
    COALESCE(stats.mvp_awards, 0)::INTEGER as mvp_awards,
    COALESCE(stats.goal_difference, 0)::INTEGER as goal_difference
  FROM players p
  LEFT JOIN (
    SELECT 
      player_id,
      SUM(
        CASE 
          WHEN result = 'win' THEN 3
          WHEN result = 'draw' THEN 1
          ELSE 0
        END + 
        CASE WHEN is_mvp THEN 1 ELSE 0 END
      ) as points,
      COUNT(*) as games_played,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN is_mvp THEN 1 ELSE 0 END) as mvp_awards,
      SUM(goal_difference) as goal_difference
    FROM (
      -- Team 1 players
      SELECT 
        unnest(team1_players) as player_id,
        CASE 
          WHEN team1_goals > team2_goals THEN 'win'
          WHEN team1_goals = team2_goals THEN 'draw'
          ELSE 'loss'
        END as result,
        team1_goals - team2_goals as goal_difference,
        CASE WHEN mvp_player = unnest(team1_players) THEN true ELSE false END as is_mvp
      FROM games
      
      UNION ALL
      
      -- Team 2 players
      SELECT 
        unnest(team2_players) as player_id,
        CASE 
          WHEN team2_goals > team1_goals THEN 'win'
          WHEN team2_goals = team1_goals THEN 'draw'
          ELSE 'loss'
        END as result,
        team2_goals - team1_goals as goal_difference,
        CASE WHEN mvp_player = unnest(team2_players) THEN true ELSE false END as is_mvp
      FROM games
    ) game_results
    GROUP BY player_id
  ) stats ON p.id = stats.player_id
  ORDER BY p.name;
END;
$$;