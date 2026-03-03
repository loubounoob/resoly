import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

let stripeCache: { promise: Promise<Stripe | null>; locale: string } | null = null;

export const getStripe = async (locale?: string) => {
  const stripeLocale = locale || "auto";

  // Invalidate cache if locale changed
  if (stripeCache && stripeCache.locale !== stripeLocale) {
    stripeCache = null;
  }

  if (!stripeCache) {
    const promise = (async () => {
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/get-stripe-key`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const { publishableKey } = await res.json();
      return loadStripe(publishableKey, { locale: stripeLocale as any });
    })();
    stripeCache = { promise, locale: stripeLocale };
  }

  return stripeCache.promise;
};
