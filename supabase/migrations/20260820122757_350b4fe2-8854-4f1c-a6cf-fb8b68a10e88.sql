-- 1. Seasons
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  started_on date,
  ended_on date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO anon;
GRANT SELECT ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can manage seasons" ON public.seasons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Archive tables
CREATE TABLE public.archived_games (
  id uuid PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team1_goals integer NOT NULL,
  team2_goals integer NOT NULL,
  team1_players uuid[] NOT NULL,
  team2_players uuid[] NOT NULL,
  team1_captain uuid,
  team2_captain uuid,
  mvp_player uuid,
  youtube_url text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
GRANT SELECT ON public.archived_games TO anon;
GRANT SELECT ON public.archived_games TO authenticated;
GRANT ALL ON public.archived_games TO service_role;
ALTER TABLE public.archived_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view archived games" ON public.archived_games FOR SELECT USING (true);
CREATE POLICY "Admins can manage archived games" ON public.archived_games FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX archived_games_season_idx ON public.archived_games(season_id);

CREATE TABLE public.archived_games_schedule (
  id uuid PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  pitch_size text,
  total_cost numeric NOT NULL DEFAULT 93.6,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
GRANT SELECT ON public.archived_games_schedule TO anon;
GRANT SELECT ON public.archived_games_schedule TO authenticated;
GRANT ALL ON public.archived_games_schedule TO service_role;
ALTER TABLE public.archived_games_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view archived scheduled games" ON public.archived_games_schedule FOR SELECT USING (true);
CREATE POLICY "Admins can manage archived scheduled games" ON public.archived_games_schedule FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX archived_games_schedule_season_idx ON public.archived_games_schedule(season_id);

CREATE TABLE public.archived_games_schedule_signups (
  id uuid PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  game_schedule_id uuid NOT NULL REFERENCES public.archived_games_schedule(id) ON DELETE CASCADE,
  player_id uuid,
  guest_id uuid,
  guest_name text,
  is_guest boolean DEFAULT false,
  created_by_user_id uuid,
  last_minute_dropout boolean DEFAULT false,
  signed_up_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
GRANT SELECT ON public.archived_games_schedule_signups TO anon;
GRANT SELECT ON public.archived_games_schedule_signups TO authenticated;
GRANT ALL ON public.archived_games_schedule_signups TO service_role;
ALTER TABLE public.archived_games_schedule_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view archived signups" ON public.archived_games_schedule_signups FOR SELECT USING (true);
CREATE POLICY "Admins can manage archived signups" ON public.archived_games_schedule_signups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX archived_signups_season_idx ON public.archived_games_schedule_signups(season_id);
CREATE INDEX archived_signups_schedule_idx ON public.archived_games_schedule_signups(game_schedule_id);

-- 3. Archive the 2025/26 season
DO $$
DECLARE
  v_season uuid;
  v_games integer;
  v_sched integer;
  v_signups integer;
  v_src_games integer;
  v_src_sched integer;
  v_src_signups integer;
BEGIN
  SELECT count(*) INTO v_src_games FROM public.games;
  SELECT count(*) INTO v_src_sched FROM public.games_schedule;
  SELECT count(*) INTO v_src_signups FROM public.games_schedule_signups;

  INSERT INTO public.seasons (name, started_on, ended_on, is_current)
  VALUES ('2025/26', '2025-09-10', '2026-08-01', false)
  RETURNING id INTO v_season;

  INSERT INTO public.archived_games (id, season_id, team1_goals, team2_goals, team1_players, team2_players, team1_captain, team2_captain, mvp_player, youtube_url, created_at, updated_at)
  SELECT id, v_season, team1_goals, team2_goals, team1_players, team2_players, team1_captain, team2_captain, mvp_player, youtube_url, created_at, updated_at
  FROM public.games;

  INSERT INTO public.archived_games_schedule (id, season_id, scheduled_at, created_by, pitch_size, total_cost, created_at, updated_at)
  SELECT id, v_season, scheduled_at, created_by, pitch_size, total_cost, created_at, updated_at
  FROM public.games_schedule;

  INSERT INTO public.archived_games_schedule_signups (id, season_id, game_schedule_id, player_id, guest_id, guest_name, is_guest, created_by_user_id, last_minute_dropout, signed_up_at, created_at)
  SELECT id, v_season, game_schedule_id, player_id, guest_id, guest_name, is_guest, created_by_user_id, last_minute_dropout, signed_up_at, created_at
  FROM public.games_schedule_signups;

  SELECT count(*) INTO v_games FROM public.archived_games WHERE season_id = v_season;
  SELECT count(*) INTO v_sched FROM public.archived_games_schedule WHERE season_id = v_season;
  SELECT count(*) INTO v_signups FROM public.archived_games_schedule_signups WHERE season_id = v_season;

  IF v_games <> v_src_games OR v_sched <> v_src_sched OR v_signups <> v_src_signups THEN
    RAISE EXCEPTION 'Archive verification failed: games %/%, schedule %/%, signups %/%',
      v_games, v_src_games, v_sched, v_src_sched, v_signups, v_src_signups;
  END IF;

  DELETE FROM public.games_schedule_signups;
  DELETE FROM public.games_schedule;
  DELETE FROM public.games;

  INSERT INTO public.seasons (name, started_on, ended_on, is_current)
  VALUES ('2026/27', '2026-08-02', NULL, true);
END $$;

-- 4. Archived standings / trophies aggregation
CREATE OR REPLACE FUNCTION public.get_archived_player_achievements(p_season_id uuid)
RETURNS TABLE(id uuid, name text, user_id uuid, avatar_url text, points integer, games_played integer, wins integer, draws integer, losses integer, mvp_awards integer, goal_difference integer, football_skills jsonb, skill_ratings jsonb)
LANGUAGE plpgsql
STABLE
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
      (t.player_id = g.mvp_player) AS is_mvp
    FROM archived_games g
    CROSS JOIN LATERAL unnest(g.team1_players) AS t(player_id)
    WHERE g.season_id = p_season_id
    UNION ALL
    SELECT
      g.id AS game_id,
      t.player_id,
      CASE WHEN g.team2_goals > g.team1_goals THEN 'win' WHEN g.team2_goals = g.team1_goals THEN 'draw' ELSE 'loss' END AS result,
      (g.team2_goals - g.team1_goals) AS goal_difference,
      (t.player_id = g.mvp_player) AS is_mvp
    FROM archived_games g
    CROSS JOIN LATERAL unnest(g.team2_players) AS t(player_id)
    WHERE g.season_id = p_season_id
  ),
  agg AS (
    SELECT
      gp.player_id,
      (SUM(CASE WHEN gp.result = 'win' THEN 3 WHEN gp.result = 'draw' THEN 1 ELSE 0 END)
        + SUM(CASE WHEN gp.is_mvp THEN 1 ELSE 0 END))::INTEGER AS points,
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
    agg.points,
    agg.games_played,
    agg.wins,
    agg.draws,
    agg.losses,
    agg.mvp_awards,
    agg.goal_difference,
    COALESCE(pr.football_skills, '[]'::jsonb),
    COALESCE(pr.skill_ratings, '{}'::jsonb)
  FROM agg
  JOIN players p ON p.id = agg.player_id
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  ORDER BY p.name;
END;
$function$;