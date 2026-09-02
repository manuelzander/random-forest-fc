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

  v_closed := now() >= v_scheduled_at + interval '48 hours';
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

  SELECT p.id INTO v_my_player FROM players p WHERE p.user_id = auth.uid() LIMIT 1;

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
    'closes_at', v_scheduled_at + interval '48 hours',
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

-- Admins may moderate votes but not cast one outside the eligibility rules
DROP POLICY IF EXISTS "Admins can manage mvp votes" ON public.mvp_votes;
CREATE POLICY "Admins can view mvp votes" ON public.mvp_votes
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update mvp votes" ON public.mvp_votes
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete mvp votes" ON public.mvp_votes
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));