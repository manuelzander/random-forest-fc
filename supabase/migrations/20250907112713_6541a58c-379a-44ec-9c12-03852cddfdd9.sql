-- Make Henry an admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('c10e2b1a-2152-4ed8-ace5-35a06d453150', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;