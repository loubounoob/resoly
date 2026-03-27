import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SubscriptionTier = "free" | "starter" | "pro" | "elite";
const TIER_COINS_PER_SESSION: Record<SubscriptionTier, number> = { free: 1, starter: 3, pro: 5, elite: 7 };
const VALID_PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027", "LOUBOUNOOBLEGOAT"];
const getPromoMultiplier = (code?: string): number => {
  if (!code) return 1.0;
  return VALID_PROMO_CODES.includes(code.toUpperCase()) ? 1.5 : 1.0;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
    const { challengeId, checkInId } = await req.json();
    if (!challengeId || !checkInId) throw new Error("Missing challengeId or checkInId");
    const { data: checkIn, error: ciErr } = await supabaseAdmin
      .from("check_ins")
      .select("*")
      .eq("id", checkInId)
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .eq("verified", true)
      .single();
    if (ciErr || !checkIn) throw new Error("Check-in not found or not verified");
    if ((checkIn as any).coins_awarded)
      return new Response(JSON.stringify({ success: true, already_rewarded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", userId)
      .single();
    const { data: challenge } = await supabaseAdmin
      .from("challenges")
      .select("promo_code")
      .eq("id", challengeId)
      .single();
    const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
    const coinsToAward = Math.round(
      TIER_COINS_PER_SESSION[tier] * getPromoMultiplier(challenge?.promo_code ?? undefined),
    );
    const { data: updatedCi, error: updateErr } = await supabaseAdmin
      .from("check_ins")
      .update({ coins_awarded: coinsToAward })
      .eq("id", checkInId)
      .is("coins_awarded", null)
      .select("id");
    if (updateErr) throw updateErr;
    if (!updatedCi || updatedCi.length === 0)
      return new Response(JSON.stringify({ success: true, already_rewarded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    await supabaseAdmin.rpc("increment_coins", { _user_id: userId, _amount: coinsToAward });
    await supabaseAdmin
      .from("coin_transactions")
      .insert({
        user_id: userId,
        amount: coinsToAward,
        transaction_type: "session_reward",
        challenge_id: challengeId,
        description: `Session validated (${tier})`,
      })
      .catch(console.error);
    return new Response(JSON.stringify({ success: true, coinsAwarded: coinsToAward, tier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
