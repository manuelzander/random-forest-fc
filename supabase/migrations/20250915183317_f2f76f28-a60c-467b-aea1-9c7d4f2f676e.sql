-- Create games_schedule table
CREATE TABLE public.games_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create games_schedule_signups table to track player signups
CREATE TABLE public.games_schedule_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_schedule_id UUID NOT NULL,
  player_id UUID NOT NULL,
  signed_up_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (game_schedule_id) REFERENCES public.games_schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  UNIQUE(game_schedule_id, player_id) -- Prevent duplicate signups
);

-- Enable Row Level Security
ALTER TABLE public.games_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games_schedule_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games_schedule
CREATE POLICY "Anyone can view scheduled games" 
ON public.games_schedule 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage scheduled games" 
ON public.games_schedule 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for games_schedule_signups  
CREATE POLICY "Anyone can view signups for scheduled games" 
ON public.games_schedule_signups 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can signup for scheduled games" 
ON public.games_schedule_signups 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage signups" 
ON public.games_schedule_signups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can remove their own signups" 
ON public.games_schedule_signups 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE id = player_id AND user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_games_schedule_updated_at
BEFORE UPDATE ON public.games_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_games_schedule_scheduled_at ON public.games_schedule(scheduled_at);
CREATE INDEX idx_games_schedule_signups_game_id ON public.games_schedule_signups(game_schedule_id);
CREATE INDEX idx_games_schedule_signups_player_id ON public.games_schedule_signups(player_id);