-- Add claimed_by field to guests table for audit trail
ALTER TABLE public.guests ADD COLUMN claimed_by uuid REFERENCES auth.users(id);

-- Update RLS policy to allow viewing unclaimed guests
CREATE POLICY "Anyone can view unclaimed guests for claiming"
ON public.guests
FOR SELECT
TO authenticated
USING (claimed_by IS NULL OR claimed_by = auth.uid());

-- Allow users to update guests they're claiming
CREATE POLICY "Users can update guests they're claiming"
ON public.guests
FOR UPDATE
TO authenticated
USING (claimed_by IS NULL)
WITH CHECK (claimed_by = auth.uid());