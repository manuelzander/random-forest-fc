-- 1. New array columns
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS mvp_players uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.archived_games ADD COLUMN IF NOT EXISTS mvp_players uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.games_schedule ADD COLUMN IF NOT EXISTS mvp_vote_winners uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.archived_games_schedule ADD COLUMN IF NOT EXISTS mvp_vote_winners uuid[] NOT NULL DEFAULT '{}';

-- Backfill from existing single MVP columns
UPDATE public.games SET mvp_players = ARRAY[mvp_player]
  WHERE mvp_player IS NOT NULL AND mvp_players = '{}';
UPDATE public.archived_games SET mvp_players = ARRAY[mvp_player]
  WHERE mvp_player IS NOT NULL AND mvp_players = '{}';
UPDATE public.games_schedule SET mvp_vote_winners = ARRAY[mvp_vote_winner]
  WHERE mvp_vote_winner IS NOT NULL AND mvp_vote_winners = '{}';
UPDATE public.archived_games_schedule SET mvp_vote_winners = ARRAY[mvp_vote_winner]
  WHERE mvp_vote_winner IS NOT NULL AND mvp_vote_winners = '{}';

-- 2. Finalisation: share for two, award nobody for three or more
CREATE OR REPLACE FUNCTION public.finalize_mvp_vote(_game_schedule_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_winners uuid[];
  v_finalized timestamptz;
  v_top int;
BEGIN
  IF NOT public.mvp_voting_closed(_game_schedule_id) THEN
    RETURN NULL;
  END IF;

  SELECT mvp_vote_winners, mvp_votes_finalized_at
  INTO v_winners, v_finalized
  FROM games_schedule
  WHERE id = _game_schedule_id;

  IF v_finalized IS NULL THEN
    SELECT MAX(c) INTO v_top
    FROM (
      SELECT COUNT(*) AS c
      FROM mvp_votes v
      WHERE v.game_schedule_id = _game_schedule_id
      GROUP BY v.voted_player_id
    ) t;

    IF v_top IS NULL THEN
      v_winners := '{}';
    ELSE
      SELECT ARRAY_AGG(voted_player_id) INTO v_winners
      FROM (
        SELECT v.voted_player_id, COUNT(*) AS c
        FROM mvp_votes v
        WHERE v.game_schedule_id = _game_schedule_id
        GROUP BY v.voted_player_id
        HAVING COUNT(*) = v_top
      ) t;

      -- a tie of three or more awards nobody
      IF COALESCE(array_length(v_winners, 1), 0) > 2 THEN
        v_winners := '{}';
      END IF;
    END IF;

    UPDATE games_schedule
    SET mvp_vote_winners = COALESCE(v_winners, '{}'),
        mvp_vote_winner = CASE
          WHEN COALESCE(array_length(v_winners, 1), 0) = 1 THEN v_winners[1]
          ELSE NULL
        END,
        mvp_votes_finalized_at = now()
    WHERE id = _game_schedule_id;
  END IF;

  -- Push onto the game result when one exists and has no MVP yet
  IF COALESCE(array_length(v_winners, 1), 0) > 0 THEN
    UPDATE games
    SET mvp_players = v_winners,
        mvp_player = v_winners[1]
    WHERE game_schedule_id = _game_schedule_id
      AND mvp_players = '{}'
      AND mvp_player IS NULL;
  END IF;

  RETURN CASE WHEN COALESCE(array_length(v_winners, 1), 0) = 1 THEN v_winners[1] ELSE NULL END;
END;
$function$;

-- 3. Vote state: expose all winners plus the tied count
CREATE OR REPLACE FUNCTION public.get_mvp_vote_state(_game_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_scheduled_at timestamptz;
  v_capacity integer;
  v_closed boolean;
  v_open boolean;
  v_eligible integer;
  v_votes integer;
  v_my_player uuid;
  v_my_vote uuid;
  v_am_eligible boolean := false;
  v_winners uuid[] := '{}';
  v_tied_count integer := 0;
  v_top integer;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT scheduled_at, CASE WHEN pitch_size = 'small' THEN 12 ELSE 14 END
  INTO v_scheduled_at, v_capacity
  FROM games_schedule WHERE id = _game_schedule_id;

  IF v_scheduled_at IS NULL THEN
    RETURN NULL;
  END IF;

  v_closed := now() >= v_scheduled_at + interval '72 hours';
  v_open := now() >= v_scheduled_at AND NOT v_closed;

  IF v_closed THEN
    PERFORM public.finalize_mvp_vote(_game_schedule_id);
    SELECT COALESCE(mvp_vote_winners, '{}') INTO v_winners
    FROM games_schedule WHERE id = _game_schedule_id;

    SELECT MAX(c) INTO v_top
    FROM (
      SELECT COUNT(*) AS c FROM mvp_votes v
      WHERE v.game_schedule_id = _game_schedule_id
      GROUP BY v.voted_player_id
    ) t;

    IF v_top IS NOT NULL THEN
      SELECT COUNT(*) INTO v_tied_count
      FROM (
        SELECT v.voted_player_id FROM mvp_votes v
        WHERE v.game_schedule_id = _game_schedule_id
        GROUP BY v.voted_player_id
        HAVING COUNT(*) = v_top
      ) t;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM (
    SELECT s.player_id,
           COALESCE(s.last_minute_dropout, false) AS dropped,
           ROW_NUMBER() OVER (ORDER BY s.signed_up_at ASC, s.id ASC) AS position
    FROM games_schedule_signups s
    WHERE s.game_schedule_id = _game_schedule_id
  ) r
  JOIN players p ON p.id = r.player_id
  WHERE r.dropped = false
    AND r.position <= v_capacity
    AND p.user_id IS NOT NULL;

  SELECT COUNT(*) INTO v_votes
  FROM mvp_votes v
  WHERE v.game_schedule_id = _game_schedule_id;

  SELECT p.id INTO v_my_player
  FROM players p
  WHERE p.user_id = auth.uid()
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_my_player IS NOT NULL THEN
    SELECT v.voted_player_id INTO v_my_vote
    FROM mvp_votes v
    WHERE v.game_schedule_id = _game_schedule_id AND v.voter_player_id = v_my_player;

    v_am_eligible := public.is_on_playing_roster(_game_schedule_id, v_my_player);
  END IF;

  IF v_closed THEN
    SELECT COALESCE(jsonb_agg(r ORDER BY r.votes DESC, r.name ASC), '[]'::jsonb)
    INTO v_results
    FROM (
      SELECT p.id AS player_id, p.name, p.avatar_url, COUNT(*)::int AS votes
      FROM mvp_votes v
      JOIN players p ON p.id = v.voted_player_id
      WHERE v.game_schedule_id = _game_schedule_id
      GROUP BY p.id, p.name, p.avatar_url
    ) r;
  END IF;

  RETURN jsonb_build_object(
    'scheduled_at', v_scheduled_at,
    'closes_at', v_scheduled_at + interval '72 hours',
    'is_open', v_open,
    'is_closed', v_closed,
    'eligible_voters', COALESCE(v_eligible, 0),
    'votes_cast', COALESCE(v_votes, 0),
    'my_player_id', v_my_player,
    'am_eligible', v_am_eligible,
    'my_vote', v_my_vote,
    'winner_player_id', CASE WHEN COALESCE(array_length(v_winners,1),0) = 1 THEN v_winners[1] ELSE NULL END,
    'winner_player_ids', COALESCE(to_jsonb(v_winners), '[]'::jsonb),
    'tied_count', COALESCE(v_tied_count, 0),
    'results', v_results
  );
END;
$function$;

-- 4. Link trigger: carry the winners array through
CREATE OR REPLACE FUNCTION public.link_game_to_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_id uuid;
  v_winners uuid[];
BEGIN
  IF NEW.game_schedule_id IS NULL THEN
    SELECT gs.id INTO v_schedule_id
    FROM games_schedule gs
    WHERE gs.scheduled_at <= now()
      AND gs.scheduled_at > now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM games g WHERE g.game_schedule_id = gs.id
      )
    ORDER BY gs.scheduled_at ASC
    LIMIT 1;

    NEW.game_schedule_id := v_schedule_id;
  END IF;

  IF COALESCE(array_length(NEW.mvp_players, 1), 0) = 0
     AND NEW.mvp_player IS NULL
     AND NEW.game_schedule_id IS NOT NULL THEN
    PERFORM public.finalize_mvp_vote(NEW.game_schedule_id);

    SELECT COALESCE(gs.mvp_vote_winners, '{}') INTO v_winners
    FROM games_schedule gs
    WHERE gs.id = NEW.game_schedule_id;

    IF COALESCE(array_length(v_winners, 1), 0) > 0 THEN
      NEW.mvp_players := v_winners;
      NEW.mvp_player := v_winners[1];
    END IF;
  END IF;

  -- keep the legacy single column in sync with the array
  IF COALESCE(array_length(NEW.mvp_players, 1), 0) > 0 THEN
    NEW.mvp_player := NEW.mvp_players[1];
  ELSIF NEW.mvp_player IS NOT NULL THEN
    NEW.mvp_players := ARRAY[NEW.mvp_player];
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Stats: count every player in the MVP list
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
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    UNION ALL
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team2_goals > g.team1_goals THEN 'win' WHEN g.team2_goals = g.team1_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
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
STABLE SECURITY DEFINER
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
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
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
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
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

CREATE OR REPLACE FUNCTION public.get_player_stats()
RETURNS TABLE(id uuid, name text, user_id uuid, avatar_url text, points integer, games_played integer, wins integer, draws integer, losses integer, mvp_awards integer, goal_difference integer)
LANGUAGE plpgsql
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
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
      (t.player_id = g.bibs_player) AS is_bibs
    FROM games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    UNION ALL
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team2_goals > g.team1_goals THEN 'win' WHEN g.team2_goals = g.team1_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = ANY(g.mvp_players)) AS is_mvp,
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
    COALESCE(agg.goal_difference, 0)
  FROM players p
  LEFT JOIN agg ON agg.player_id = p.id
  ORDER BY p.name;
END;
$function$;