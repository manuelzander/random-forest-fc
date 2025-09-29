-- Set Manzan's avatar to the specified AI-generated avatar
UPDATE players 
SET avatar_url = 'https://prnauaeqflapasesrnen.supabase.co/storage/v1/object/public/avatars/default/avatar-22533f77-6d8a-4a81-afce-124fbf1f8b57-1757259465877.png',
    updated_at = now()
WHERE id = '22533f77-6d8a-4a81-afce-124fbf1f8b57' AND name = 'manzan';