import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getPriceId = (tier: string, billingCycle: string): string => {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${billingCycle.toUpperCase()}`;
  const priceId = Deno.env.get(key);
  if (!priceId) throw new Error(`Missing env var: ${key}`);
  return priceId;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    const { tier, billingCycle = "monthly" } = await req.json();
    if (!tier || !["starter", "pro", "elite"].includes(tier)) throw new Error("Invalid tier");
    const { data: existingSub } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).single();
    let customerId: string;
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { user_id: userId } });
      customerId = customer.id;
    }
    const priceId = getPriceId(tier, billingCycle);
    if (existingSub?.stripe_subscription_id) {
      const existingStripeSub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);
      if (existingStripeSub.status === "active" || existingStripeSub.status === "trialing") {
        const updatedSub = await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
          items: [{ id: existingStripeSub.items.data[0].id, price: priceId }],
          proration_behavior: "create_prorations",
        });
        await supabaseAdmin
          .from("subscriptions")
          .update({
            tier,
            billing_cycle: billingCycle,
            current_period_end: new Date(updatedSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        await supabaseAdmin.from("profiles").update({ subscription_tier: tier }).eq("user_id", userId);
        return new Response(JSON.stringify({ success: true, action: "updated", tier }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { user_id: userId, tier, billing_cycle: billingCycle },
    });
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          tier,
          status: "active",
          billing_cycle: billingCycle,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    return new Response(
      JSON.stringify({
        success: true,
        action: "created",
        clientSecret: paymentIntent?.client_secret,
        subscriptionId: subscription.id,
        tier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
