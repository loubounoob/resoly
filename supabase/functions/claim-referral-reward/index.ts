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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { notificationId } = await req.json();
    if (!notificationId) throw new Error("Missing notificationId");

    const { data: notif, error: notifError } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, type, data")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .eq("type", "referral_reward")
      .single();

    if (notifError || !notif) throw new Error("Notification introuvable");

    const notifData = (notif.data as Record<string, unknown> | null) ?? {};
    if (notifData.claimed === true) {
      return new Response(JSON.stringify({ success: true, alreadyClaimed: true, coinsAwarded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const rewardCoinsRaw = Number(notifData.coins ?? 250);
    if (!Number.isFinite(rewardCoinsRaw) || rewardCoinsRaw <= 0) {
      throw new Error("Invalid reward amount");
    }
    const rewardCoins = Math.round(rewardCoinsRaw);

    const claimedData = {
      ...notifData,
      claimed: true,
      claimed_at: new Date().toISOString(),
    };

    const { data: claimRow, error: claimError } = await supabaseAdmin
      .from("notifications")
      .update({ data: claimedData, read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .eq("type", "referral_reward")
      .or("data->>claimed.is.null,data->>claimed.eq.false")
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;

    if (!claimRow) {
      return new Response(JSON.stringify({ success: true, alreadyClaimed: true, coinsAwarded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("coins")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    const { error: updateCoinsError } = await supabaseAdmin
      .from("profiles")
      .update({ coins: (profile.coins ?? 0) + rewardCoins })
      .eq("user_id", user.id);

    if (updateCoinsError) throw updateCoinsError;

    return new Response(JSON.stringify({ success: true, alreadyClaimed: false, coinsAwarded: rewardCoins }), {
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
