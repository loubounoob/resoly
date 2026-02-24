import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { socialChallengeId } = await req.json();
    if (!socialChallengeId) throw new Error("Missing socialChallengeId");

    // 1. Fetch the social challenge
    const { data: sc, error: scErr } = await supabaseAdmin
      .from("social_challenges")
      .select("*")
      .eq("id", socialChallengeId)
      .single();
    if (scErr || !sc) throw new Error("Social challenge not found");

    // Verify user is the target
    if (sc.target_user_id !== user.id) {
      throw new Error("You are not the target of this challenge");
    }
    if (sc.status !== "pending" && sc.status !== "active") {
      throw new Error("This challenge is no longer available");
    }

    // 1b. Check if user already joined THIS specific challenge
    const { data: alreadyJoined } = await supabaseAdmin
      .from("social_challenge_members")
      .select("id")
      .eq("social_challenge_id", socialChallengeId)
      .eq("user_id", user.id)
      .limit(1);
    if (alreadyJoined && alreadyJoined.length > 0) {
      throw new Error("Tu as déjà rejoint ce défi");
    }

    // 2. Check user doesn't already have an active challenge
    const { data: existingChallenge } = await supabaseAdmin
      .from("challenges")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("payment_status", "paid")
      .limit(1);
    if (existingChallenge && existingChallenge.length > 0) {
      throw new Error("Tu as déjà un défi actif");
    }

    // 2b. Ensure the offer payment is fully confirmed before target can accept
    const { data: creatorMember } = await supabaseAdmin
      .from("social_challenge_members")
      .select("payment_status")
      .eq("social_challenge_id", socialChallengeId)
      .eq("user_id", sc.created_by)
      .single();

    if (!creatorMember || creatorMember.payment_status !== "paid") {
      throw new Error("Le défi n'est pas encore offert (paiement en attente)");
    }

    // 3. Insert recipient as a member (no payment needed for boost)
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("social_challenge_members")
      .insert({
        social_challenge_id: socialChallengeId,
        user_id: user.id,
        bet_amount: sc.bet_amount,
        status: "joined",
        payment_status: "paid",
      })
      .select()
      .single();
    if (memberErr) throw memberErr;

    // 4. Activate the social challenge
    await supabaseAdmin
      .from("social_challenges")
      .update({ status: "active" })
      .eq("id", socialChallengeId);

    // 5. Create individual challenge entries for all members
    const { data: allMembers } = await supabaseAdmin
      .from("social_challenge_members")
      .select("id, user_id, bet_amount")
      .eq("social_challenge_id", socialChallengeId);

    const totalSessions = sc.sessions_per_week * sc.duration_months * 4;
    
    // First week adjustment — on weekends (Sat=6, Sun=0), set to 0 so challenge starts Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    let firstWeekSessions: number;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      firstWeekSessions = 0;
    } else {
      const daysLeft = 8 - dayOfWeek; // days left including today until end of week
      firstWeekSessions = Math.min(
        Math.max(1, Math.floor((sc.sessions_per_week / 7) * daysLeft)),
        sc.sessions_per_week
      );
    }

    for (const m of (allMembers ?? [])) {
      // Skip the creator — in a Boost, only the target does the challenge
      if (m.user_id === sc.created_by) continue;

      // Skip if member already has a linked challenge
      const { data: existingLink } = await supabaseAdmin
        .from("social_challenge_members")
        .select("challenge_id")
        .eq("id", m.id)
        .single();
      if (existingLink?.challenge_id) continue;

      const { data: inserted } = await supabaseAdmin
        .from("challenges")
        .insert({
          user_id: m.user_id,
          sessions_per_week: sc.sessions_per_week,
          duration_months: sc.duration_months,
          bet_per_month: m.bet_amount,
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
          .eq("id", m.id);
      }
    }

    // Clean up the notification
    await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "social_challenge")
      .filter("data->>socialChallengeId", "eq", socialChallengeId);

    // Notify the creator that the challenge was accepted
    try {
      const { data: receiverProfile } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      const username = receiverProfile?.username || "Quelqu'un";

      await supabaseAdmin.functions.invoke("send-notification", {
        body: {
          user_id: sc.created_by,
          type: "challenge_accepted",
          title: "Défi accepté ! 🔥",
          body: `@${username} a accepté ton défi ! C'est parti`,
          data: { socialChallengeId },
        },
      });
    } catch (notifErr) {
      console.error("Failed to notify creator:", notifErr);
    }

    return new Response(JSON.stringify({ success: true }), {
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
