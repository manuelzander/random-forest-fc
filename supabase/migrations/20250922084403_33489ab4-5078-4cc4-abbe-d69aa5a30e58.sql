-- Update the pitch sizes for the specific games
UPDATE games_schedule 
SET pitch_size = 'small' 
WHERE id = '9c13ce6a-c4f2-47f0-941f-b82b22f98dc4'; -- 6:15 PM game

UPDATE games_schedule 
SET pitch_size = 'big' 
WHERE id = 'c9223c8a-be2f-4222-b6a7-2c5b96810961'; -- 7:00 PM game