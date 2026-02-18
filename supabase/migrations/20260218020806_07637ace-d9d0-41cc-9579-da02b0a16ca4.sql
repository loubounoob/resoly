
-- 1. Attach trigger to auth.users for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill missing profiles for existing users
INSERT INTO public.profiles (user_id, display_name, username, invite_code)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  'user_' || substr(md5(random()::text), 1, 6),
  upper(substr(md5(random()::text), 1, 8))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 3. Add payment_status to social_challenge_members
ALTER TABLE public.social_challenge_members ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
