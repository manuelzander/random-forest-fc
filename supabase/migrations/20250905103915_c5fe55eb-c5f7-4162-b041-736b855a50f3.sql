-- Drop the problematic policy and create a better one
DROP POLICY IF EXISTS "Users can claim unclaimed players" ON public.players;

-- Create a more flexible policy for claiming and unclaiming
CREATE POLICY "Users can claim unclaimed players or unclaim their own" 
ON public.players 
FOR UPDATE 
USING (user_id IS NULL OR auth.uid() = user_id)
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);