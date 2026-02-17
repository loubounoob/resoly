
-- 1. Backfill random usernames for existing profiles without one
UPDATE public.profiles
SET username = 'user_' || substr(md5(random()::text), 1, 4)
WHERE username IS NULL;

-- 2. Backfill invite_code for existing profiles without one
UPDATE public.profiles
SET invite_code = upper(substr(md5(random()::text), 1, 8))
WHERE invite_code IS NULL;

-- 3. Add UNIQUE constraint on username
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- 4. Update handle_new_user trigger to generate username and invite_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
  RETURN NEW;
END;
$function$;
