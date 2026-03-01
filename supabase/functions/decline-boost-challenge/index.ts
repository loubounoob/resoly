import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { socialChallengeId } = await req.json();
    if (!socialChallengeId) throw new Error("Missing socialChallengeId");

    const { data: sc, error: scErr } = await supabaseAdmin
      .from("social_challenges")
      .select("*")
      .eq("id", socialChallengeId)
      .single();
    if (scErr || !sc) throw new Error("Social challenge not found");

    if (sc.target_user_id !== user.id) {
      throw new Error("You are not the target of this challenge");
    }
    if (sc.status !== "pending" && sc.status !== "active") {
      throw new Error("This challenge is no longer available");
    }

    // Mark as declined
    await supabaseAdmin
      .from("social_challenges")
      .update({ status: "declined" })
      .eq("id", socialChallengeId);

    // Refund
    let refunded = false;
    const { data: creatorMember } = await supabaseAdmin
      .from("social_challenge_members")
      .select("stripe_payment_intent_id")
      .eq("social_challenge_id", socialChallengeId)
      .eq("user_id", sc.created_by)
      .single();

    if (creatorMember?.stripe_payment_intent_id) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });
        await stripe.refunds.create({
          payment_intent: creatorMember.stripe_payment_intent_id,
        });
        refunded = true;
      } catch (refundErr) {
        console.error("Refund error:", refundErr);
      }
    }

    // Delete related notifications
    await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "social_challenge")
      .filter("data->>socialChallengeId", "eq", socialChallengeId);

    // Notify the creator
    try {
      const { data: receiverProfile } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      const username = receiverProfile?.username || "Someone";

      // Get creator's locale
      const { data: creatorProfile } = await supabaseAdmin
        .from("profiles")
        .select("country")
        .eq("user_id", sc.created_by)
        .single();
      const creatorLocale = countryToLocale(creatorProfile?.country);
      const notif = getNotifText(creatorLocale, 'challenge_declined', username, refunded);

      await supabaseAdmin.functions.invoke("send-notification", {
        body: {
          user_id: sc.created_by,
          type: "challenge_declined",
          title: notif.title,
          body: notif.body,
          data: { socialChallengeId },
        },
      });
    } catch (notifErr) {
      console.error("Failed to notify creator:", notifErr);
    }

    return new Response(
      JSON.stringify({ success: true, refunded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
