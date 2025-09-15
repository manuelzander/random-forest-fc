-- Fix RLS policy for players table to allow admins to create guest players
DROP POLICY IF EXISTS "Authenticated users can create players" ON public.players;

-- Create updated policy that allows admins to create guest players
CREATE POLICY "Users can create their own players or admins can create guest players" 
ON public.players 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
);