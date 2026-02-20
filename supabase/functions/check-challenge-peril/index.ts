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
      return new Response(JSON.stringify({ message: "No active challenges" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;

    // Monday of current week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    const sundayEnd = new Date(weekStart);
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);

    let notified = 0;

    for (const challenge of challenges) {
      // Determine weekly goal (first week adjustment)
      const challengeStartDate = new Date(challenge.started_at);
      const challengeWeekStart = new Date(challengeStartDate);
      const csDay = challengeWeekStart.getDay();
      const csMondayOffset = csDay === 0 ? -6 : 1 - csDay;
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

      // In peril: need more sessions than days remaining
      if (sessionsRemaining > 0 && sessionsRemaining >= daysLeftInWeek) {
        // Send notification via send-notification function
        const notifTitle = "⚠️ Ton défi est en péril !";
        const notifBody = sessionsRemaining === 1
          ? `Il te reste 1 séance à faire et c'est le dernier jour ! Fonce à la salle 💪`
          : `Il te reste ${sessionsRemaining} séances cette semaine et seulement ${daysLeftInWeek} jour${daysLeftInWeek > 1 ? "s" : ""}. Ne perds pas ta mise de ${challenge.bet_per_month}€ !`;

        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: challenge.user_id,
            type: "challenge_peril",
            title: notifTitle,
            body: notifBody,
            data: { challenge_id: challenge.id, route: "/verify" },
          }),
        });

        notified++;
      }
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Peril check error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
