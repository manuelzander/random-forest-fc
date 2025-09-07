-- Add skill ratings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN skill_ratings jsonb DEFAULT '{
  "pace": 50,
  "shooting": 50,
  "passing": 50,
  "dribbling": 50,
  "defending": 50,
  "physical": 50
}'::jsonb;