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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { sessionId, challengeId, socialChallengeId, memberId } = await req.json();
    if (!sessionId) throw new Error("Missing sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      // Handle regular challenge
      if (challengeId) {
        const { error } = await supabaseAdmin
          .from("challenges")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", challengeId)
          .eq("user_id", user.id);
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
            .eq("user_id", user.id)
            .single();
          if (challenge && profile) {
            const I = challenge.bet_per_month;
            const S = challenge.sessions_per_week;
            const getCoefficientDeMise = (i: number): number => {
              if (i <= 50) return 1 + 0.004 * i;
              if (i <= 75) return 1.2 + 0.012 * (i - 50);
              if (i <= 100) return 1.5 + 0.02 * (i - 75);
              if (i <= 300) return 2 - 0.0045 * (i - 100);
              if (i <= 1000) return 1.1 - 0.000785 * (i - 300);
              return Math.max(0, 0.55 - 0.00055 * (i - 1000));
            };
            const CI = getCoefficientDeMise(I);
            const sessionFactor = Math.pow(S / 3, 1.1);
            const estimatedCoins = Math.round(I * CI * sessionFactor);
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
                email: user.email,
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

        // Referral bonus: if bet >= 50€ and user was referred, queue a claimable reward notification
        const { data: challengeForReferral } = await supabaseAdmin
          .from("challenges")
          .select("bet_per_month")
          .eq("id", challengeId)
          .single();

        if (challengeForReferral && challengeForReferral.bet_per_month >= 50) {
          const { data: profileRef } = await supabaseAdmin
            .from("profiles")
            .select("referred_by, referral_bonus_paid")
            .eq("user_id", user.id)
            .single();

          if (profileRef?.referred_by && !profileRef.referral_bonus_paid) {
            const { data: currentUserProfile } = await supabaseAdmin
              .from("profiles")
              .select("username")
              .eq("user_id", user.id)
              .single();

            const referredName = currentUserProfile?.username ? `@${currentUserProfile.username}` : "ton filleul";
            const rewardCoins = 250;

            const { error: notifError } = await supabaseAdmin.functions.invoke("send-notification", {
              body: {
                user_id: profileRef.referred_by,
                type: "referral_reward",
                title: "Bonus parrainage disponible 🪙",
                body: `${referredName} a validé son défi. Clique pour récupérer ${rewardCoins} pièces.`,
                data: {
                  coins: rewardCoins,
                  referred_user_id: user.id,
                  reward_type: "referral_challenge_success",
                  claimed: false,
                },
              },
            });

            if (!notifError) {
              await supabaseAdmin
                .from("profiles")
                .update({ referral_bonus_paid: true })
                .eq("user_id", user.id);
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
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", memberId)
          .eq("user_id", user.id);
        if (error) throw error;

        // Now that payment is confirmed, send notification to target user for boost challenges
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
            const username = creatorProfile?.username || "Quelqu'un";
            await supabaseAdmin.functions.invoke("send-notification", {
              body: {
                user_id: sc.target_user_id,
                type: "social_challenge",
                title: "On t'offre un défi ! 🎁",
                body: `@${username} t'offre un défi de ${sc.bet_amount}€ — ${sc.sessions_per_week}x/sem pendant ${sc.duration_months} mois`,
                data: { socialChallengeId },
              },
            });
          }
        } catch (notifErr) {
          console.error("Failed to notify target:", notifErr);
        }

        // Check if all members paid -> activate
        const { data: members } = await supabaseAdmin
          .from("social_challenge_members")
          .select("payment_status")
          .eq("social_challenge_id", socialChallengeId);

        if (members && members.length > 0 && members.every((m: any) => m.payment_status === "paid")) {
          await supabaseAdmin
            .from("social_challenges")
            .update({ status: "active" })
            .eq("id", socialChallengeId);

          // Get the social challenge details
          const { data: sc } = await supabaseAdmin
            .from("social_challenges")
            .select("*")
            .eq("id", socialChallengeId)
            .single();

          if (sc) {
            // Create a challenge entry for each member
            const allMembers = await supabaseAdmin
              .from("social_challenge_members")
              .select("id, user_id, bet_amount")
              .eq("social_challenge_id", socialChallengeId);

            const totalSessions = sc.sessions_per_week * sc.duration_months * 4;
            // First week: floor based on day of week (Mon=1)
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Sun
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

              // Link the member to the challenge
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

      return new Response(JSON.stringify({ success: true, status: "paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
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
