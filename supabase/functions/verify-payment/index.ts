import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const body = await req.json();

    // Detect if this is a Stripe webhook call (has "type" and "data" fields)
    const isWebhook = body.type && body.data?.object;

    let session: any;
    let userId: string;
    let challengeId: string | null = null;
    let socialChallengeId: string | null = null;
    let memberId: string | null = null;

    if (isWebhook) {
      // --- STRIPE WEBHOOK PATH ---
      console.log("Webhook event received:", body.type);

      if (body.type !== "checkout.session.completed") {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      session = body.data.object;

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ received: true, status: session.payment_status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Extract info from session metadata
      const meta = session.metadata || {};
      userId = meta.user_id;
      challengeId = meta.challenge_id || null;
      socialChallengeId = meta.social_challenge_id || null;
      memberId = meta.member_id || null;

      if (!userId) {
        console.error("No user_id in session metadata");
        return new Response(JSON.stringify({ received: true, error: "No user_id in metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Handle coin purchases via webhook
      if (meta.type === "coin_purchase") {
        const coinsToAdd = parseInt(meta.coins, 10);
        if (coinsToAdd && coinsToAdd > 0) {
          const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("coins")
            .eq("user_id", userId)
            .single();

          if (existing) {
            await supabaseAdmin
              .from("profiles")
              .update({ coins: existing.coins + coinsToAdd })
              .eq("user_id", userId);
            console.log(`Webhook: credited ${coinsToAdd} coins to user ${userId}`);
          }
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      // --- FRONTEND CALL PATH ---
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      if (!user) throw new Error("User not authenticated");
      userId = user.id;

      const { sessionId } = body;
      challengeId = body.challengeId || null;
      socialChallengeId = body.socialChallengeId || null;
      memberId = body.memberId || null;

      if (!sessionId) throw new Error("Missing sessionId");

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // --- SHARED LOGIC: process the paid session ---

    // Handle regular challenge
    if (challengeId) {
      const { error } = await supabaseAdmin
        .from("challenges")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: (session.payment_intent as string) || null,
        })
        .eq("id", challengeId)
        .eq("user_id", userId);
      if (error) throw error;

      // Sync to Google Sheets
      try {
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .select("*")
          .eq("id", challengeId)
          .single();
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("username, age, gender")
          .eq("user_id", userId)
          .single();

        // Get user email
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email || "";

        if (challenge && profile) {
          const I = challenge.bet_per_month * challenge.duration_months;
          const M = challenge.duration_months;
          const S = challenge.sessions_per_week;
          const getCoefficientDeMise = (i: number): number => {
            if (i <= 50) return 1 + 0.004 * i;
            if (i <= 75) return 1.2 + 0.012 * (i - 50);
            if (i <= 100) return 1.5 + 0.02 * (i - 75);
            if (i <= 300) return 2 - 0.0045 * (i - 100);
            if (i <= 860) return 1.1 - 0.000785 * (i - 300);
            if (i <= 1000) return 0.6604 - 0.0005 * (i - 860);
            return Math.max(0.15, 0.59 - 0.00009 * (i - 1000));
          };
          const CI = getCoefficientDeMise(I);
          const monthFactor = 0.3 + 0.6 * Math.pow(M, 1.5);
          const sessionFactor = Math.pow(S / 3, 1.1);
          const estimatedCoins = Math.round(I * CI * monthFactor * sessionFactor);
          const endDate = new Date(challenge.created_at);
          endDate.setMonth(endDate.getMonth() + challenge.duration_months);

          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-challenge-sheet`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              challenge_id: challengeId,
              username: profile.username,
              age: profile.age,
              gender: profile.gender,
              email: userEmail,
              type: challenge.social_challenge_id ? "social" : "perso",
              mise_totale: challenge.bet_per_month * challenge.duration_months,
              mise_par_mois: challenge.bet_per_month,
              sessions_per_week: challenge.sessions_per_week,
              duration_months: challenge.duration_months,
              total_sessions: challenge.total_sessions,
              estimated_coins: estimatedCoins,
              status: "active",
              created_at: challenge.created_at,
              estimated_end_date: endDate.toISOString(),
              stripe_payment_intent_id: session.payment_intent,
              promo_code: "",
            }),
          });
        }
      } catch (syncErr) {
        console.error("Sheet sync error:", syncErr);
      }

      // Referral bonus
      const { data: challengeForReferral } = await supabaseAdmin
        .from("challenges")
        .select("bet_per_month")
        .eq("id", challengeId)
        .single();

      if (challengeForReferral && challengeForReferral.bet_per_month >= 50) {
        const { data: profileRef } = await supabaseAdmin
          .from("profiles")
          .select("referred_by, referral_bonus_paid")
          .eq("user_id", userId)
          .single();

        if (profileRef?.referred_by && !profileRef.referral_bonus_paid) {
          const { data: currentUserProfile } = await supabaseAdmin
            .from("profiles")
            .select("username")
            .eq("user_id", userId)
            .single();

          const { data: referrerProfile } = await supabaseAdmin
            .from("profiles")
            .select("country")
            .eq("user_id", profileRef.referred_by)
            .single();
          const referrerLocale = countryToLocale(referrerProfile?.country);

          const referredName = currentUserProfile?.username ? `@${currentUserProfile.username}` : (referrerLocale === 'fr' ? "ton filleul" : referrerLocale === 'de' ? "dein Empfohlener" : "your referral");
          const rewardCoins = 250;
          const notif = getNotifText(referrerLocale, 'referral_reward', referredName, rewardCoins);

          const { error: notifError } = await supabaseAdmin.functions.invoke("send-notification", {
            body: {
              user_id: profileRef.referred_by,
              type: "referral_reward",
              title: notif.title,
              body: notif.body,
              data: {
                coins: rewardCoins,
                referred_user_id: userId,
                reward_type: "referral_challenge_success",
                claimed: false,
              },
            },
          });

          if (!notifError) {
            await supabaseAdmin
              .from("profiles")
              .update({ referral_bonus_paid: true })
              .eq("user_id", userId);
          }
        }
      }
    }

    // Handle social challenge member payment
    if (socialChallengeId && memberId) {
      const { error } = await supabaseAdmin
        .from("social_challenge_members")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: (session.payment_intent as string) || null,
        })
        .eq("id", memberId)
        .eq("user_id", userId);
      if (error) throw error;

      // Notify target user for boost challenges
      try {
        const { data: sc } = await supabaseAdmin
          .from("social_challenges")
          .select("target_user_id, created_by, bet_amount, sessions_per_week, duration_months, type")
          .eq("id", socialChallengeId)
          .single();
        if (sc && sc.type === "boost" && sc.target_user_id) {
          const { data: creatorProfile } = await supabaseAdmin
            .from("profiles")
            .select("username")
            .eq("user_id", sc.created_by)
            .single();
          const { data: targetProfile } = await supabaseAdmin
            .from("profiles")
            .select("country")
            .eq("user_id", sc.target_user_id)
            .single();
          const targetLocale = countryToLocale(targetProfile?.country);
          const username = creatorProfile?.username || "Someone";
          const notif = getNotifText(targetLocale, 'social_challenge', username, sc.bet_amount, sc.sessions_per_week, sc.duration_months);

          await supabaseAdmin.functions.invoke("send-notification", {
            body: {
              user_id: sc.target_user_id,
              type: "social_challenge",
              title: notif.title,
              body: notif.body,
              data: { socialChallengeId },
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify target:", notifErr);
      }

      // For boost challenges, DON'T activate here
      const { data: scType } = await supabaseAdmin
        .from("social_challenges")
        .select("type")
        .eq("id", socialChallengeId)
        .single();

      if (scType?.type !== "boost") {
        const { data: members } = await supabaseAdmin
          .from("social_challenge_members")
          .select("payment_status")
          .eq("social_challenge_id", socialChallengeId);

        if (members && members.length > 0 && members.every((m: any) => m.payment_status === "paid")) {
          await supabaseAdmin
            .from("social_challenges")
            .update({ status: "active" })
            .eq("id", socialChallengeId);

          const { data: sc } = await supabaseAdmin
            .from("social_challenges")
            .select("*")
            .eq("id", socialChallengeId)
            .single();

          if (sc) {
            const allMembers = await supabaseAdmin
              .from("social_challenge_members")
              .select("id, user_id, bet_amount")
              .eq("social_challenge_id", socialChallengeId);

            const totalSessions = sc.sessions_per_week * sc.duration_months * 4;
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daysLeft = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;
            const firstWeekSessions = Math.min(
              Math.floor((sc.sessions_per_week / 7) * daysLeft),
              sc.sessions_per_week
            );

            for (const member of (allMembers.data ?? [])) {
              const { data: inserted } = await supabaseAdmin
                .from("challenges")
                .insert({
                  user_id: member.user_id,
                  sessions_per_week: sc.sessions_per_week,
                  duration_months: sc.duration_months,
                  bet_per_month: member.bet_amount,
                  total_sessions: totalSessions,
                  status: "active",
                  payment_status: "paid",
                  social_challenge_id: socialChallengeId,
                  first_week_sessions: firstWeekSessions > 0 ? firstWeekSessions : 1,
                })
                .select("id")
                .single();

              if (inserted) {
                await supabaseAdmin
                  .from("social_challenge_members")
                  .update({ challenge_id: inserted.id })
                  .eq("id", member.id);
              }
            }
          }
        }
      }
    }

    // Return appropriate response
    if (isWebhook) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true, status: "paid" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    // For webhooks, always return 200 to prevent retries on known errors
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
