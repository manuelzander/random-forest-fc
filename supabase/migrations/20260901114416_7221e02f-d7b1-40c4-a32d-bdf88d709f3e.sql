-- 1. Voting window helper
CREATE OR REPLACE FUNCTION public.mvp_voting_closed(_game_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM games_schedule g
    WHERE g.id = _game_schedule_id
      AND now() >= g.scheduled_at + interval '48 hours'
  )
$$;

REVOKE ALL ON FUNCTION public.mvp_voting_closed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mvp_voting_closed(uuid) TO authenticated, anon, service_role;

-- 2. Secret ballot: replace the fully-open SELECT policy
DROP POLICY IF EXISTS "Anyone can view mvp votes" ON public.mvp_votes;

CREATE POLICY "Own vote visible while open, all votes once closed"
ON public.mvp_votes
FOR SELECT
USING (
  public.mvp_voting_closed(game_schedule_id)
  OR EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = mvp_votes.voter_player_id AND p.user_id = auth.uid()
  )
);

-- 3. Finalize a closed vote: winner -> games_schedule + linked games row
CREATE OR REPLACE FUNCTION public.finalize_mvp_vote(_game_schedule_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_winner uuid;
  v_finalized timestamptz;
BEGIN
  IF NOT public.mvp_voting_closed(_game_schedule_id) THEN
    RETURN NULL;
  END IF;

  SELECT mvp_vote_winner, mvp_votes_finalized_at
  INTO v_winner, v_finalized
  FROM games_schedule
  WHERE id = _game_schedule_id;

  IF v_finalized IS NULL THEN
    SELECT v.voted_player_id
    INTO v_winner
    FROM mvp_votes v
    WHERE v.game_schedule_id = _game_schedule_id
    GROUP BY v.voted_player_id
    ORDER BY COUNT(*) DESC, MIN(v.created_at) ASC
    LIMIT 1;

    UPDATE games_schedule
    SET mvp_vote_winner = v_winner,
        mvp_votes_finalized_at = now()
    WHERE id = _game_schedule_id;
  END IF;

  -- Push onto the game result when one exists and has no MVP yet
  IF v_winner IS NOT NULL THEN
    UPDATE games
    SET mvp_player = v_winner
    WHERE game_schedule_id = _game_schedule_id
      AND mvp_player IS NULL;
  END IF;

  RETURN v_winner;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_mvp_vote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_mvp_vote(uuid) TO authenticated, anon, service_role;

-- 4. Single state read for the UI
CREATE OR REPLACE FUNCTION public.get_mvp_vote_state(_game_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scheduled_at timestamptz;
  v_closed boolean;
  v_open boolean;
  v_eligible integer;
  v_votes integer;
  v_my_player uuid;
  v_my_vote uuid;
  v_winner uuid;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT scheduled_at INTO v_scheduled_at FROM games_schedule WHERE id = _game_schedule_id;
  IF v_scheduled_at IS NULL THEN
    RETURN NULL;
  END IF;

  v_closed := now() >= v_scheduled_at + interval '48 hours';
  v_open := now() >= v_scheduled_at AND NOT v_closed;

  IF v_closed THEN
    v_winner := public.finalize_mvp_vote(_game_schedule_id);
  END IF;

  -- eligible voters: rostered, non-dropout signups tied to a claimed player
  SELECT COUNT(*) INTO v_eligible
  FROM games_schedule_signups s
  JOIN players p ON p.id = s.player_id
  WHERE s.game_schedule_id = _game_schedule_id
    AND COALESCE(s.last_minute_dropout, false) = false
    AND p.user_id IS NOT NULL;

  SELECT COUNT(*) INTO v_votes
  FROM mvp_votes v
  WHERE v.game_schedule_id = _game_schedule_id;

  SELECT p.id INTO v_my_player FROM players p WHERE p.user_id = auth.uid() LIMIT 1;

  IF v_my_player IS NOT NULL THEN
    SELECT v.voted_player_id INTO v_my_vote
    FROM mvp_votes v
    WHERE v.game_schedule_id = _game_schedule_id AND v.voter_player_id = v_my_player;
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
    'closes_at', v_scheduled_at + interval '48 hours',
    'is_open', v_open,
    'is_closed', v_closed,
    'eligible_voters', COALESCE(v_eligible, 0),
    'votes_cast', COALESCE(v_votes, 0),
    'my_player_id', v_my_player,
    'my_vote', v_my_vote,
    'winner_player_id', v_winner,
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mvp_vote_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mvp_vote_state(uuid) TO authenticated, anon, service_role;