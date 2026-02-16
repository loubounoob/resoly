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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { variantId, productTitle, priceAmount, priceCurrency, selectedOptions } = await req.json();
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

    // Build options note
    const optionsNote = selectedOptions?.length
      ? selectedOptions.map((o: { name: string; value: string }) => `${o.name}: ${o.value}`).join(", ")
      : "";

    // Try to create Shopify order via Admin API
    let shopifyOrderId = null;
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (shopifyToken) {
      try {
        const orderRes = await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/orders.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": shopifyToken,
            },
            body: JSON.stringify({
              order: {
                line_items: [
                  {
                    variant_id: parseInt(variantId.replace("gid://shopify/ProductVariant/", "")),
                    quantity: 1,
                  },
                ],
                financial_status: "paid",
                note: `Payé avec ${coinsNeeded} pièces${optionsNote ? ` — ${optionsNote}` : ""}`,
                tags: "coins-purchase",
                email: user.email || undefined,
                transactions: [
                  {
                    kind: "sale",
                    status: "success",
                    amount: priceAmount,
                    gateway: "Pièces",
                  },
                ],
              },
            }),
          }
        );

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          shopifyOrderId = orderData.order?.id;
        } else {
          console.warn("Shopify order creation failed:", await orderRes.text());
        }
      } catch (e) {
        console.warn("Shopify API call failed:", e.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        coinsSpent: coinsNeeded,
        remainingCoins: profile.coins - coinsNeeded,
        shopifyOrderId,
        productTitle,
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
