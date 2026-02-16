
CREATE TABLE public.coin_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_title TEXT NOT NULL,
  variant_title TEXT,
  variant_id TEXT NOT NULL,
  selected_options JSONB DEFAULT '[]'::jsonb,
  coins_spent INTEGER NOT NULL,
  price_amount NUMERIC,
  price_currency TEXT DEFAULT 'EUR',
  shipping_first_name TEXT,
  shipping_last_name TEXT,
  shipping_address1 TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_zip TEXT,
  shipping_country TEXT DEFAULT 'FR',
  shipping_phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coin orders"
ON public.coin_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coin orders"
ON public.coin_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);
