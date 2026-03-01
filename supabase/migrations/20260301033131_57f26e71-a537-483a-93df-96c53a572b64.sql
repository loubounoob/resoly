
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invite_code text;
  _referrer_id uuid;
  _new_username text;
  _referrer_country text;
  _notif_title text;
  _notif_body text;
BEGIN
  _new_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'user_' || substr(md5(random()::text), 1, 6)
  );

  INSERT INTO public.profiles (user_id, display_name, username, invite_code, age, gender, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    _new_username,
    upper(substr(md5(random()::text), 1, 8)),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender',
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''), 'FR')
  );

  _invite_code := NEW.raw_user_meta_data->>'invite_code_used';
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT user_id INTO _referrer_id FROM public.profiles WHERE invite_code = upper(_invite_code) LIMIT 1;
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = NEW.id;

      -- Get referrer country for i18n
      SELECT country INTO _referrer_country FROM public.profiles WHERE user_id = _referrer_id;

      -- Choose language based on country
      IF upper(COALESCE(_referrer_country, 'FR')) IN ('DE', 'CH') THEN
        _notif_title := 'Neue Empfehlung! 🎉';
        _notif_body := '@' || _new_username || ' hat sich dank dir angemeldet. Hol dir deine 50 Münzen!';
      ELSIF upper(COALESCE(_referrer_country, 'FR')) = 'FR' THEN
        _notif_title := 'Nouveau filleul ! 🎉';
        _notif_body := '@' || _new_username || ' s''est inscrit grâce à toi. Récupère tes 50 pièces !';
      ELSE
        _notif_title := 'New referral! 🎉';
        _notif_body := '@' || _new_username || ' signed up thanks to you. Claim your 50 coins!';
      END IF;

      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        _referrer_id,
        'referral_reward',
        _notif_title,
        _notif_body,
        jsonb_build_object(
          'coins', 50,
          'referred_user_id', NEW.id::text,
          'reward_type', 'referral_signup',
          'claimed', false
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
