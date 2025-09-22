-- Add pitch_size column to games_schedule table
ALTER TABLE public.games_schedule 
ADD COLUMN pitch_size TEXT CHECK (pitch_size IN ('small', 'big'));

-- Add a comment to explain the column
COMMENT ON COLUMN public.games_schedule.pitch_size IS 'Optional pitch size specification: small or big';