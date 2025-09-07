-- Remove duplicate 'user' role for Henry, keep only 'admin' role
DELETE FROM user_roles 
WHERE user_id = 'c10e2b1a-2152-4ed8-ace5-35a06d453150' 
AND role = 'user';