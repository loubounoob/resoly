import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_DOMAIN = "sbqb12-w0.myshopify.com";
const SCOPES = "write_orders,read_orders,read_products";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  try {
    const action = url.searchParams.get("action");

    // Step 1: Initiate OAuth — redirect user to Shopify authorization page
    if (action === "install") {
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/shopify-oauth?action=callback`;
      const nonce = crypto.randomUUID();
      const installUrl = `https://${SHOPIFY_DOMAIN}/admin/oauth/authorize?client_id=${clientId}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: installUrl },
      });
    }

    // Step 2: Handle callback — exchange code for access token
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const shop = url.searchParams.get("shop") || SHOPIFY_DOMAIN;

      if (!code) {
        return new Response("<h1>Error: No authorization code received</h1>", {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Exchange code for permanent access token
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Token exchange failed:", errText);
        return new Response(`<h1>Token exchange failed</h1><pre>${errText}</pre>`, {
          status: 500,
          headers: { "Content-Type": "text/html" },
        });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const scopes = tokenData.scope;

      // Upsert token in database
      const { error: dbError } = await supabaseAdmin
        .from("shopify_tokens")
        .upsert(
          {
            shop_domain: shop,
            access_token: accessToken,
            scopes: scopes,
          },
          { onConflict: "shop_domain" }
        );

      if (dbError) {
        console.error("DB save error:", dbError);
        return new Response(`<h1>Token saved but DB error</h1><pre>${JSON.stringify(dbError)}</pre>`, {
          status: 500,
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response(
        `<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1>✅ Shopify connecté avec succès !</h1>
          <p>Token enregistré pour <strong>${shop}</strong></p>
          <p>Scopes: <code>${scopes}</code></p>
          <p>Vous pouvez fermer cette fenêtre.</p>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }

    // Status check
    if (action === "status") {
      const { data, error } = await supabaseAdmin
        .from("shopify_tokens")
        .select("shop_domain, scopes, updated_at")
        .eq("shop_domain", SHOPIFY_DOMAIN)
        .single();

      return new Response(
        JSON.stringify({ connected: !!data && !error, token: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use ?action=install, ?action=callback, or ?action=status" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
