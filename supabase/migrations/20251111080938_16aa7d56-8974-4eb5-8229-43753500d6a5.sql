-- Create atomic guest merge function
CREATE OR REPLACE FUNCTION public.merge_guest_to_player(
  p_guest_id uuid,
  p_player_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_credit numeric;
  v_player_user_id uuid;
  v_signup_count integer;
BEGIN
  -- Verify guest exists
  IF NOT EXISTS (SELECT 1 FROM guests WHERE id = p_guest_id) THEN
    RETURN json_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Verify player exists
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Get guest credit
  SELECT credit INTO v_guest_credit FROM guests WHERE id = p_guest_id;
  
  -- Update signups (transfer from guest to player)
  UPDATE games_schedule_signups
  SET player_id = p_player_id, 
      guest_id = NULL, 
      is_guest = false, 
      guest_name = NULL
  WHERE guest_id = p_guest_id;
  
  GET DIAGNOSTICS v_signup_count = ROW_COUNT;
  
  -- Get player user_id
  SELECT user_id INTO v_player_user_id FROM players WHERE id = p_player_id;
  
  -- Transfer credit if player has profile
  IF v_player_user_id IS NOT NULL AND v_guest_credit > 0 THEN
    UPDATE profiles
    SET credit = credit + v_guest_credit
    WHERE user_id = v_player_user_id;
  END IF;
  
  -- Delete guest record
  DELETE FROM guests WHERE id = p_guest_id;
  
  RETURN json_build_object(
    'success', true, 
    'signups_transferred', v_signup_count,
    'credit_transferred', v_guest_credit
  );
END;
$$;

-- Restrict guest table RLS policies to prevent PII exposure
DROP POLICY IF EXISTS "Anyone can view guests" ON guests;

-- Authenticated users can view all guests (needed for signup lists)
CREATE POLICY "Authenticated users can view guests"
ON guests FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Keep admin policy as is (already exists)
-- Keep insert policy as is (already exists)
-- Keep update policy as is (already exists)