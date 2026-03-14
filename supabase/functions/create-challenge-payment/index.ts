import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const hasAuth = !!authHeader;
    const body = await req.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: true,
        hasAuth,
        body,
        env: {
          hasStripeKey: !!Deno.env.get("STRIPE_SECRET_KEY"),
          hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
          hasSupabaseKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
