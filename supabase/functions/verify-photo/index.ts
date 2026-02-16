import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a gym check-in verification assistant. Your job is to analyze photos and determine if they show a gym or fitness environment.

Respond ONLY with a JSON object (no markdown, no code blocks):
{"verified": true/false, "reason": "brief explanation in French"}

A photo is verified (true) if it shows ANY of: gym equipment, workout machines, weights, treadmills, exercise bikes, yoga mats, a gym interior, locker rooms, swimming pools, sports facilities, or a person clearly in a gym/fitness setting.

A photo is NOT verified (false) if it shows: home environments, offices, outdoor non-sport locations, food, or anything clearly unrelated to fitness.

Be lenient — if there's reasonable evidence of a gym/sport environment, verify it.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Is this photo taken at a gym or fitness facility? Analyze and respond with JSON only.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:")
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI verification failed");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    // Parse AI response
    let verified = false;
    let reason = "Impossible d'analyser la photo";

    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      verified = parsed.verified === true;
      reason = parsed.reason || reason;
    } catch {
      console.error("Failed to parse AI response:", content);
      // Fallback: check if the text contains positive indicators
      verified = content.toLowerCase().includes('"verified": true') || 
                 content.toLowerCase().includes('"verified":true');
    }

    return new Response(
      JSON.stringify({ verified, reason }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-photo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
