import { loadStripe } from "@stripe/stripe-js";

// Fetch the publishable key from edge function (stored as secret)
let stripePromise: ReturnType<typeof loadStripe> | null = null;

export const getStripe = async () => {
  if (!stripePromise) {
    // Fetch publishable key from edge function
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
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};
