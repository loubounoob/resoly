import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Internal promo codes (same as in lib/coins.ts)
const VALID_PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027", "LOUBOUNOOBLEGOAT"];

// Special promo code for 100% discount
const FREE_PROMO_CODES = ["LOUBOUNOOBLEGOAT"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { promoCode, paymentIntentId } = await req.json();
    if (!promoCode || !paymentIntentId) throw new Error("Missing fields");

    const code = promoCode.trim().toUpperCase();

    // Check for free promo codes — bypass payment entirely (don't touch PI to avoid Stripe minimum issues)
    if (FREE_PROMO_CODES.includes(code)) {
      return new Response(JSON.stringify({ 
        valid: true, 
        message: "-100% 🎉 Free!",
        type: "free",
        newAmount: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Internal promo codes (these give +50% coins, not a discount on amount)
    if (VALID_PROMO_CODES.includes(code)) {
      return new Response(JSON.stringify({ 
        valid: true, 
        message: "+50% coins bonus! 🎉",
        type: "coins_bonus",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Then check Stripe promotion codes
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const promoCodes = await stripe.promotionCodes.list({
        code: code,
        active: true,
        limit: 1,
      });

      if (promoCodes.data.length > 0) {
        const promo = promoCodes.data[0];
        const coupon = promo.coupon;

        // Get current payment intent amount
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        let newAmount = pi.amount;

        if (coupon.percent_off) {
          newAmount = Math.round(pi.amount * (1 - coupon.percent_off / 100));
        } else if (coupon.amount_off) {
          newAmount = Math.max(50, pi.amount - coupon.amount_off); // min 50 cents
        }

        // Update the PaymentIntent with the new amount
        await stripe.paymentIntents.update(paymentIntentId, {
          amount: newAmount,
          metadata: { ...pi.metadata, promo_code: code },
        });

        return new Response(JSON.stringify({
          valid: true,
          message: coupon.percent_off 
            ? `-${coupon.percent_off}% applied!` 
            : `Discount applied!`,
          type: "amount_discount",
          newAmount: newAmount / 100,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } catch (stripeErr) {
      console.error("Stripe promo check error:", stripeErr);
    }

    return new Response(JSON.stringify({ valid: false, message: "Invalid code" }), {
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
