CREATE OR REPLACE FUNCTION public.merge_guest_to_player(p_guest_id uuid, p_player_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_guest_credit numeric;
  v_guest_name text;
  v_player_user_id uuid;
  v_signup_count integer;
BEGIN
  -- Verify guest exists and get guest info
  SELECT credit, name INTO v_guest_credit, v_guest_name 
  FROM guests WHERE id = p_guest_id;
  
  IF v_guest_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Verify player exists
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;
  
  -- Update signups: transfer by guest_id OR by normalized guest_name (for orphaned signups)
  UPDATE games_schedule_signups
  SET player_id = p_player_id, 
      guest_id = NULL, 
      is_guest = false, 
      guest_name = NULL
  WHERE guest_id = p_guest_id
     OR (guest_id IS NULL 
         AND guest_name IS NOT NULL 
         AND lower(regexp_replace(guest_name, '[^a-zA-Z0-9]', '', 'g')) = 
             lower(regexp_replace(v_guest_name, '[^a-zA-Z0-9]', '', 'g')));
  
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
$function$;