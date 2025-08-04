-- Add captain fields to games table
ALTER TABLE public.games 
ADD COLUMN team1_captain uuid,
ADD COLUMN team2_captain uuid;