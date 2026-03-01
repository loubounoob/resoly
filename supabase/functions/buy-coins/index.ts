import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PACKS: Record<string, { amount: number; coins: number; label: string }> = {
  "10": { amount: 1000, coins: 500, label: "500" },
  "20": { amount: 2000, coins: 1000, label: "1000" },
  "50": { amount: 5000, coins: 2500, label: "2500" },
  "100": { amount: 10000, coins: 5000, label: "5000" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { pack, currency, locale } = await req.json();
    const packInfo = PACKS[String(pack)];
    if (!packInfo) throw new Error("Invalid pack");

    const currencyCode = (currency || 'EUR').toLowerCase();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      locale: locale || 'auto',
      line_items: [
        {
          price_data: {
            currency: currencyCode,
            product_data: { name: `${packInfo.label} coins` },
            unit_amount: packInfo.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        type: "coin_purchase",
        coins: String(packInfo.coins),
        user_id: user.id,
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=coins`,
      cancel_url: `${req.headers.get("origin")}/dashboard`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
