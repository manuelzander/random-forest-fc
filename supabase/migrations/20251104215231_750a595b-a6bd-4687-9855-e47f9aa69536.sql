-- Allow anyone to create guest records
CREATE POLICY "Anyone can create guests" 
ON public.guests
FOR INSERT
TO public
WITH CHECK (true);