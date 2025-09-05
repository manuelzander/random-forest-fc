-- Replace the view with a regular view (not SECURITY DEFINER)
DROP VIEW IF EXISTS player_stats;

CREATE VIEW player_stats AS
WITH game_results AS (
  -- Calculate results for team1 players
  SELECT 
    unnest(team1_players) as player_id,
    CASE 
      WHEN team1_goals > team2_goals THEN 3 -- Win
      WHEN team1_goals = team2_goals THEN 1 -- Draw
      ELSE 0 -- Loss
    END as points,
    CASE 
      WHEN team1_goals > team2_goals THEN 1 
      ELSE 0 
    END as wins,
    CASE 
      WHEN team1_goals = team2_goals THEN 1 
      ELSE 0 
    END as draws,
    CASE 
      WHEN team1_goals < team2_goals THEN 1 
      ELSE 0 
    END as losses,
    (team1_goals - team2_goals) as goal_difference,
    CASE 
      WHEN mvp_player = ANY(team1_players) THEN 1 
      ELSE 0 
    END as mvp_awards,
    1 as games_played
  FROM games
  
  UNION ALL
  
  -- Calculate results for team2 players
  SELECT 
    unnest(team2_players) as player_id,
    CASE 
      WHEN team2_goals > team1_goals THEN 3 -- Win
      WHEN team2_goals = team1_goals THEN 1 -- Draw
      ELSE 0 -- Loss
    END as points,
    CASE 
      WHEN team2_goals > team1_goals THEN 1 
      ELSE 0 
    END as wins,
    CASE 
      WHEN team2_goals = team1_goals THEN 1 
      ELSE 0 
    END as draws,
    CASE 
      WHEN team2_goals < team1_goals THEN 1 
      ELSE 0 
    END as losses,
    (team2_goals - team1_goals) as goal_difference,
    CASE 
      WHEN mvp_player = ANY(team2_players) THEN 1 
      ELSE 0 
    END as mvp_awards,
    1 as games_played
  FROM games
)
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.avatar_url,
  p.badges,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(gr.points), 0) as points,
  COALESCE(SUM(gr.games_played), 0) as games_played,
  COALESCE(SUM(gr.wins), 0) as wins,
  COALESCE(SUM(gr.draws), 0) as draws,
  COALESCE(SUM(gr.losses), 0) as losses,
  COALESCE(SUM(gr.mvp_awards), 0) as mvp_awards,
  COALESCE(SUM(gr.goal_difference), 0) as goal_difference
FROM players p
LEFT JOIN game_results gr ON p.id = gr.player_id
GROUP BY p.id, p.name, p.user_id, p.avatar_url, p.badges, p.created_at, p.updated_at;