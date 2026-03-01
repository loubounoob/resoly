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
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const { imageBase64, locale } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract pure base64 data (remove data:image/...;base64, prefix if present)
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const promptText = `
      You are a gym check-in verification assistant. Analyze this photo and determine if it shows a gym/fitness environment.
      
      Respond ONLY with a JSON object (no markdown, no code blocks):
      {"verified": true/false, "reason": "brief explanation"}
      
      The photo is verified (true) if it shows: gym equipment, weight machines, dumbbells, treadmills, exercise bikes, yoga mats, gym interior, locker rooms, swimming pools, sports facilities, or a person clearly in a gym/fitness environment.
      
      The photo is NOT verified (false) if it shows: home environment, office, non-sports outdoor places, food, or anything clearly unrelated to fitness.
      
      Be lenient — if there are reasonable signs of a gym/sport environment, validate it.
      
      IMPORTANT: The "reason" field MUST be in the language requested: "${locale || 'en'}".
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Google AI error:", response.status, text);
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let verified = false;
    let reason = "Impossible d'analyser la photo";

    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      verified = parsed.verified === true;
      reason = parsed.reason || reason;
    } catch {
      console.error("Failed to parse AI response:", content);
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
