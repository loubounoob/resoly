import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature",
};

async function resolveTierFromPrice(priceId?: string): Promise<string | null> {
  if (!priceId) return null;
  for (const tier of ["starter", "pro", "elite"]) {
    for (const cycle of ["monthly", "annual"]) {
      if (Deno.env.get(`STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`) === priceId) return tier;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const stripeSignature = req.headers.get("stripe-signature");
  if (stripeSignature) {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_SUBSCRIPTION");
    if (!webhookSecret) return new Response(JSON.stringify({ error: "Missing webhook secret" }), { status: 500 });
    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, stripeSignature, webhookSecret);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Webhook error: ${err.message}` }), { status: 400 });
    }
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        const tier = await resolveTierFromPrice(sub.items.data[0]?.price.id);
        await supabaseAdmin
          .from("subscriptions")
          .update({
            tier: tier ?? "free",
            status: sub.status === "active" ? "active" : sub.status === "canceled" ? "cancelled" : "past_due",
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        if (tier) await supabaseAdmin.from("profiles").update({ subscription_tier: tier }).eq("user_id", userId);
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from("subscriptions")
        .update({ tier: "free", status: "cancelled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);
      const userId = sub.metadata?.user_id;
      if (userId) await supabaseAdmin.from("profiles").update({ subscription_tier: "free" }).eq("user_id", userId);
    }
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription)
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription as string);
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
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
    const { action } = await req.json();
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, tier")
      .eq("user_id", userId)
      .single();
    if (!sub?.stripe_subscription_id) throw new Error("No active subscription found");
    if (action === "cancel") {
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
      await supabaseAdmin
        .from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return new Response(JSON.stringify({ success: true, action: "cancel" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    if (action === "reactivate") {
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false });
      await supabaseAdmin
        .from("subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return new Response(JSON.stringify({ success: true, action: "reactivate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
