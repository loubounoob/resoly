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

    const { pack, currency } = await req.json();
    const packInfo = PACKS[String(pack)];
    if (!packInfo) throw new Error("Invalid pack");

    const currencyCode = (currency || 'EUR').toLowerCase();

    // Fetch user profile for Stripe customer enrichment
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, first_name, last_name, country")
      .eq("user_id", user.id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Enrich Stripe customer with profile data
    const customerName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.display_name || undefined;
    const customerCountry = profile?.country || undefined;

    if (customerName || customerCountry) {
      await stripe.customers.update(customerId, {
        ...(customerName ? { name: customerName } : {}),
        ...(customerCountry ? { address: { country: customerCountry } } : {}),
      });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2025-08-27.basil" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: packInfo.amount,
      currency: currencyCode,
      customer: customerId,
      description: `${packInfo.label} coins`,
      metadata: {
        type: "coin_purchase",
        coins: String(packInfo.coins),
        user_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId,
      ephemeralKeySecret: ephemeralKey.secret,
    }), {
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
