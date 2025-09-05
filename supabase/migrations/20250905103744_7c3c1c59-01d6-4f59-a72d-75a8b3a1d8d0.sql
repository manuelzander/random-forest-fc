-- Add policy to allow users to claim unclaimed players
CREATE POLICY "Users can claim unclaimed players" 
ON public.players 
FOR UPDATE 
USING (user_id IS NULL)
WITH CHECK (auth.uid() = user_id);