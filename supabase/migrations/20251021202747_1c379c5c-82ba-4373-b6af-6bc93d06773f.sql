-- Create guests table to track guest players and their credit
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  credit NUMERIC NOT NULL DEFAULT 0,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Admins can manage guests
CREATE POLICY "Admins can manage guests"
ON public.guests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view guests (for signup pages)
CREATE POLICY "Anyone can view guests"
ON public.guests
FOR SELECT
USING (true);

-- Add guest_id column to games_schedule_signups
ALTER TABLE public.games_schedule_signups 
ADD COLUMN guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_games_schedule_signups_guest_id ON public.games_schedule_signups(guest_id);

COMMENT ON TABLE public.guests IS 'Guest players who participate in scheduled games without accounts';
COMMENT ON COLUMN public.guests.credit IS 'Credit balance for the guest player';