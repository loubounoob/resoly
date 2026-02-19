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

        // Referral bonus: if bet >= 50€ and user was referred, give 250 coins to referrer (once)
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .select("bet_per_month")
          .eq("id", challengeId)
          .single();

        if (challenge && challenge.bet_per_month >= 50) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("referred_by, referral_bonus_paid")
            .eq("user_id", user.id)
            .single();

          if (profile?.referred_by && !profile.referral_bonus_paid) {
            // Credit 250 coins to referrer
            const { data: referrer } = await supabaseAdmin
              .from("profiles")
              .select("coins")
              .eq("user_id", profile.referred_by)
              .single();

            if (referrer) {
              await supabaseAdmin
                .from("profiles")
                .update({ coins: referrer.coins + 250 })
                .eq("user_id", profile.referred_by);
            }

            // Mark bonus as paid
            await supabaseAdmin
              .from("profiles")
              .update({ referral_bonus_paid: true })
              .eq("user_id", user.id);
          }
        }
      }

      // Handle social challenge member payment
      if (socialChallengeId && memberId) {
        const { error } = await supabaseAdmin
          .from("social_challenge_members")
          .update({ payment_status: "paid" })
          .eq("id", memberId)
          .eq("user_id", user.id);
        if (error) throw error;

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
