-- Add user connection and avatar support to players table
ALTER TABLE public.players 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN avatar_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatar uploads
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update players RLS policy to allow users to update their claimed player
CREATE POLICY "Users can update their claimed player" 
ON public.players 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_players_user_id ON public.players(user_id);