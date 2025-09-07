-- Update George and Yi to admin role
UPDATE user_roles 
SET role = 'admin'::app_role 
WHERE user_id IN ('a8dba63a-1964-4904-bc86-c3ce1e13e699', 'ccc332de-453e-4b05-b9c0-d39671d8f1e9');