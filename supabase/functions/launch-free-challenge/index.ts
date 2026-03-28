import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("User not authenticated");
    const userId = authData.user.id;

    const { sessions_per_week, duration_months, promo_code, first_week_sessions } = await req.json();

    if (!sessions_per_week || !duration_months) {
      throw new Error("Missing sessions_per_week or duration_months");
    }

    // (a) Fail all active free challenges
    await supabase
      .from("challenges")
      .update({ status: "failed" })
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("bet_per_month", 0);

    // (b) Fail all active+pending challenges
    await supabase
      .from("challenges")
      .update({ status: "failed" })
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("payment_status", "pending");

    // (c) Insert new free challenge
    const total_sessions = sessions_per_week * duration_months * 4;
    const { data: challenge, error: insertError } = await supabase
      .from("challenges")
      .insert({
        user_id: userId,
        sessions_per_week,
        duration_months,
        bet_per_month: 0,
        odds: 1,
        total_sessions,
        status: "active",
        payment_status: "paid",
        ...(promo_code ? { promo_code } : {}),
        ...(first_week_sessions != null ? { first_week_sessions } : {}),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, challenge }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
