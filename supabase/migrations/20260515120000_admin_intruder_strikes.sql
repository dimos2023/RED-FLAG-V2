-- Tracks unauthorized admin-login attempts (wrong Google account).
-- Second attempt sets permanently_blocked_at; middleware enforces site-wide block.

CREATE TABLE public.admin_intruder_strikes (
  email_normalized text PRIMARY KEY,
  last_auth_user_id uuid,
  strike_count integer NOT NULL DEFAULT 0,
  permanently_blocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_intruder_strikes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_intruder_strikes FROM PUBLIC;
GRANT SELECT ON public.admin_intruder_strikes TO authenticated;

CREATE POLICY admin_intruder_strikes_select_own
  ON public.admin_intruder_strikes
  FOR SELECT
  TO authenticated
  USING (
    email_normalized = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );

CREATE OR REPLACE FUNCTION public.record_admin_unauthorized_attempt()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_allowed constant text := 'ahmedashry.hh@gmail.com';
  v_strike integer;
  v_blocked_at timestamptz;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object(
      'error', 'no_email',
      'strike_count', 0,
      'permanently_blocked', false
    );
  END IF;
  IF v_email = v_allowed THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'strike_count', 0,
      'permanently_blocked', false
    );
  END IF;
  INSERT INTO public.admin_intruder_strikes (
    email_normalized,
    last_auth_user_id,
    strike_count,
    updated_at
  )
  VALUES (v_email, auth.uid(), 1, now())
  ON CONFLICT (email_normalized) DO UPDATE SET
    strike_count = public.admin_intruder_strikes.strike_count + 1,
    last_auth_user_id = excluded.last_auth_user_id,
    updated_at = now(),
    permanently_blocked_at = CASE
      WHEN public.admin_intruder_strikes.strike_count + 1 >= 2
      THEN coalesce(
        public.admin_intruder_strikes.permanently_blocked_at,
        now()
      )
      ELSE public.admin_intruder_strikes.permanently_blocked_at
    END
  RETURNING strike_count, permanently_blocked_at
    INTO v_strike, v_blocked_at;
  RETURN jsonb_build_object(
    'strike_count', v_strike,
    'permanently_blocked', v_blocked_at IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_admin_unauthorized_attempt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_admin_unauthorized_attempt() TO authenticated;
