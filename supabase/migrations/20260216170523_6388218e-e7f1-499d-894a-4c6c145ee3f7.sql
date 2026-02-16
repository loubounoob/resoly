
-- Table to store Shopify OAuth access tokens
CREATE TABLE public.shopify_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain text NOT NULL UNIQUE,
  access_token text NOT NULL,
  scopes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopify_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role key)
-- No public policies = no public access, only service_role bypasses RLS

-- Trigger for updated_at
CREATE TRIGGER update_shopify_tokens_updated_at
BEFORE UPDATE ON public.shopify_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
