import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { challengeId, socialChallengeId, memberId, amount, description, currency, locale } = await req.json();
    if (!amount) throw new Error("Missing amount");
    if (!challengeId && !socialChallengeId) throw new Error("Missing challengeId or socialChallengeId");

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
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Enrich Stripe customer with profile data
    const customerName =
      profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.display_name || undefined;
    const customerCountry = profile?.country || undefined;

    if (customerName || customerCountry) {
      await stripe.customers.update(customerId, {
        ...(customerName ? { name: customerName } : {}),
        ...(customerCountry ? { address: { country: customerCountry } } : {}),
      });
    }

    const currencyCode = (currency || "EUR").toLowerCase();

    // === ANTI-SPAM: Reuse existing pending PaymentIntent for the same challenge ===
    if (challengeId) {
      const { data: existingChallenge } = await supabaseClient
        .from("challenges")
        .select("stripe_payment_intent_id, payment_status")
        .eq("id", challengeId)
        .eq("user_id", user.id)
        .single();

      if (existingChallenge?.stripe_payment_intent_id && existingChallenge.payment_status === "pending") {
        try {
          const existingPI = await stripe.paymentIntents.retrieve(existingChallenge.stripe_payment_intent_id);
          if (existingPI.status === "requires_payment_method" || existingPI.status === "requires_confirmation") {
            const ephemeralKeyExisting = await stripe.ephemeralKeys.create(
              { customer: customerId },
              { apiVersion: "2024-06-20" },
            );
            return new Response(
              JSON.stringify({
                clientSecret: existingPI.client_secret,
                paymentIntentId: existingPI.id,
                customerId,
                ephemeralKeySecret: ephemeralKeyExisting.secret,
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              },
            );
          }
        } catch {
          // PI not found or expired, create new one
        }
      }
    }

    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: "2024-06-20" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currencyCode,
      customer: customerId,
      description: description || "Fitness Challenge",
      metadata: {
        challenge_id: challengeId || "",
        social_challenge_id: socialChallengeId || "",
        member_id: memberId || "",
        user_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        customerId,
        ephemeralKeySecret: ephemeralKey.secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
