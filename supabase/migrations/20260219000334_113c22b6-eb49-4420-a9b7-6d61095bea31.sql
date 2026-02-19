
-- Unique partial index: only one active+paid challenge per user
CREATE UNIQUE INDEX idx_one_active_challenge_per_user
ON public.challenges (user_id)
WHERE status = 'active' AND payment_status = 'paid';
