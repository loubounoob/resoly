import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

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
    const dayOfWeek = now.getDay();
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;

    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    const sundayEnd = new Date(weekStart);
    sundayEnd.setDate(sundayEnd.getDate() + 6);
    sundayEnd.setHours(23, 59, 59, 999);

    let notified = 0;

    for (const challenge of challenges) {
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

      if (sessionsRemaining > 0 && sessionsRemaining >= daysLeftInWeek) {
        // Get user locale
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", challenge.user_id)
          .single();
        const locale = countryToLocale(userProfile?.country);

        const notif = getNotifText(locale, 'challenge_peril', sessionsRemaining, daysLeftInWeek, challenge.bet_per_month);

        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: challenge.user_id,
            type: "challenge_peril",
            title: notif.title,
            body: notif.body,
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
