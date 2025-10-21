-- Add last_minute_dropout field to track players who drop within 24 hours
ALTER TABLE public.games_schedule_signups 
ADD COLUMN last_minute_dropout boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.games_schedule_signups.last_minute_dropout IS 'True if player dropped out within 24 hours of game start';