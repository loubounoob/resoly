import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let targetChallengeId: string | null = null;
    try {
      const body = await req.json();
      targetChallengeId = body?.challenge_id ?? null;
    } catch {
      // No body = batch mode (cron)
    }

    let query = supabase
      .from("challenges")
      .select("id, user_id, sessions_per_week, started_at, first_week_sessions, duration_months, bet_per_month")
      .eq("status", "active")
      .eq("payment_status", "paid");

    if (targetChallengeId) {
      query = query.eq("id", targetChallengeId);
    }

    const { data: challenges, error: chErr } = await query;

    if (chErr) throw chErr;
    if (!challenges || challenges.length === 0) {
      return new Response(JSON.stringify({ message: "No active challenges", failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    const sundayEnd = new Date(weekStart);
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);

    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;

    let failed = 0;

    for (const challenge of challenges) {
      const challengeStartDate = new Date(challenge.started_at);
      const csDay = challengeStartDate.getDay();
      const csMondayOffset = csDay === 0 ? -6 : 1 - csDay;
      const challengeWeekStart = new Date(challengeStartDate);
      challengeWeekStart.setDate(challengeWeekStart.getDate() + csMondayOffset);
      challengeWeekStart.setHours(0, 0, 0, 0);

      const isFirstWeek = weekStart.getTime() === challengeWeekStart.getTime();
      const weeklyGoal = isFirstWeek && challenge.first_week_sessions != null
        ? challenge.first_week_sessions
        : challenge.sessions_per_week;

      const { data: checkInData } = await supabase
        .from("check_ins")
        .select("checked_in_at")
        .eq("challenge_id", challenge.id)
        .eq("user_id", challenge.user_id)
        .eq("verified", true)
        .gte("checked_in_at", weekStart.toISOString())
        .lte("checked_in_at", sundayEnd.toISOString());

      const uniqueDays = new Set(
        (checkInData ?? []).map((ci: any) => new Date(ci.checked_in_at).getDay())
      );
      const weeklyDone = uniqueDays.size;
      const sessionsRemaining = weeklyGoal - weeklyDone;

      if (sessionsRemaining > 0 && sessionsRemaining > daysLeftInWeek) {
        // === ATOMIC UPDATE with status guard to prevent race condition with complete-challenge ===
        const { data: updated, error: updateErr } = await supabase
          .from("challenges")
          .update({ status: "failed" })
          .eq("id", challenge.id)
          .eq("status", "active")
          .select("id");

        if (updateErr) {
          console.error(`Failed to update challenge ${challenge.id}:`, updateErr);
          continue;
        }

        // If no rows updated, challenge was already completed/failed by another process
        if (!updated || updated.length === 0) {
          console.log(`Challenge ${challenge.id} already changed status, skipping`);
          continue;
        }

        // Get user locale
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", challenge.user_id)
          .single();
        const locale = countryToLocale(userProfile?.country);

        const betAmount = challenge.bet_per_month;
        const notif = getNotifText(locale, 'challenge_failed', betAmount);

        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: challenge.user_id,
            type: "challenge_failed",
            title: notif.title,
            body: notif.body,
            data: {
              challenge_id: challenge.id,
              bet_lost: betAmount,
              route: "/dashboard",
            },
          }),
        });

        // Sync to Google Sheets
        try {
          await fetch(`${supabaseUrl}/functions/v1/sync-challenge-sheet`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              challenge_id: challenge.id,
              status: "failed",
              update_only: true,
            }),
          });
        } catch (sheetErr) {
          console.error("Sheet sync error (non-blocking):", sheetErr);
        }

        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fail challenge error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
