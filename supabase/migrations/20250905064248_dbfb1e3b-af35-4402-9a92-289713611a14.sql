-- Fix players UPDATE RLS policy to prevent ownership transfer (add WITH CHECK)
DROP POLICY IF EXISTS "Users can update their claimed player" ON public.players;

CREATE POLICY "Users can update their claimed player" 
ON public.players 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);