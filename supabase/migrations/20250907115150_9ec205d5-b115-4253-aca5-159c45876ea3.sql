-- Remove avatars for Yi, George and Yaw players
UPDATE players 
SET avatar_url = NULL 
WHERE name IN ('Yi', 'George', 'Yaw');