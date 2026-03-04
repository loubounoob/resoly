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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { productId } = await req.json();
    if (!productId) throw new Error("Missing productId");

    // Get product
    const { data: product, error: productError } = await supabaseAdmin
      .from("shop_products")
      .select("*")
      .eq("id", productId)
      .eq("active", true)
      .single();
    if (productError || !product) throw new Error("Product not found or inactive");

    // Check stock
    if (product.stock !== -1 && product.stock <= 0) throw new Error("Product out of stock");

    // === ATOMIC coin deduction ===
    const { data: newBalance, error: deductError } = await supabaseAdmin
      .rpc('decrement_coins', { _user_id: user.id, _amount: product.price_coins });

    if (deductError) {
      if (deductError.message?.includes('Insufficient coin balance')) {
        throw new Error("Not enough coins");
      }
      throw new Error("Failed to deduct coins");
    }

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("shop_orders")
      .insert({
        user_id: user.id,
        product_id: productId,
        coins_spent: product.price_coins,
        status: "completed",
      })
      .select()
      .single();
    if (orderError) throw new Error("Failed to create order");

    // Decrease stock if not unlimited
    if (product.stock !== -1) {
      await supabaseAdmin
        .from("shop_products")
        .update({ stock: product.stock - 1 })
        .eq("id", productId);
    }

    return new Response(JSON.stringify({ success: true, order }), {
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
