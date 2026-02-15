
-- Add coins balance to profiles
ALTER TABLE public.profiles ADD COLUMN coins integer NOT NULL DEFAULT 0;

-- Add payment tracking to challenges
ALTER TABLE public.challenges ADD COLUMN stripe_payment_intent_id text;
ALTER TABLE public.challenges ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.challenges ADD COLUMN coins_awarded integer NOT NULL DEFAULT 0;
