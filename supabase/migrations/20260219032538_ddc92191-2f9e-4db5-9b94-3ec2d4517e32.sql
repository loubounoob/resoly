
-- Add IBAN field to social_challenge_members for boost recipients
ALTER TABLE public.social_challenge_members ADD COLUMN iban text DEFAULT NULL;
