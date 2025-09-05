-- Enable Row Level Security on player_stats table
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view player stats (same as players table)
CREATE POLICY "Anyone can view player stats" 
ON public.player_stats 
FOR SELECT 
USING (true);

-- Create policy to allow admins to manage player stats
CREATE POLICY "Admins can manage player stats" 
ON public.player_stats 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);