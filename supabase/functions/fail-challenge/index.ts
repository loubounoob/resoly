import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active paid challenges
    const { data: challenges, error: chErr } = await supabase
      .from("challenges")
      .select("id, user_id, sessions_per_week, started_at, first_week_sessions, duration_months, bet_per_month")
      .eq("status", "active")
      .eq("payment_status", "paid");

    if (chErr) throw chErr;
    if (!challenges || challenges.length === 0) {
      return new Response(JSON.stringify({ message: "No active challenges", failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...

    // Monday of current week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    const sundayEnd = new Date(weekStart);
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);

    // Days left in week including today. On Sunday = 1 day left (today only)
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;

    let failed = 0;

    for (const challenge of challenges) {
      // Determine weekly goal (first week adjustment)
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

      // Count verified check-ins this week
      const { count } = await supabase
        .from("check_ins")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challenge.id)
        .eq("user_id", challenge.user_id)
        .eq("verified", true)
        .gte("checked_in_at", weekStart.toISOString())
        .lte("checked_in_at", sundayEnd.toISOString());

      const weeklyDone = count ?? 0;
      const sessionsRemaining = weeklyGoal - weeklyDone;

      // Challenge fails if more sessions remaining than days left
      if (sessionsRemaining > 0 && sessionsRemaining > daysLeftInWeek) {
        // Mark challenge as failed
        const { error: updateErr } = await supabase
          .from("challenges")
          .update({ status: "failed" })
          .eq("id", challenge.id);

        if (updateErr) {
          console.error(`Failed to update challenge ${challenge.id}:`, updateErr);
          continue;
        }

        // Send notification via send-notification function
        const betAmount = challenge.bet_per_month;
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: challenge.user_id,
            type: "challenge_failed",
            title: "Défi terminé... 😔",
            body: `Tu n'as pas atteint ton objectif cette semaine. Ta mise de ${betAmount}€ est perdue. Mais chaque échec est une leçon — reviens plus fort !`,
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
              user_id: challenge.user_id,
              status: "failed",
              sessions_per_week: challenge.sessions_per_week,
              duration_months: challenge.duration_months,
              bet_per_month: challenge.bet_per_month,
              weekly_done: weeklyDone,
              weekly_goal: weeklyGoal,
              failed_at: now.toISOString(),
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
