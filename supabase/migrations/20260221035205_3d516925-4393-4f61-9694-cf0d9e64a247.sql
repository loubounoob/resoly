
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
  INSERT INTO public.profiles (user_id, display_name, username, invite_code, age, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
      'user_' || substr(md5(random()::text), 1, 6)
    ),
    upper(substr(md5(random()::text), 1, 8)),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender'
  );

  _invite_code := NEW.raw_user_meta_data->>'invite_code_used';
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT user_id INTO _referrer_id FROM public.profiles WHERE invite_code = upper(_invite_code) LIMIT 1;
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = NEW.id;
      UPDATE public.profiles SET coins = coins + 50 WHERE user_id = _referrer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
