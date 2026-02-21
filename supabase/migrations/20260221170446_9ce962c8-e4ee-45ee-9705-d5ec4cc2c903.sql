
-- Add stripe_payment_intent_id to social_challenge_members
ALTER TABLE public.social_challenge_members
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Add iban to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iban text;

-- Create pending_payouts table
CREATE TABLE IF NOT EXISTS public.pending_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  social_challenge_id uuid NOT NULL,
  amount numeric NOT NULL,
  iban text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts"
  ON public.pending_payouts FOR SELECT
  USING (auth.uid() = user_id);
