-- Delete all avatar files for Yi, George and Yaw from storage
-- First, let's see what files exist for these players
SELECT name, path_tokens, id, name as file_name 
FROM storage.objects 
WHERE bucket_id = 'avatars' 
AND name LIKE '%avatar-7172e705-587c-4663-89f4-7f97071761f1%'  -- Yaw
OR name LIKE '%avatar-eac42daf-1030-4341-865f-c62eb227a450%'   -- George  
OR name LIKE '%avatar-f662ae2a-f1e2-4acc-bf58-f694d730c34e%';  -- Yi