-- Update existing players where created_by is null but user_id is not null
-- This handles cases where players were created before the created_by field was added
UPDATE public.players 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;