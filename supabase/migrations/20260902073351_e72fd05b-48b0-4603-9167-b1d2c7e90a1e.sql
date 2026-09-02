-- 1) Finalize the vote when a result is entered, so the winner is applied even if
--    no one visited the signup page after the ballot closed.
CREATE OR REPLACE FUNCTION public.link_game_to_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_id uuid;
  v_winner uuid;
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

  IF NEW.mvp_player IS NULL AND NEW.game_schedule_id IS NOT NULL THEN
    -- no-op while the ballot is still open
    PERFORM public.finalize_mvp_vote(NEW.game_schedule_id);

    SELECT gs.mvp_vote_winner INTO v_winner
    FROM games_schedule gs
    WHERE gs.id = NEW.game_schedule_id;

    NEW.mvp_player := v_winner;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Deterministic player lookup for the current user
CREATE OR REPLACE FUNCTION public.get_mvp_vote_state(_game_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_scheduled_at timestamptz;
  v_closed boolean;
  v_open boolean;
  v_eligible integer;
  v_votes integer;
  v_my_player uuid;
  v_my_vote uuid;
  v_am_eligible boolean := false;
  v_winner uuid;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT scheduled_at INTO v_scheduled_at FROM games_schedule WHERE id = _game_schedule_id;
  IF v_scheduled_at IS NULL THEN
    RETURN NULL;
  END IF;

  v_closed := now() >= v_scheduled_at + interval '72 hours';
  v_open := now() >= v_scheduled_at AND NOT v_closed;

  IF v_closed THEN
    v_winner := public.finalize_mvp_vote(_game_schedule_id);
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM games_schedule_signups s
  JOIN players p ON p.id = s.player_id
  WHERE s.game_schedule_id = _game_schedule_id
    AND COALESCE(s.last_minute_dropout, false) = false
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

    SELECT EXISTS (
      SELECT 1 FROM games_schedule_signups s
      WHERE s.game_schedule_id = _game_schedule_id
        AND s.player_id = v_my_player
        AND COALESCE(s.last_minute_dropout, false) = false
    ) INTO v_am_eligible;
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
    'winner_player_id', v_winner,
    'results', v_results
  );
END;
$function$;

-- 3) Drop stale votes when a player leaves the roster (dropout or signup removed)
CREATE OR REPLACE FUNCTION public.cleanup_mvp_votes_on_roster_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_player uuid;
  v_schedule uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_player := OLD.player_id;
    v_schedule := OLD.game_schedule_id;
  ELSE
    v_player := NEW.player_id;
    v_schedule := NEW.game_schedule_id;
  END IF;

  IF v_player IS NULL OR v_schedule IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- keep votes intact once the ballot has been finalised
  IF EXISTS (
    SELECT 1 FROM games_schedule gs
    WHERE gs.id = v_schedule AND gs.mvp_votes_finalized_at IS NOT NULL
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  DELETE FROM mvp_votes v
  WHERE v.game_schedule_id = v_schedule
    AND (v.voter_player_id = v_player OR v.voted_player_id = v_player);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS cleanup_mvp_votes_on_dropout ON public.games_schedule_signups;
CREATE TRIGGER cleanup_mvp_votes_on_dropout
AFTER UPDATE OF last_minute_dropout ON public.games_schedule_signups
FOR EACH ROW
WHEN (COALESCE(NEW.last_minute_dropout, false) = true AND COALESCE(OLD.last_minute_dropout, false) = false)
EXECUTE FUNCTION public.cleanup_mvp_votes_on_roster_change();

DROP TRIGGER IF EXISTS cleanup_mvp_votes_on_signup_delete ON public.games_schedule_signups;
CREATE TRIGGER cleanup_mvp_votes_on_signup_delete
AFTER DELETE ON public.games_schedule_signups
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_mvp_votes_on_roster_change();