import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_DOMAIN = "sbqb12-w0.myshopify.com";
const COINS_PER_EURO = 50;

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
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { variantId, productTitle, priceAmount, priceCurrency } = await req.json();
    if (!variantId || !priceAmount) throw new Error("Missing required fields");

    const coinsNeeded = Math.ceil(parseFloat(priceAmount) * COINS_PER_EURO);

    // Get user coins
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("coins")
      .eq("user_id", user.id)
      .single();
    if (profileError || !profile) throw new Error("Profile not found");
    if (profile.coins < coinsNeeded) throw new Error("Not enough coins");

    // Deduct coins
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ coins: profile.coins - coinsNeeded })
      .eq("user_id", user.id);
    if (updateError) throw new Error("Failed to deduct coins");

    // Create Shopify draft order via Admin API
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!shopifyToken) throw new Error("Shopify access token not configured");

    const draftOrderRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyToken,
        },
        body: JSON.stringify({
          draft_order: {
            line_items: [
              {
                variant_id: parseInt(variantId.replace("gid://shopify/ProductVariant/", "")),
                quantity: 1,
              },
            ],
            note: `Payé avec ${coinsNeeded} pièces (${user.email})`,
            tags: "coins-purchase",
            email: user.email || undefined,
          },
        }),
      }
    );

    if (!draftOrderRes.ok) {
      const errText = await draftOrderRes.text();
      console.error("Shopify draft order error:", errText);
      // Refund coins on failure
      await supabaseAdmin
        .from("profiles")
        .update({ coins: profile.coins })
        .eq("user_id", user.id);
      throw new Error("Failed to create Shopify order");
    }

    const draftOrderData = await draftOrderRes.json();
    const draftOrderId = draftOrderData.draft_order.id;

    // Complete the draft order (marks as paid)
    const completeRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/draft_orders/${draftOrderId}/complete.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": shopifyToken,
        },
        body: JSON.stringify({ payment_pending: false }),
      }
    );

    if (!completeRes.ok) {
      console.error("Failed to complete draft order:", await completeRes.text());
    }

    const completeData = await completeRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        coinsSpent: coinsNeeded,
        remainingCoins: profile.coins - coinsNeeded,
        orderId: completeData.draft_order?.order_id || draftOrderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
