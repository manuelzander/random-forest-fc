CREATE OR REPLACE FUNCTION public.get_mvp_vote_state(_game_schedule_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_scheduled_at timestamptz; v_capacity integer; v_closed boolean; v_open boolean;
  v_eligible integer; v_votes integer; v_my_player uuid; v_my_vote uuid;
  v_am_eligible boolean := false; v_winners uuid[] := '{}'; v_tied_count integer := 0;
  v_top integer; v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT scheduled_at, CASE WHEN pitch_size = 'small' THEN 12 ELSE 14 END
  INTO v_scheduled_at, v_capacity FROM games_schedule WHERE id = _game_schedule_id;
  IF v_scheduled_at IS NULL THEN RETURN NULL; END IF;

  v_closed := now() >= v_scheduled_at + interval '72 hours';
  v_open := now() >= v_scheduled_at AND NOT v_closed;

  IF v_closed THEN
    PERFORM public.finalize_mvp_vote(_game_schedule_id);
    SELECT COALESCE(mvp_vote_winners, '{}') INTO v_winners FROM games_schedule WHERE id = _game_schedule_id;
    SELECT MAX(c) INTO v_top FROM (SELECT COUNT(*) AS c FROM mvp_votes v WHERE v.game_schedule_id = _game_schedule_id GROUP BY v.voted_player_id) t;
    IF v_top IS NOT NULL THEN
      SELECT COUNT(*) INTO v_tied_count FROM (SELECT v.voted_player_id FROM mvp_votes v WHERE v.game_schedule_id = _game_schedule_id GROUP BY v.voted_player_id HAVING COUNT(*) = v_top) t;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM (
    SELECT s.player_id, ROW_NUMBER() OVER (ORDER BY s.signed_up_at ASC, s.id ASC) AS position
    FROM games_schedule_signups s
    WHERE s.game_schedule_id = _game_schedule_id AND COALESCE(s.last_minute_dropout, false) = false
  ) r
  JOIN players p ON p.id = r.player_id
  WHERE r.position <= v_capacity AND p.user_id IS NOT NULL;

  SELECT COUNT(*) INTO v_votes FROM mvp_votes v WHERE v.game_schedule_id = _game_schedule_id;

  SELECT p.id INTO v_my_player FROM players p WHERE p.user_id = auth.uid() ORDER BY p.created_at ASC LIMIT 1;
  IF v_my_player IS NOT NULL THEN
    SELECT v.voted_player_id INTO v_my_vote FROM mvp_votes v WHERE v.game_schedule_id = _game_schedule_id AND v.voter_player_id = v_my_player;
    v_am_eligible := public.is_on_playing_roster(_game_schedule_id, v_my_player);
  END IF;

  IF v_closed THEN
    SELECT COALESCE(jsonb_agg(r ORDER BY r.votes DESC, r.name ASC), '[]'::jsonb) INTO v_results
    FROM (SELECT p.id AS player_id, p.name, p.avatar_url, COUNT(*)::int AS votes
          FROM mvp_votes v JOIN players p ON p.id = v.voted_player_id
          WHERE v.game_schedule_id = _game_schedule_id GROUP BY p.id, p.name, p.avatar_url) r;
  END IF;

  RETURN jsonb_build_object(
    'scheduled_at', v_scheduled_at, 'closes_at', v_scheduled_at + interval '72 hours',
    'is_open', v_open, 'is_closed', v_closed,
    'eligible_voters', COALESCE(v_eligible, 0), 'votes_cast', COALESCE(v_votes, 0),
    'my_player_id', v_my_player, 'am_eligible', v_am_eligible, 'my_vote', v_my_vote,
    'winner_player_id', CASE WHEN COALESCE(array_length(v_winners,1),0) = 1 THEN v_winners[1] ELSE NULL END,
    'winner_player_ids', COALESCE(to_jsonb(v_winners), '[]'::jsonb),
    'tied_count', COALESCE(v_tied_count, 0), 'results', v_results);
END;
$function$;