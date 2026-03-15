import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { countryToLocale, getNotifText } from "../_shared/notif-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsignedToken));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsignedToken}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function getNotifArgs(type: string, data: Record<string, any>): any[] {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
    case "challenge_accepted":
    case "referral_signup":
      return [data?.name ?? ""];
    case "gym_saved":
      return [data?.name ?? ""];
    case "challenge_completed":
      return [data?.coins ?? 0, data?.refunded ?? false, data?.betTotal ?? 0];
    case "challenge_completed_boost":
      return [data?.coins ?? 0];
    case "boost_completed":
      return [data?.name ?? "", data?.refunded ?? false];
    case "challenge_failed":
      return [data?.bet ?? 0];
    case "challenge_peril":
      return [data?.remaining ?? 0, data?.daysLeft ?? 0, data?.bet ?? 0];
    case "social_challenge":
      return [data?.name ?? "", data?.bet ?? 0, data?.sessions ?? 0, data?.months ?? 0];
    case "challenge_declined":
      return [data?.name ?? "", data?.refunded ?? false];
    case "referral_reward":
      return [data?.name ?? "", data?.coins ?? 0];
    default:
      return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const { user_id, type, title: rawTitle, body: rawBody, data } = await req.json();

    if (!user_id || !type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recipient's country for auto-translation
    const { data: profile } = await supabase.from("profiles").select("country").eq("id", user_id).single();

    const locale = countryToLocale(profile?.country);
    const notifArgs = getNotifArgs(type, data ?? {});
    const translated = getNotifText(locale, type, ...notifArgs);

    // Use auto-translated text if available, fallback to provided title/body
    const title = translated.title !== type ? translated.title : (rawTitle ?? type);
    const body = translated.title !== type ? translated.body : (rawBody ?? "");

    // 1. Insert in-app notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id,
      type,
      title,
      body,
      data: data ?? {},
    });
    if (notifErr) throw notifErr;

    // 2. Send native push via FCM
    const fcmJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (fcmJson) {
      try {
        const serviceAccount = JSON.parse(fcmJson);
        const accessToken = await getAccessToken(serviceAccount);
        const { data: tokens } = await supabase.from("push_tokens").select("token, platform").eq("user_id", user_id);
        if (tokens && tokens.length > 0) {
          const projectId = serviceAccount.project_id;
          const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
          const pushResults = await Promise.allSettled(
            tokens.map((t: any) =>
              fetch(fcmUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token: t.token,
                    notification: { title, body },
                    data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
                    ...(t.platform === "android" ? { android: { priority: "high" } } : {}),
                    ...(t.platform === "ios"
                      ? { apns: { payload: { aps: { sound: "default", "content-available": 1 } } } }
                      : {}),
                  },
                }),
              }).then((r) => r.json()),
            ),
          );
          console.log("FCM results:", JSON.stringify(pushResults));
        }
      } catch (fcmErr) {
        console.error("FCM push error (non-blocking):", fcmErr);
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
