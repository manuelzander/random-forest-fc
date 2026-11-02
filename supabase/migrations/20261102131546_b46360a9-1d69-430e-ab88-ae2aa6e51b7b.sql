CREATE OR REPLACE FUNCTION public.find_or_create_guest(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_name text := btrim(p_name); v_id uuid;
BEGIN
  IF v_name IS NULL OR length(v_name) = 0 OR length(v_name) > 50 THEN
    RAISE EXCEPTION 'Invalid guest name';
  END IF;
  SELECT id INTO v_id FROM guests
  WHERE claimed_by IS NULL
    AND lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'))
  ORDER BY created_at ASC LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO guests (name) VALUES (v_name) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.find_or_create_guest(text) TO anon, authenticated;