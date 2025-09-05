-- Add policy to allow public read access to profiles
-- This is safe because we're only exposing public profile information like bio, skills, etc.
CREATE POLICY "Anyone can view public profile information" 
ON public.profiles 
FOR SELECT 
USING (true);