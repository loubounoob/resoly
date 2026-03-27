// TODOimport { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!authHeader?.includes(serviceKey))
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  try {
    const { challengeId, userId, reason } = await req.json();
    if (!challengeId || !userId) throw new Error("Missing challengeId or userId");
    const { data: oldChallenge, error: chErr } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();
    if (chErr || !oldChallenge) throw new Error("Challenge not found");
    const newSessionsPerWeek: number =
      (oldChallenge as any).next_month_sessions_per_week ?? oldChallenge.sessions_per_week;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier, country")
      .eq("user_id", userId)
      .single();
    const tier = profile?.subscription_tier ?? "free";
    const totalSessions = Math.round(newSessionsPerWeek * 4.3);
    const { data: newChallenge, error: createErr } = await supabaseAdmin
      .from("challenges")
      .insert({
        user_id: userId,
        sessions_per_week: newSessionsPerWeek,
        total_sessions: totalSessions,
        duration_months: 1,
        status: "active",
        started_at: new Date().toISOString(),
        tier_at_creation: tier,
        session_coins_earned: 0,
        promo_code: null,
      })
      .select("id")
      .single();
    if (createErr) throw createErr;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const country = (profile?.country ?? "FR").toUpperCase();
    const locale = country === "DE" || country === "AT" ? "de" : country === "FR" || country === "BE" ? "fr" : "en";
    const title =
      locale === "fr"
        ? "Nouveau défi lancé ! 🔥"
        : locale === "de"
          ? "Neue Challenge gestartet! 🔥"
          : "New challenge started! 🔥";
    const body =
      locale === "fr"
        ? `${newSessionsPerWeek} séance${newSessionsPerWeek > 1 ? "s" : ""}/semaine — bonne chance !`
        : locale === "de"
          ? `${newSessionsPerWeek} Einheit${newSessionsPerWeek > 1 ? "en" : ""}/Woche — viel Erfolg!`
          : `${newSessionsPerWeek} session${newSessionsPerWeek > 1 ? "s" : ""}/week — good luck!`;
    fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        user_id: userId,
        type: "challenge_renewed",
        title,
        body,
        data: { challenge_id: newChallenge.id, route: "/dashboard" },
      }),
    }).catch(console.error);
    return new Response(
      JSON.stringify({ success: true, newChallengeId: newChallenge.id, sessionsPerWeek: newSessionsPerWeek, reason }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
