import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { paymentIntentId, sessionId } = await req.json();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let meta: any;
    let isPaid = false;
    let piId: string;

    if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      isPaid = pi.status === "succeeded";
      meta = pi.metadata;
      piId = pi.id;
    } else if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      isPaid = session.payment_status === "paid";
      meta = session.metadata;
      piId = session.payment_intent as string;
    } else {
      throw new Error("Missing paymentIntentId or sessionId");
    }

    if (!isPaid) {
      return new Response(JSON.stringify({ success: false, status: "not_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (meta?.type !== "coin_purchase" || meta?.user_id !== user.id) {
      throw new Error("Invalid metadata");
    }

    const coinsToAdd = parseInt(meta.coins, 10);
    if (!coinsToAdd || coinsToAdd <= 0) throw new Error("Invalid coin amount");

    // === DEDUPLICATION: prevent double credit ===
    const { error: dedupError } = await supabaseAdmin
      .from("processed_coin_payments")
      .insert({ payment_intent_id: piId, user_id: user.id, coins: coinsToAdd });

    if (dedupError) {
      // Unique constraint violation = already processed
      if (dedupError.code === "23505") {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("coins")
          .eq("user_id", user.id)
          .single();
        return new Response(JSON.stringify({
          success: true,
          alreadyProcessed: true,
          coinsAdded: 0,
          newBalance: profile?.coins ?? 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw dedupError;
    }

    // === ATOMIC coin increment ===
    await supabaseAdmin.rpc('increment_coins', { _user_id: user.id, _amount: coinsToAdd });

    const { data: updatedProfile } = await supabaseAdmin
      .from("profiles")
      .select("coins")
      .eq("user_id", user.id)
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      coinsAdded: coinsToAdd,
      newBalance: updatedProfile?.coins ?? 0,
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
