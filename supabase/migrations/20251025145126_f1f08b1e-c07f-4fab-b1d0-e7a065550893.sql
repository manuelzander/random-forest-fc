-- Add case-insensitive unique constraint to guests.name to prevent duplicate guest names
-- This prevents future issues like "Jeezy (Alex+1)" and "Jeezy (Alex +1)" being created as separate guests

-- First, create a unique index on LOWER(name) to enforce case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS guests_name_unique_lower_idx ON public.guests (LOWER(name));

-- Add a comment to document the constraint
COMMENT ON INDEX public.guests_name_unique_lower_idx IS 'Ensures guest names are unique in a case-insensitive manner to prevent duplicates';