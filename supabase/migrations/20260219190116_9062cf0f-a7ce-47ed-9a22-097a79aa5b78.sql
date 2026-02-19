
-- Add referred_by column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(user_id);

-- Add referral_bonus_paid to track if 250-coin bonus was already given
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_bonus_paid boolean NOT NULL DEFAULT false;

-- Update handle_new_user trigger to handle referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _invite_code text;
  _referrer_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name, username, invite_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
      'user_' || substr(md5(random()::text), 1, 6)
    ),
    upper(substr(md5(random()::text), 1, 8))
  );

  -- Handle referral
  _invite_code := NEW.raw_user_meta_data->>'invite_code_used';
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT user_id INTO _referrer_id FROM public.profiles WHERE invite_code = upper(_invite_code) LIMIT 1;
    IF _referrer_id IS NOT NULL THEN
      -- Set referred_by on the new user's profile
      UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = NEW.id;
      -- Credit 50 coins to referrer
      UPDATE public.profiles SET coins = coins + 50 WHERE user_id = _referrer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
