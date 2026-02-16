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

    const { variantId, productTitle, priceAmount, priceCurrency, selectedOptions, shipping } = await req.json();
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

    // Save shipping info to profile for future pre-fill
    if (shipping) {
      await supabaseAdmin
        .from("profiles")
        .update({
          first_name: shipping.firstName,
          last_name: shipping.lastName,
          address1: shipping.address1,
          address2: shipping.address2 || null,
          city: shipping.city,
          zip: shipping.zip,
          country: shipping.country,
          phone: shipping.phone || null,
        })
        .eq("user_id", user.id);
    }

    // Build options note
    const optionsNote = selectedOptions?.length
      ? selectedOptions.map((o: { name: string; value: string }) => `${o.name}: ${o.value}`).join(", ")
      : "";

    // Try to create Shopify order via Admin API
    let shopifyOrderId = null;
    // Read token from DB (OAuth flow) or fallback to env
    let shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    const { data: tokenRow } = await supabaseAdmin
      .from("shopify_tokens")
      .select("access_token")
      .eq("shop_domain", SHOPIFY_DOMAIN)
      .single();
    if (tokenRow?.access_token) {
      shopifyToken = tokenRow.access_token;
    }
    if (shopifyToken && shipping) {
      try {
        const orderPayload: Record<string, unknown> = {
          order: {
            line_items: [
              {
                variant_id: parseInt(variantId.replace("gid://shopify/ProductVariant/", "")),
                quantity: 1,
              },
            ],
            financial_status: "paid",
            shipping_address: {
              first_name: shipping.firstName,
              last_name: shipping.lastName,
              address1: shipping.address1,
              address2: shipping.address2 || "",
              city: shipping.city,
              zip: shipping.zip,
              country: shipping.country,
              phone: shipping.phone || "",
            },
            customer: {
              first_name: shipping.firstName,
              last_name: shipping.lastName,
              email: user.email,
            },
            email: user.email,
            note: `Payé avec ${coinsNeeded} pièces${optionsNote ? ` — ${optionsNote}` : ""}`,
            tags: "coins-purchase",
            transactions: [
              {
                kind: "sale",
                status: "success",
                amount: priceAmount,
                gateway: "Pièces",
              },
            ],
          },
        };

        const orderRes = await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/orders.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": shopifyToken,
            },
            body: JSON.stringify(orderPayload),
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
