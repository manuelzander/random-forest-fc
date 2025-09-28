-- Reset Manzan's avatar to the one from before yesterday evening
UPDATE players 
SET avatar_url = 'https://prnauaeqflapasesrnen.supabase.co/storage/v1/object/public/avatars/27b5f1dc-66eb-42ab-9563-cba9ee88d66c/avatar-1757259452778.jpg',
    updated_at = now()
WHERE id = '22533f77-6d8a-4a81-afce-124fbf1f8b57' AND name = 'manzan';