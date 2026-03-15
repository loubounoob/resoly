import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── i18n (inline — no external import needed) ────────────────────────────────
type Locale = "fr" | "en" | "de";
type Entry = { title: string; body: string | ((...a: any[]) => string) };
const TEXTS: Record<string, Record<Locale, Entry>> = {
  friend_request: {
    fr: { title: "Nouvelle demande d'ami", body: (n: string) => `${n} veut devenir ton ami ! 🤝` },
    en: { title: "New friend request", body: (n: string) => `${n} wants to be your friend! 🤝` },
    de: { title: "Neue Freundschaftsanfrage", body: (n: string) => `${n} möchte dein Freund werden! 🤝` },
  },
  friend_accepted: {
    fr: { title: "Demande acceptée !", body: (n: string) => `${n} a accepté ta demande d'ami ! 🎉` },
    en: { title: "Request accepted!", body: (n: string) => `${n} accepted your friend request! 🎉` },
    de: { title: "Anfrage akzeptiert!", body: (n: string) => `${n} hat deine Freundschaftsanfrage akzeptiert! 🎉` },
  },
  challenge_completed: {
    fr: {
      title: "Défi réussi ! 🏆🎉",
      body: (coins: number, refunded: boolean, betTotal: number) =>
        `Tu as complété ton défi ! ${refunded ? `${betTotal}€ remboursés` : ""} + ${coins} pièces gagnées. Champion !`,
    },
    en: {
      title: "Challenge won! 🏆🎉",
      body: (coins: number, refunded: boolean, betTotal: number) =>
        `You completed your challenge! ${refunded ? `€${betTotal} refunded` : ""} + ${coins} coins earned. Champion!`,
    },
    de: {
      title: "Challenge geschafft! 🏆🎉",
      body: (coins: number, refunded: boolean, betTotal: number) =>
        `Du hast deine Challenge geschafft! ${refunded ? `${betTotal}€ erstattet` : ""} + ${coins} Münzen verdient. Champion!`,
    },
  },
  challenge_completed_boost: {
    fr: {
      title: "Défi réussi ! 🏆",
      body: (coins: number) => `Tu as complété ton défi offert et gagné ${coins} pièces. Bravo !`,
    },
    en: {
      title: "Challenge won! 🏆",
      body: (coins: number) => `You completed your gifted challenge and earned ${coins} coins. Bravo!`,
    },
    de: {
      title: "Challenge geschafft! 🏆",
      body: (coins: number) => `Du hast deine geschenkte Challenge geschafft und ${coins} Münzen verdient. Bravo!`,
    },
  },
  boost_completed: {
    fr: {
      title: "Défi offert réussi ! 🎉",
      body: (n: string, r: boolean) =>
        `${n} a réussi le défi que tu lui as offert ! ${r ? "Tu as été remboursé." : ""}`,
    },
    en: {
      title: "Gifted challenge completed! 🎉",
      body: (n: string, r: boolean) => `${n} completed the challenge you gifted! ${r ? "You've been refunded." : ""}`,
    },
    de: {
      title: "Geschenkte Challenge geschafft! 🎉",
      body: (n: string, r: boolean) =>
        `${n} hat die geschenkte Challenge geschafft! ${r ? "Du wurdest erstattet." : ""}`,
    },
  },
  challenge_failed: {
    fr: {
      title: "Défi terminé... 😔",
      body: (bet: number) =>
        `Tu n'as pas atteint ton objectif cette semaine. Ta mise de ${bet}€ est perdue. Mais chaque échec est une leçon — reviens plus fort !`,
    },
    en: {
      title: "Challenge over... 😔",
      body: (bet: number) =>
        `You didn't reach your goal this week. Your €${bet} bet is lost. But every setback is a lesson — come back stronger!`,
    },
    de: {
      title: "Challenge beendet... 😔",
      body: (bet: number) =>
        `Du hast dein Ziel diese Woche nicht erreicht. Dein Einsatz von ${bet}€ ist verloren. Aber jeder Rückschlag ist eine Lektion — komm stärker zurück!`,
    },
  },
  challenge_peril: {
    fr: {
      title: "⚠️ Ton défi est en péril !",
      body: (remaining: number, daysLeft: number, bet: number) =>
        remaining === 1
          ? `Il te reste 1 séance à faire et c'est le dernier jour ! Fonce à la salle 💪`
          : `Il te reste ${remaining} séances cette semaine et seulement ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. Ne perds pas ta mise de ${bet}€ !`,
    },
    en: {
      title: "⚠️ Your challenge is in danger!",
      body: (remaining: number, daysLeft: number, bet: number) =>
        remaining === 1
          ? `You have 1 session left and it's the last day! Hit the gym 💪`
          : `You have ${remaining} sessions left this week and only ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Don't lose your €${bet} bet!`,
    },
    de: {
      title: "⚠️ Deine Challenge ist in Gefahr!",
      body: (remaining: number, daysLeft: number, bet: number) =>
        remaining === 1
          ? `Du hast noch 1 Training übrig und es ist der letzte Tag! Ab ins Gym 💪`
          : `Du hast noch ${remaining} Trainings diese Woche und nur ${daysLeft} Tag${daysLeft > 1 ? "e" : ""}. Verliere nicht deinen ${bet}€ Einsatz!`,
    },
  },
  social_challenge: {
    fr: {
      title: "On t'offre un défi ! 🎁",
      body: (n: string, bet: number, sessions: number, months: number) =>
        `@${n} t'offre un défi de ${bet}€ — ${sessions}x/sem pendant ${months} mois`,
    },
    en: {
      title: "You've been gifted a challenge! 🎁",
      body: (n: string, bet: number, sessions: number, months: number) =>
        `@${n} gifted you a €${bet} challenge — ${sessions}x/week for ${months} months`,
    },
    de: {
      title: "Du hast eine Challenge geschenkt bekommen! 🎁",
      body: (n: string, bet: number, sessions: number, months: number) =>
        `@${n} schenkt dir eine ${bet}€ Challenge — ${sessions}x/Woche für ${months} Monate`,
    },
  },
  challenge_accepted: {
    fr: { title: "Défi accepté ! 🔥", body: (n: string) => `@${n} a accepté ton défi ! C'est parti` },
    en: { title: "Challenge accepted! 🔥", body: (n: string) => `@${n} accepted your challenge! Let's go` },
    de: { title: "Challenge angenommen! 🔥", body: (n: string) => `@${n} hat deine Challenge angenommen! Los geht's` },
  },
  challenge_declined: {
    fr: {
      title: "Défi refusé",
      body: (n: string, r: boolean) => (r ? `@${n} a refusé le défi. Tu as été remboursé.` : `@${n} a refusé le défi.`),
    },
    en: {
      title: "Challenge declined",
      body: (n: string, r: boolean) =>
        r ? `@${n} declined the challenge. You've been refunded.` : `@${n} declined the challenge.`,
    },
    de: {
      title: "Challenge abgelehnt",
      body: (n: string, r: boolean) =>
        r ? `@${n} hat die Challenge abgelehnt. Du wurdest erstattet.` : `@${n} hat die Challenge abgelehnt.`,
    },
  },
  referral_reward: {
    fr: {
      title: "Bonus parrainage disponible 🪙",
      body: (n: string, coins: number) => `${n} a validé son défi. Clique pour récupérer ${coins} pièces.`,
    },
    en: {
      title: "Referral bonus available 🪙",
      body: (n: string, coins: number) => `${n} completed their challenge. Tap to claim ${coins} coins.`,
    },
    de: {
      title: "Empfehlungsbonus verfügbar 🪙",
      body: (n: string, coins: number) => `${n} hat die Challenge geschafft. Tippe, um ${coins} Münzen zu erhalten.`,
    },
  },
  referral_signup: {
    fr: {
      title: "Nouveau filleul ! 🎉",
      body: (n: string) => `@${n} s'est inscrit grâce à toi. Récupère tes 50 pièces !`,
    },
    en: { title: "New referral! 🎉", body: (n: string) => `@${n} signed up thanks to you. Claim your 50 coins!` },
    de: {
      title: "Neue Empfehlung! 🎉",
      body: (n: string) => `@${n} hat sich dank dir angemeldet. Hol dir deine 50 Münzen!`,
    },
  },
  gym_saved: {
    fr: {
      title: "Salle enregistrée ! 📍",
      body: (n: string) => `Ta salle "${n}" a été enregistrée. Tu recevras un rappel à chaque visite.`,
    },
    en: {
      title: "Gym saved! 📍",
      body: (n: string) => `Your gym "${n}" has been saved. You'll get a reminder on each visit.`,
    },
    de: {
      title: "Gym gespeichert! 📍",
      body: (n: string) => `Dein Gym "${n}" wurde gespeichert. Du erhältst bei jedem Besuch eine Erinnerung.`,
    },
  },
};

function countryToLocale(country: string | null | undefined): Locale {
  if (!country) return "fr";
  const c = country.toUpperCase();
  if (c === "FR") return "fr";
  if (c === "DE" || c === "CH") return "de";
  return "en";
}

function resolveNotif(
  locale: Locale,
  type: string,
  args: any[],
  fallbackTitle?: string,
  fallbackBody?: string,
): { title: string; body: string } {
  const entry = TEXTS[type]?.[locale] ?? TEXTS[type]?.["fr"];
  if (!entry) {
    return { title: fallbackTitle ?? type, body: fallbackBody ?? "" };
  }
  return {
    title: entry.title,
    body: typeof entry.body === "function" ? entry.body(...args) : entry.body,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

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

    // Fetch recipient's country and resolve locale
    const { data: profile } = await supabase.from("profiles").select("country").eq("id", user_id).single();

    const locale = countryToLocale(profile?.country);
    const notifArgs = getNotifArgs(type, data ?? {});
    const { title, body } = resolveNotif(locale, type, notifArgs, rawTitle, rawBody);

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
