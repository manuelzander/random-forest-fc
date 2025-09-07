-- Clear avatar URLs for Yi and Yaw players
UPDATE players 
SET avatar_url = NULL 
WHERE name IN ('Yi', 'Yaw');