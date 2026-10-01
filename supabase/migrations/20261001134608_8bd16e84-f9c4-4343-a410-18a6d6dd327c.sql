GRANT UPDATE ON public.games_schedule_signups TO authenticated;
CREATE POLICY "Users can update their own signups and guest signups they created"
ON public.games_schedule_signups FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = games_schedule_signups.player_id AND p.user_id = auth.uid())
  OR (is_guest = true AND created_by_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = games_schedule_signups.player_id AND p.user_id = auth.uid())
  OR (is_guest = true AND created_by_user_id = auth.uid())
);