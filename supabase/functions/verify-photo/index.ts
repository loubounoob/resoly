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

    const { imageBase64 } = await req.json();
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Tu es un assistant de vérification de check-in en salle de sport. Analyse cette photo et détermine si elle montre un environnement de gym/fitness.

Réponds UNIQUEMENT avec un objet JSON (pas de markdown, pas de blocs de code) :
{"verified": true/false, "reason": "explication brève en français"}

La photo est validée (true) si elle montre : équipements de gym, machines de musculation, haltères, tapis de course, vélos d'exercice, tapis de yoga, intérieur de salle de sport, vestiaires, piscines, installations sportives, ou une personne clairement dans un environnement gym/fitness.

La photo n'est PAS validée (false) si elle montre : environnement domestique, bureaux, lieux extérieurs non sportifs, nourriture, ou tout ce qui n'est clairement pas lié au fitness.

Sois indulgent — s'il y a des indices raisonnables d'un environnement gym/sport, valide-la.`,
                },
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
