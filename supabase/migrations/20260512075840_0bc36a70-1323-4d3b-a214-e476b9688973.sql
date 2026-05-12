-- coin_gifts table
CREATE TABLE public.coin_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 5),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or recipient can view gift"
ON public.coin_gifts FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Atomic gift function
CREATE OR REPLACE FUNCTION public.send_coin_gift(
  _recipient_id UUID,
  _amount INTEGER,
  _message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender UUID := auth.uid();
  _gift_id UUID;
  _is_friend BOOLEAN;
BEGIN
  IF _sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _sender = _recipient_id THEN
    RAISE EXCEPTION 'Cannot gift coins to yourself';
  END IF;
  IF _amount < 5 THEN
    RAISE EXCEPTION 'Minimum gift is 5 coins';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((user_id = _sender AND friend_id = _recipient_id)
        OR (user_id = _recipient_id AND friend_id = _sender))
  ) INTO _is_friend;

  IF NOT _is_friend THEN
    RAISE EXCEPTION 'Recipient is not a friend';
  END IF;

  -- Atomic deduction (will raise if insufficient)
  UPDATE public.profiles
    SET coins = coins - _amount
    WHERE user_id = _sender AND coins >= _amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient coin balance';
  END IF;

  UPDATE public.profiles
    SET coins = coins + _amount
    WHERE user_id = _recipient_id;

  INSERT INTO public.coin_gifts (sender_id, recipient_id, amount, message)
  VALUES (_sender, _recipient_id, _amount, NULLIF(TRIM(_message), ''))
  RETURNING id INTO _gift_id;

  -- Audit trail in coin_transactions
  INSERT INTO public.coin_transactions (user_id, amount, transaction_type, description)
  VALUES
    (_sender, -_amount, 'gift_sent', 'Gift to friend'),
    (_recipient_id, _amount, 'gift_received', 'Gift from friend');

  RETURN _gift_id;
END;
$$;