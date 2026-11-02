CREATE OR REPLACE FUNCTION public.is_on_playing_roster(_game_schedule_id uuid, _player_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH cap AS (
    SELECT CASE WHEN gs.pitch_size = 'small' THEN 12 ELSE 14 END AS capacity
    FROM games_schedule gs WHERE gs.id = _game_schedule_id
  ), ranked AS (
    SELECT s.player_id,
           ROW_NUMBER() OVER (ORDER BY s.signed_up_at ASC, s.id ASC) AS position
    FROM games_schedule_signups s
    WHERE s.game_schedule_id = _game_schedule_id
      AND COALESCE(s.last_minute_dropout, false) = false
  )
  SELECT EXISTS (
    SELECT 1 FROM ranked r, cap
    WHERE r.player_id = _player_id AND r.position <= cap.capacity
  )
$function$;