-- Add INSERT policy to allow authenticated users to create players
CREATE POLICY "Authenticated users can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);