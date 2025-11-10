-- Fix 1: Remove public access to profiles table with emails and personal info
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view public profile information" ON public.profiles;

-- Users can only view their own full profile
-- (This policy already exists: "Authenticated users can view their own profile")

-- Admins can view all profiles
-- (This policy already exists: "Admins can view all profiles")

-- Add a new limited policy for public profile views (only safe fields)
-- If you need public profiles in the future, create a separate public_profiles table
-- For now, profiles are private except to owners and admins