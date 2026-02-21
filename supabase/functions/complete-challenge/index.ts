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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { challengeId } = await req.json();
    if (!challengeId) throw new Error("Missing challengeId");

    // Fetch challenge
    const { data: challenge, error: chErr } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();
    if (chErr || !challenge) throw new Error("Challenge not found");
    if (challenge.status !== "active") throw new Error("Challenge is not active");

    // Verify all sessions completed
    const { count } = await supabaseAdmin
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId)
      .eq("verified", true);
    if ((count ?? 0) < challenge.total_sessions) {
      throw new Error("Not all sessions completed");
    }

    // Calculate coins
    const getCoefficientDeMise = (I: number): number => {
      if (I <= 50) return 1 + 0.004 * I;
      if (I <= 75) return 1.2 + 0.012 * (I - 50);
      if (I <= 100) return 1.5 + 0.02 * (I - 75);
      if (I <= 300) return 2 - 0.0045 * (I - 100);
      if (I <= 1000) return 1.1 - 0.000785 * (I - 300);
      return Math.max(0, 0.55 - 0.00055 * (I - 1000));
    };
    const I = challenge.bet_per_month;
    const M = challenge.duration_months;
    const S = challenge.sessions_per_week;
    const CI = getCoefficientDeMise(I);
    const monthFactor = 0.3 + 0.6 * Math.pow(M, 1.5);
    const sessionFactor = Math.pow(S / 3, 1.1);
    const coinsToEarn = Math.round(I * CI * monthFactor * sessionFactor);

    // Stripe refund (only for personal challenges, not boost)
    let refunded = false;
    let payoutCreated = false;
    
    if (challenge.social_challenge_id) {
      // Boost challenge: create a pending payout for the recipient via IBAN
      const { data: memberRecord } = await supabaseAdmin
        .from("social_challenge_members")
        .select("iban")
        .eq("social_challenge_id", challenge.social_challenge_id)
        .eq("user_id", userId)
        .single();

      // Also check profile IBAN as fallback
      const ibanToUse = memberRecord?.iban || profile?.iban;

      if (ibanToUse) {
        const { data: sc } = await supabaseAdmin
          .from("social_challenges")
          .select("bet_amount")
          .eq("id", challenge.social_challenge_id)
          .single();

        await supabaseAdmin
          .from("pending_payouts")
          .insert({
            user_id: userId,
            challenge_id: challengeId,
            social_challenge_id: challenge.social_challenge_id,
            amount: sc?.bet_amount ?? challenge.bet_per_month * challenge.duration_months,
            iban: ibanToUse,
            status: "pending",
          });
        payoutCreated = true;
      }
    } else if (challenge.stripe_payment_intent_id) {
      // Personal challenge: refund via Stripe
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });
      await stripe.refunds.create({
        payment_intent: challenge.stripe_payment_intent_id,
      });
      refunded = true;
    }

    // Update profile coins
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("coins")
      .eq("user_id", userId)
      .single();
    await supabaseAdmin
      .from("profiles")
      .update({ coins: (profile?.coins ?? 0) + coinsToEarn })
      .eq("user_id", userId);

    // Mark challenge completed
    await supabaseAdmin
      .from("challenges")
      .update({ status: "completed", coins_awarded: coinsToEarn })
      .eq("id", challengeId);

    // Sync status update to Google Sheets
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-challenge-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          challenge_id: challengeId,
          status: "completed",
          update_only: true,
        }),
      });
    } catch (syncErr) {
      console.error("Sheet sync error:", syncErr);
    }

    return new Response(
      JSON.stringify({ success: true, refunded, payoutCreated, coinsAwarded: coinsToEarn }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
