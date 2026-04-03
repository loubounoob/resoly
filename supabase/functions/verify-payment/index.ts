import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

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
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const rawBody = await req.text();
    let body: any;

    // Detect webhook by stripe-signature header
    const stripeSignature = req.headers.get("stripe-signature");
    const isWebhook = !!stripeSignature;

    let paymentIntent: any;
    let userId: string;
    let challengeId: string | null = null;
    let socialChallengeId: string | null = null;
    let memberId: string | null = null;

    if (isWebhook) {
      // Verify Stripe webhook signature
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2023-10-16" as any,
      });
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured");
        return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      let event: any;
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, stripeSignature!, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      console.log("Webhook event verified:", event.type);

      if (event.type !== "payment_intent.succeeded") {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      body = event;
      paymentIntent = event.data.object;
      const meta = paymentIntent.metadata || {};
      userId = meta.user_id;
      challengeId = meta.challenge_id || null;
      socialChallengeId = meta.social_challenge_id || null;
      memberId = meta.member_id || null;

      if (!userId) {
        console.error("No user_id in payment intent metadata");
        return new Response(JSON.stringify({ received: true, error: "No user_id in metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Handle coin purchases via webhook
      if (meta.type === "coin_purchase") {
        const coinsToAdd = parseInt(meta.coins, 10);
        if (coinsToAdd && coinsToAdd > 0) {
          // === DEDUPLICATION: prevent double credit on webhook retry ===
          const { error: dedupError } = await supabaseAdmin
            .from("processed_coin_payments")
            .insert({ payment_intent_id: paymentIntent.id, user_id: userId, coins: coinsToAdd });

          if (dedupError && dedupError.code === "23505") {
            // Already processed this payment intent
            console.log(`Webhook: payment ${paymentIntent.id} already processed, skipping`);
            return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
          if (dedupError) throw dedupError;

          // === ATOMIC coin increment ===
          await supabaseAdmin.rpc("increment_coins", { _user_id: userId, _amount: coinsToAdd });
          console.log(`Webhook: credited ${coinsToAdd} coins to user ${userId}`);
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      // --- FRONTEND CALL PATH ---
      body = JSON.parse(rawBody);
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      if (!user) throw new Error("User not authenticated");
      userId = user.id;

      // Support both old sessionId and new paymentIntentId
      const { paymentIntentId, sessionId } = body;
      challengeId = body.challengeId || null;
      socialChallengeId = body.socialChallengeId || null;
      memberId = body.memberId || null;
      const promoFree = body.promoFree === true;

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2023-10-16" as any,
      });

      // Handle free promo code bypass — validate that the challenge actually has a free promo code
      const FREE_PROMO_CODES = ["LOUBOUNOOBLEGOAT"];
      if (promoFree) {
        let hasValidFreePromo = false;
        if (challengeId) {
          const { data: ch } = await supabaseAdmin
            .from("challenges")
            .select("promo_code")
            .eq("id", challengeId)
            .eq("user_id", userId)
            .single();
          hasValidFreePromo = !!ch?.promo_code && FREE_PROMO_CODES.includes(ch.promo_code.toUpperCase());
        }
        // For social challenges, allow free promo bypass (validated by apply-promo-code)
        if (socialChallengeId) {
          hasValidFreePromo = true;
        }
        if (!hasValidFreePromo) {
          return new Response(JSON.stringify({ success: false, error: "Invalid free promo" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        // Cancel the unused PaymentIntent
        if (paymentIntentId) {
          try {
            await stripe.paymentIntents.cancel(paymentIntentId);
          } catch {
            /* already canceled or completed */
          }
        }
        // Create a fake paymentIntent object for the shared logic
        paymentIntent = { id: paymentIntentId || "free_promo", metadata: {} };
      } else if (paymentIntentId) {
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
          return new Response(JSON.stringify({ success: false, status: paymentIntent.status }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } else if (sessionId) {
        // Backward compatibility with old checkout sessions
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid") {
          return new Response(JSON.stringify({ success: false, status: session.payment_status }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        paymentIntent = { id: session.payment_intent, metadata: session.metadata };
      } else {
        throw new Error("Missing paymentIntentId or sessionId");
      }
    }

    // --- SHARED LOGIC: process the paid payment ---
    const paymentIntentId =
      typeof paymentIntent.id === "string" ? paymentIntent.id : (paymentIntent.payment_intent as string);

    // Helper: base-coin formula (mirrors src/lib/coins.ts)
    const computeBaseCoins = (totalCoins: number): number => {
      if (totalCoins === 0) return 0;
      return Math.max(10, Math.round(totalCoins * 0.1));
    };

    // Handle regular challenge
    if (challengeId) {
      // Filter by payment_status = "pending" so double-calls (e.g. webhook + manual) are idempotent
      const { data: updatedRows, error } = await supabaseAdmin
        .from("challenges")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: paymentIntentId || null,
        })
        .eq("id", challengeId)
        .eq("user_id", userId)
        .eq("payment_status", "pending")
        .select("bet_per_month, duration_months, sessions_per_week, promo_code");
      if (error) throw error;

      // Award base coins only on the first confirmation (idempotency guard above)
      if (updatedRows && updatedRows.length > 0) {
        const ch = updatedRows[0];
        const I = ch.bet_per_month;
        if (I > 0) {
          const getCoefficientDeMise = (i: number): number => {
            if (i <= 50) return 1 + 0.004 * i;
            if (i <= 75) return 1.2 + 0.012 * (i - 50);
            if (i <= 100) return 1.5 + 0.02 * (i - 75);
            if (i <= 300) return 2 - 0.0045 * (i - 100);
            if (i <= 860) return 1.1 - 0.000785 * (i - 300);
            if (i <= 1000) return 0.6604 - 0.0005 * (i - 860);
            return Math.max(0.15, 0.59 - 0.00009 * (i - 1000));
          };
          const PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027", "LOUBOUNOOBLEGOAT"];
          const promoMult = ch.promo_code && PROMO_CODES.includes(ch.promo_code.toUpperCase()) ? 1.5 : 1.0;
          const CI = getCoefficientDeMise(I);
          const monthFactor = 0.3 + 0.6 * Math.pow(ch.duration_months, 1.5);
          const sessionFactor = Math.pow(ch.sessions_per_week / 3, 1.1);
          const totalCoins = Math.round(I * CI * monthFactor * sessionFactor * 1.5 * promoMult);
          const baseCoins = computeBaseCoins(totalCoins);
          const { error: coinsErr } = await supabaseAdmin.rpc("increment_coins", {
            _user_id: userId,
            _amount: baseCoins,
          });
          if (coinsErr) console.error("Base coins award error:", coinsErr);
          else console.log(`Base coins awarded at payment: ${baseCoins} → user ${userId}`);
        }
      }

      // Sync to Google Sheets
      try {
        const { data: challenge } = await supabaseAdmin.from("challenges").select("*").eq("id", challengeId).single();
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("username, age, gender")
          .eq("user_id", userId)
          .single();

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email || "";

        if (challenge && profile) {
          const I = challenge.bet_per_month; // one-shot stake (not monthly)
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

          // Call Google Sheets webhook directly for reliability
          // NOTE: Google Apps Script exec URLs return a 302 redirect — we must follow it
          // manually with POST to avoid fetch silently converting POST→GET on redirect.
          const GOOGLE_SHEETS_CHALLENGE_WEBHOOK_FALLBACK =
            "https://script.google.com/macros/s/AKfycbwUlwqg597CDtmynybfirYxaPal9eBX5w1TVZvccFeAPLfKir-kKYodIQjhlhTLA7S6/exec";
          const sheetWebhookUrl =
            Deno.env.get("GOOGLE_SHEETS_CHALLENGE_WEBHOOK_URL") || GOOGLE_SHEETS_CHALLENGE_WEBHOOK_FALLBACK;
          if (sheetWebhookUrl) {
            const sheetPayload = {
              challenge_id: challengeId,
              username: profile.username,
              age: profile.age,
              gender: profile.gender,
              email: userEmail,
              type: challenge.social_challenge_id ? "social" : "perso",
              mise_totale: challenge.bet_per_month,
              mise_par_mois: challenge.bet_per_month,
              sessions_per_week: challenge.sessions_per_week,
              duration_months: challenge.duration_months,
              total_sessions: challenge.total_sessions,
              estimated_coins: estimatedCoins,
              status: "active",
              created_at: challenge.created_at,
              estimated_end_date: endDate.toISOString(),
              stripe_payment_intent_id: paymentIntentId,
              promo_code: challenge.promo_code || "",
            };
            console.log("Sending to Google Sheets:", JSON.stringify(sheetPayload));
            const postBody = JSON.stringify(sheetPayload);
            const postHeaders = { "Content-Type": "application/json" };
            // Google Apps Script exec URLs: doPost() runs on the initial POST,
            // then Google returns a 302 to the response URL.
            // redirect:"follow" lets fetch follow that 302 automatically so we
            // can read the final response without losing the execution.
            const sheetRes = await fetch(sheetWebhookUrl, {
              method: "POST",
              headers: postHeaders,
              body: postBody,
              redirect: "follow",
            });
            const resText = await sheetRes.text();
            console.log(`Google Sheets response [${sheetRes.status}]: ${resText.substring(0, 200)}`);
            if (!sheetRes.ok) {
              console.error(`Google Sheets webhook failed [${sheetRes.status}]: ${resText}`);
            } else {
              console.log("Google Sheets sync successful");
            }
          } else {
            console.warn("GOOGLE_SHEETS_CHALLENGE_WEBHOOK_URL not configured — skipping sheet sync");
          }
        }
      } catch (syncErr) {
        console.error("Sheet sync error:", syncErr);
      }

      // Referral bonus — triggered only when total stake ≥ 50 (in the user's currency)
      const { data: challengeForReferral } = await supabaseAdmin
        .from("challenges")
        .select("bet_per_month")
        .eq("id", challengeId)
        .single();

      const totalStake = challengeForReferral?.bet_per_month ?? 0; // one-shot stake
      if (challengeForReferral && totalStake >= 50) {
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

          const referredName = currentUserProfile?.username
            ? `@${currentUserProfile.username}`
            : referrerLocale === "fr"
              ? "ton filleul"
              : referrerLocale === "de"
                ? "dein Empfohlener"
                : "your referral";
          const rewardCoins = 250;
          const notif = getNotifText(referrerLocale, "referral_reward", referredName, rewardCoins);

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
            await supabaseAdmin.from("profiles").update({ referral_bonus_paid: true }).eq("user_id", userId);
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
          stripe_payment_intent_id: paymentIntentId || null,
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
          const notif = getNotifText(
            targetLocale,
            "social_challenge",
            username,
            sc.bet_amount,
            sc.sessions_per_week,
            sc.duration_months,
          );

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
          await supabaseAdmin.from("social_challenges").update({ status: "active" }).eq("id", socialChallengeId);

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
            const firstWeekSessions = Math.min(Math.floor((sc.sessions_per_week / 7) * daysLeft), sc.sessions_per_week);

            for (const member of allMembers.data ?? []) {
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
