-- Link results back to their scheduled game
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_schedule_id uuid REFERENCES public.games_schedule(id) ON DELETE SET NULL;

-- Store the vote outcome on the schedule
ALTER TABLE public.games_schedule ADD COLUMN IF NOT EXISTS mvp_vote_winner uuid REFERENCES public.players(id) ON DELETE SET NULL;
ALTER TABLE public.games_schedule ADD COLUMN IF NOT EXISTS mvp_votes_finalized_at timestamptz;

ALTER TABLE public.archived_games ADD COLUMN IF NOT EXISTS game_schedule_id uuid;
ALTER TABLE public.archived_games_schedule ADD COLUMN IF NOT EXISTS mvp_vote_winner uuid;
ALTER TABLE public.archived_games_schedule ADD COLUMN IF NOT EXISTS mvp_votes_finalized_at timestamptz;

-- Votes
CREATE TABLE IF NOT EXISTS public.mvp_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_schedule_id uuid NOT NULL REFERENCES public.games_schedule(id) ON DELETE CASCADE,
  voter_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  voted_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mvp_votes_no_self_vote CHECK (voter_player_id <> voted_player_id),
  CONSTRAINT mvp_votes_one_per_voter UNIQUE (game_schedule_id, voter_player_id)
);

GRANT SELECT ON public.mvp_votes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvp_votes TO authenticated;
GRANT ALL ON public.mvp_votes TO service_role;

ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_vote_mvp(_game_schedule_id uuid, _voter_player_id uuid, _voted_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- voter owns the player profile
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = _voter_player_id AND p.user_id = auth.uid()
    )
    -- voter is on the roster and has not dropped out
    AND EXISTS (
      SELECT 1 FROM games_schedule_signups s
      WHERE s.game_schedule_id = _game_schedule_id
        AND s.player_id = _voter_player_id
        AND COALESCE(s.last_minute_dropout, false) = false
    )
    -- the voted player is on the roster and has not dropped out
    AND EXISTS (
      SELECT 1 FROM games_schedule_signups s
      WHERE s.game_schedule_id = _game_schedule_id
        AND s.player_id = _voted_player_id
        AND COALESCE(s.last_minute_dropout, false) = false
    )
    AND _voter_player_id <> _voted_player_id
    -- voting window: kickoff .. kickoff + 48h
    AND EXISTS (
      SELECT 1 FROM games_schedule g
      WHERE g.id = _game_schedule_id
        AND now() >= g.scheduled_at
        AND now() < g.scheduled_at + interval '48 hours'
    )
$$;

CREATE POLICY "Anyone can view mvp votes"
  ON public.mvp_votes FOR SELECT USING (true);

CREATE POLICY "Rostered players can cast their vote"
  ON public.mvp_votes FOR INSERT TO authenticated
  WITH CHECK (public.can_vote_mvp(game_schedule_id, voter_player_id, voted_player_id));

CREATE POLICY "Rostered players can change their vote"
  ON public.mvp_votes FOR UPDATE TO authenticated
  USING (public.can_vote_mvp(game_schedule_id, voter_player_id, voted_player_id))
  WITH CHECK (public.can_vote_mvp(game_schedule_id, voter_player_id, voted_player_id));

CREATE POLICY "Rostered players can remove their vote"
  ON public.mvp_votes FOR DELETE TO authenticated
  USING (public.can_vote_mvp(game_schedule_id, voter_player_id, voted_player_id));

CREATE POLICY "Admins can manage mvp votes"
  ON public.mvp_votes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mvp_votes_updated_at
  BEFORE UPDATE ON public.mvp_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Archived votes
CREATE TABLE IF NOT EXISTS public.archived_mvp_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  game_schedule_id uuid NOT NULL,
  voter_player_id uuid,
  voted_player_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.archived_mvp_votes TO anon;
GRANT SELECT ON public.archived_mvp_votes TO authenticated;
GRANT ALL ON public.archived_mvp_votes TO service_role;

ALTER TABLE public.archived_mvp_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view archived mvp votes"
  ON public.archived_mvp_votes FOR SELECT USING (true);

CREATE POLICY "Admins can manage archived mvp votes"
  ON public.archived_mvp_votes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Realtime for live vote progress
ALTER TABLE public.mvp_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mvp_votes;