-- Add created_by field to track who originally created the player
ALTER TABLE public.players 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Set created_by to user_id for existing players where user_id is not null
UPDATE public.players 
SET created_by = user_id 
WHERE user_id IS NOT NULL;

-- Update RLS policies to allow users to delete only players they created
DROP POLICY IF EXISTS "Users can delete their created players" ON public.players;
CREATE POLICY "Users can delete their created players" 
ON public.players 
FOR DELETE 
USING (auth.uid() = created_by);