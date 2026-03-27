import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Coin system — mirrors src/lib/coins.ts
type SubscriptionTier = "free" | "starter" | "pro" | "elite";

const TIER_COINS_PER_SESSION: Record<SubscriptionTier, number> = {
  free: 1,
  starter: 3,
  pro: 5,
  elite: 7,
};
const TIER_MULTIPLIER: Record<SubscriptionTier, number> = {
  free: 0.05,
  starter: 1,
  pro: 2,
  elite: 3,
};
const BASE_BONUS = 300;
const VALID_PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027", "LOUBOUNOOBLEGOAT"];

const calculateMonthlyBonus = (sessionsPerWeek: number, tier: SubscriptionTier): number => {
  return Math.round(BASE_BONUS * Math.pow(sessionsPerWeek / 3, 1.1) * TIER_MULTIPLIER[tier]);
};

const getCoinsPerSession = (tier: SubscriptionTier): number => TIER_COINS_PER_SESSION[tier];

const getPromoMultiplier = (code?: string): number => {
  if (!code) return 1.0;
  return VALID_PROMO_CODES.includes(code.toUpperCase()) ? 1.5 : 1.0;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

  try {
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

    // Verify all sessions completed
    const { count } = await supabaseAdmin
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId)
      .eq("verified", true);
    if ((count ?? 0) < challenge.total_sessions) {
      throw new Error("Not all sessions completed");
    }

    // Fetch profile (subscription tier, country, coins)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("coins, country, subscription_tier, streak_months")
      .eq("user_id", userId)
      .single();

    const tier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) ?? "free";
    const sessionsPerWeek: number = challenge.sessions_per_week ?? 3;
    const completedSessions: number = count ?? 0;

    // Calculate coins
    const coinsPerSession = getCoinsPerSession(tier);
    const promoMult = getPromoMultiplier(challenge.promo_code ?? undefined);
    const sessionCoinsEarned = Math.round(completedSessions * coinsPerSession * promoMult);
    const bonusCoins = Math.round(calculateMonthlyBonus(sessionsPerWeek, tier) * promoMult);
    const totalCoinsToAward = sessionCoinsEarned + bonusCoins;

    // === ATOMIC UPDATE: mark completed WHERE status = 'active' ===
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("challenges")
      .update({
        status: "completed",
        coins_awarded: totalCoinsToAward,
        session_coins_earned: sessionCoinsEarned,
      })
      .eq("id", challengeId)
      .eq("user_id", userId)
      .eq("status", "active")
      .select("id");

    if (updateErr) throw updateErr;
    if (!updated || updated.length === 0) {
      return new Response(JSON.stringify({ success: true, already_completed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // === CREDIT COINS ===
    await supabaseAdmin.rpc("increment_coins", { _user_id: userId, _amount: totalCoinsToAward });

    // === Record coin transaction ===
    await supabaseAdmin
      .from("coin_transactions")
      .insert({
        user_id: userId,
        amount: totalCoinsToAward,
        transaction_type: "monthly_bonus",
        challenge_id: challengeId,
        description: `Challenge completed: ${sessionCoinsEarned} session coins + ${bonusCoins} bonus`,
      })
      .then(() => {})
      .catch(console.error);

    // === Update streak_months ===
    const newStreak = (profile?.streak_months ?? 0) + 1;
    await supabaseAdmin.from("profiles").update({ streak_months: newStreak }).eq("user_id", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // === Sync to Google Sheets (non-blocking) ===
    fetch(`${supabaseUrl}/functions/v1/sync-challenge-sheet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        status: "completed",
        update_only: true,
      }),
    }).catch(console.error);

    // === Schedule auto-renewal (non-blocking) ===
    fetch(`${supabaseUrl}/functions/v1/auto-renew-challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ challengeId, userId, reason: "completed" }),
    }).catch(console.error);

    // === Send victory notification ===
    const userLocale = countryToLocale(profile?.country);
    const isBoosted = !!challenge.social_challenge_id;

    try {
      const notifTitle =
        userLocale === "fr"
          ? "Challenge terminé ! 🏆"
          : userLocale === "de"
            ? "Challenge abgeschlossen! 🏆"
            : "Challenge complete! 🏆";
      const notifBody =
        userLocale === "fr"
          ? `Tu as gagné ${totalCoinsToAward} coins ce mois-ci 🪙`
          : userLocale === "de"
            ? `Du hast ${totalCoinsToAward} Münzen diesen Monat verdient 🪙`
            : `You earned ${totalCoinsToAward} coins this month 🪙`;

      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: userId,
          type: "challenge_completed",
          title: notifTitle,
          body: notifBody,
          data: {
            challenge_id: challengeId,
            coins: totalCoinsToAward,
            bonus_coins: bonusCoins,
            route: "/dashboard",
          },
        }),
      });

      if (isBoosted) {
        const { data: sc } = await supabaseAdmin
          .from("social_challenges")
          .select("created_by")
          .eq("id", challenge.social_challenge_id)
          .single();

        if (sc?.created_by) {
          const { data: playerProfile } = await supabaseAdmin
            .from("profiles")
            .select("username")
            .eq("user_id", userId)
            .single();
          const { data: creatorProfile } = await supabaseAdmin
            .from("profiles")
            .select("country")
            .eq("user_id", sc.created_by)
            .single();
          const creatorLocale = countryToLocale(creatorProfile?.country);
          const playerName = playerProfile?.username
            ? `@${playerProfile.username}`
            : creatorLocale === "fr"
              ? "Ton ami"
              : creatorLocale === "de"
                ? "Dein Freund"
                : "Your friend";

          const creatorTitle =
            creatorLocale === "fr"
              ? `${playerName} a terminé son challenge ! 🎉`
              : creatorLocale === "de"
                ? `${playerName} hat die Challenge abgeschlossen! 🎉`
                : `${playerName} completed the challenge! 🎉`;

          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              user_id: sc.created_by,
              type: "boost_completed",
              title: creatorTitle,
              body: "",
              data: { challenge_id: challengeId, route: "/friends" },
            }),
          });
        }
      }
    } catch (notifErr) {
      console.error("Victory notification error (non-blocking):", notifErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        coinsAwarded: totalCoinsToAward,
        sessionCoins: sessionCoinsEarned,
        bonusCoins,
        streakMonths: newStreak,
        isBoosted,
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
