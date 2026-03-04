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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claims.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete all user data in order (respecting foreign keys)
    const tables = [
      { table: "check_ins", column: "user_id" },
      { table: "rewards", column: "user_id" },
      { table: "social_challenge_members", column: "user_id" },
      { table: "challenges", column: "user_id" },
      { table: "coin_orders", column: "user_id" },
      { table: "shop_orders", column: "user_id" },
      { table: "notifications", column: "user_id" },
      { table: "push_tokens", column: "user_id" },
      { table: "friendships", column: "user_id" },
      { table: "friendships", column: "friend_id" },
      { table: "group_members", column: "user_id" },
      { table: "pending_payouts", column: "user_id" },
      { table: "profiles", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
      if (error) console.error(`Error deleting from ${table}:`, error.message);
    }

    // Delete auth user
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("Error deleting auth user:", deleteErr.message);
      throw deleteErr;
    }

    console.log(`Account deleted for user ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
