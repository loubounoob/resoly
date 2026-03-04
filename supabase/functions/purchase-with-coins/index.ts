import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { variantId, productTitle, variantTitle, priceAmount, priceCurrency, selectedOptions, quantity, shipping } = await req.json();
    if (!variantId || !priceAmount) throw new Error("Missing required fields");

    const qty = quantity || 1;
    const coinsNeeded = Math.ceil(parseFloat(priceAmount) * COINS_PER_EURO) * qty;

    // === ATOMIC coin deduction ===
    const { data: newBalance, error: deductError } = await supabaseAdmin
      .rpc('decrement_coins', { _user_id: user.id, _amount: coinsNeeded });

    if (deductError) {
      if (deductError.message?.includes('Insufficient coin balance')) {
        throw new Error("Not enough coins");
      }
      throw new Error("Failed to deduct coins");
    }

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

    // Insert coin_order
    const { error: orderError } = await supabaseAdmin
      .from("coin_orders")
      .insert({
        user_id: user.id,
        product_title: productTitle,
        variant_title: variantTitle || null,
        variant_id: variantId,
        selected_options: selectedOptions || [],
        coins_spent: coinsNeeded,
        price_amount: parseFloat(priceAmount) * qty,
        price_currency: priceCurrency || "EUR",
        shipping_first_name: shipping?.firstName || null,
        shipping_last_name: shipping?.lastName || null,
        shipping_address1: shipping?.address1 || null,
        shipping_address2: shipping?.address2 || null,
        shipping_city: shipping?.city || null,
        shipping_zip: shipping?.zip || null,
        shipping_country: shipping?.country || "FR",
        shipping_phone: shipping?.phone || null,
        email: user.email,
        status: "pending",
      });
    if (orderError) {
      console.error("Order insert error:", orderError);
      throw new Error("Failed to create order");
    }

    // Sync to Google Sheets (fire and forget)
    try {
      const webhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL");
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            created_at: new Date().toISOString(),
            product_title: productTitle,
            variant_title: variantTitle || "",
            coins_spent: coinsNeeded,
            price_amount: parseFloat(priceAmount) * qty,
            shipping_first_name: shipping?.firstName || "",
            shipping_last_name: shipping?.lastName || "",
            email: user.email || "",
            shipping_phone: shipping?.phone || "",
            shipping_address1: shipping?.address1 || "",
            shipping_city: shipping?.city || "",
            shipping_zip: shipping?.zip || "",
            shipping_country: shipping?.country || "FR",
            status: "pending",
          }),
        });
      }
    } catch (syncErr) {
      console.error("Google Sheets sync failed (non-blocking):", syncErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        coinsSpent: coinsNeeded,
        remainingCoins: newBalance,
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
