
-- Atomic increment_coins function
CREATE OR REPLACE FUNCTION public.increment_coins(_user_id uuid, _amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.profiles SET coins = coins + _amount WHERE user_id = _user_id;
END;
$$;

-- Atomic decrement_coins function (fails if insufficient balance)
CREATE OR REPLACE FUNCTION public.decrement_coins(_user_id uuid, _amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance int;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.profiles
    SET coins = coins - _amount
    WHERE user_id = _user_id AND coins >= _amount
    RETURNING coins INTO _new_balance;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient coin balance';
  END IF;
  RETURN _new_balance;
END;
$$;

-- Deduplication table for processed coin payments (webhook idempotency)
CREATE TABLE IF NOT EXISTS public.processed_coin_payments (
  payment_intent_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  coins int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_coin_payments ENABLE ROW LEVEL SECURITY;
