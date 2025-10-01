-- Add credit column to profiles table to track player credits
ALTER TABLE public.profiles
ADD COLUMN credit numeric DEFAULT 0 NOT NULL;

-- Add a check constraint to ensure credit is non-negative
ALTER TABLE public.profiles
ADD CONSTRAINT credit_non_negative CHECK (credit >= 0);