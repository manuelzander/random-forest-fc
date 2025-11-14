-- Allow anyone to view profiles (for public player profile pages)
CREATE POLICY "Anyone can view profiles for public pages"
ON public.profiles
FOR SELECT
USING (true);