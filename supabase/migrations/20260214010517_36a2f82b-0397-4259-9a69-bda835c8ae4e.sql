
-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sessions_per_week INTEGER NOT NULL DEFAULT 3,
  duration_months INTEGER NOT NULL DEFAULT 3,
  bet_per_month NUMERIC NOT NULL DEFAULT 50,
  odds NUMERIC NOT NULL DEFAULT 1.0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);

-- Create check_ins table
CREATE TABLE public.check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  photo_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own check_ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own check_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  value TEXT,
  emoji TEXT,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON public.rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rewards" ON public.rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewards" ON public.rewards FOR UPDATE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
