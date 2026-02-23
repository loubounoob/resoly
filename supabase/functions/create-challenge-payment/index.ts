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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { challengeId, socialChallengeId, memberId, amount, description, promoCode } = await req.json();
    if (!amount) throw new Error("Missing amount");
    if (!challengeId && !socialChallengeId) throw new Error("Missing challengeId or socialChallengeId");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle promo code "loubou" — bypass Stripe entirely
    if (promoCode && promoCode.toLowerCase() === "loubou") {
      if (challengeId) {
        const { error: updateError } = await supabaseAdmin
          .from("challenges")
          .update({ payment_status: "paid" })
          .eq("id", challengeId)
          .eq("user_id", user.id);
        if (updateError) throw new Error("Failed to apply promo code");

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
            const I = challenge.bet_per_month * challenge.duration_months;
            const M = challenge.duration_months;
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
                stripe_payment_intent_id: "",
                promo_code: "loubou",
              }),
            });
          }
        } catch (syncErr) {
          console.error("Sheet sync error:", syncErr);
        }
      }

      if (socialChallengeId && memberId) {
        const { error: updateError } = await supabaseAdmin
          .from("social_challenge_members")
          .update({ payment_status: "paid" })
          .eq("id", memberId)
          .eq("user_id", user.id);
        if (updateError) throw new Error("Failed to apply promo code for social challenge");

        // Now that promo payment is confirmed, send notification to target user for boost challenges
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
              .eq("user_id", user.id)
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

        // Check if all members have paid -> activate challenge
        await checkAndActivateSocialChallenge(supabaseAdmin, socialChallengeId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build success URL with appropriate params
    const origin = req.headers.get("origin");
    let successUrl: string;
    if (socialChallengeId) {
      successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&social_challenge_id=${socialChallengeId}&member_id=${memberId}`;
    } else {
      successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&challenge_id=${challengeId}`;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Mise Resoly",
              description: description || "Mise pour défi fitness",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: `${origin}/create`,
      metadata: {
        challenge_id: challengeId || "",
        social_challenge_id: socialChallengeId || "",
        member_id: memberId || "",
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
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

async function checkAndActivateSocialChallenge(supabaseAdmin: any, socialChallengeId: string) {
  const { data: members } = await supabaseAdmin
    .from("social_challenge_members")
    .select("id, user_id, bet_amount, payment_status, challenge_id")
    .eq("social_challenge_id", socialChallengeId);

  if (members && members.length > 0 && members.every((m: any) => m.payment_status === "paid")) {
    await supabaseAdmin
      .from("social_challenges")
      .update({ status: "active" })
      .eq("id", socialChallengeId);

    // Create individual challenge entries for members who don't have one yet
    const { data: sc } = await supabaseAdmin
      .from("social_challenges")
      .select("*")
      .eq("id", socialChallengeId)
      .single();

    if (sc) {
      const totalSessions = sc.sessions_per_week * sc.duration_months * 4;
      const now = new Date();
      const dayOfWeek = now.getDay();
      let firstWeekSessions: number;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        firstWeekSessions = 0;
      } else {
        const daysLeft = 8 - dayOfWeek;
        firstWeekSessions = Math.min(
          Math.max(1, Math.floor((sc.sessions_per_week / 7) * daysLeft)),
          sc.sessions_per_week
        );
      }

      for (const member of members) {
        if (member.challenge_id) continue;
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
            first_week_sessions: firstWeekSessions,
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
