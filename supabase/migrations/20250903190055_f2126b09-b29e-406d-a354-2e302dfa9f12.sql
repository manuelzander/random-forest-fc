-- Add YouTube video URL column to games table
ALTER TABLE public.games 
ADD COLUMN youtube_url TEXT;