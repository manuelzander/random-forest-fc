-- One result per scheduled fixture
CREATE UNIQUE INDEX IF NOT EXISTS games_game_schedule_id_unique
ON public.games (game_schedule_id)
WHERE game_schedule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_game_to_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule_id uuid;
  v_winner uuid;
BEGIN
  -- Pair each entered result with the OLDEST kicked-off fixture that has no result yet,
  -- so back-to-back fixtures entered back to back line up in the right order.
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
    SELECT gs.mvp_vote_winner INTO v_winner
    FROM games_schedule gs
    WHERE gs.id = NEW.game_schedule_id;

    NEW.mvp_player := v_winner;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_game_to_schedule_trigger ON public.games;
CREATE TRIGGER link_game_to_schedule_trigger
BEFORE INSERT ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.link_game_to_schedule();