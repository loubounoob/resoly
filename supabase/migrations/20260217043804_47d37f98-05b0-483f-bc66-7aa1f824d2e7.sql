
-- Add username and invite_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Generate invite codes for existing profiles
UPDATE public.profiles SET invite_code = substr(md5(random()::text), 1, 8) WHERE invite_code IS NULL;

-- Update profiles RLS: allow reading other users' profiles for friend search
CREATE POLICY "Authenticated users can search profiles by username"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  photo_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- group_members table (BEFORE the function that references it)
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

CREATE POLICY "Group members can view groups"
ON public.groups FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group members can view members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Users can join groups"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- social_challenges table
CREATE TABLE public.social_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  created_by uuid NOT NULL,
  target_user_id uuid,
  group_id uuid REFERENCES public.groups(id),
  sessions_per_week integer NOT NULL DEFAULT 3,
  duration_months integer NOT NULL DEFAULT 3,
  bet_amount numeric NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_challenges ENABLE ROW LEVEL SECURITY;

-- social_challenge_members table (BEFORE the function that references it)
CREATE TABLE public.social_challenge_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_challenge_id uuid NOT NULL REFERENCES public.social_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id),
  bet_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(social_challenge_id, user_id)
);
ALTER TABLE public.social_challenge_members ENABLE ROW LEVEL SECURITY;

-- Security definer to check social challenge membership
CREATE OR REPLACE FUNCTION public.is_social_challenge_member(_user_id uuid, _challenge_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_challenge_members
    WHERE user_id = _user_id AND social_challenge_id = _challenge_id
  )
$$;

CREATE POLICY "Users can view their social challenges"
ON public.social_challenges FOR SELECT TO authenticated
USING (created_by = auth.uid() OR target_user_id = auth.uid() OR public.is_social_challenge_member(auth.uid(), id));

CREATE POLICY "Users can create social challenges"
ON public.social_challenges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their social challenges"
ON public.social_challenges FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can view social challenge members"
ON public.social_challenge_members FOR SELECT TO authenticated
USING (public.is_social_challenge_member(auth.uid(), social_challenge_id) OR user_id = auth.uid());

CREATE POLICY "Users can join social challenges"
ON public.social_challenge_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their membership"
ON public.social_challenge_members FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
