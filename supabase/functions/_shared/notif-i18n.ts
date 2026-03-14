// Shared notification i18n for edge functions
// Maps country code from profile to locale
export function countryToLocale(country: string | null | undefined): 'fr' | 'en' | 'de' {
  if (!country) return 'fr';
  const c = country.toUpperCase();
  if (c === 'FR') return 'fr';
  if (c === 'DE' || c === 'CH') return 'de';
  return 'en'; // US, GB, IE, AU, CA, etc.
}

type NotifTexts = { title: string; body: string };

const texts: Record<string, Record<string, { title: string; body: string | ((...args: any[]) => string) }>> = {
  friend_request: {
    fr: { title: "Nouvelle demande d'ami", body: (name: string) => `${name} veut devenir ton ami ! 🤝` },
    en: { title: "New friend request", body: (name: string) => `${name} wants to be your friend! 🤝` },
    de: { title: "Neue Freundschaftsanfrage", body: (name: string) => `${name} möchte dein Freund werden! 🤝` },
  },
  friend_accepted: {
    fr: { title: "Demande acceptée !", body: (name: string) => `${name} a accepté ta demande d'ami ! 🎉` },
    en: { title: "Request accepted!", body: (name: string) => `${name} accepted your friend request! 🎉` },
    de: { title: "Anfrage akzeptiert!", body: (name: string) => `${name} hat deine Freundschaftsanfrage akzeptiert! 🎉` },
  },
  challenge_completed: {
    fr: { title: "Défi réussi ! 🏆🎉", body: (coins: number, refunded: boolean, betTotal: number) => `Tu as complété ton défi ! ${refunded ? `${betTotal}€ remboursés` : ""} + ${coins} pièces gagnées. Champion !` },
    en: { title: "Challenge won! 🏆🎉", body: (coins: number, refunded: boolean, betTotal: number) => `You completed your challenge! ${refunded ? `€${betTotal} refunded` : ""} + ${coins} coins earned. Champion!` },
    de: { title: "Challenge geschafft! 🏆🎉", body: (coins: number, refunded: boolean, betTotal: number) => `Du hast deine Challenge geschafft! ${refunded ? `${betTotal}€ erstattet` : ""} + ${coins} Münzen verdient. Champion!` },
  },
  challenge_completed_boost: {
    fr: { title: "Défi réussi ! 🏆", body: (coins: number) => `Tu as complété ton défi offert et gagné ${coins} pièces. Bravo !` },
    en: { title: "Challenge won! 🏆", body: (coins: number) => `You completed your gifted challenge and earned ${coins} coins. Bravo!` },
    de: { title: "Challenge geschafft! 🏆", body: (coins: number) => `Du hast deine geschenkte Challenge geschafft und ${coins} Münzen verdient. Bravo!` },
  },
  boost_completed: {
    fr: { title: "Défi offert réussi ! 🎉", body: (name: string, refunded: boolean) => `${name} a réussi le défi que tu lui as offert ! ${refunded ? "Tu as été remboursé." : ""}` },
    en: { title: "Gifted challenge completed! 🎉", body: (name: string, refunded: boolean) => `${name} completed the challenge you gifted! ${refunded ? "You've been refunded." : ""}` },
    de: { title: "Geschenkte Challenge geschafft! 🎉", body: (name: string, refunded: boolean) => `${name} hat die geschenkte Challenge geschafft! ${refunded ? "Du wurdest erstattet." : ""}` },
  },
  challenge_failed: {
    fr: { title: "Défi terminé... 😔", body: (bet: number) => `Tu n'as pas atteint ton objectif cette semaine. Ta mise de ${bet}€ est perdue. Mais chaque échec est une leçon — reviens plus fort !` },
    en: { title: "Challenge over... 😔", body: (bet: number) => `You didn't reach your goal this week. Your €${bet} bet is lost. But every setback is a lesson — come back stronger!` },
    de: { title: "Challenge beendet... 😔", body: (bet: number) => `Du hast dein Ziel diese Woche nicht erreicht. Dein Einsatz von ${bet}€ ist verloren. Aber jeder Rückschlag ist eine Lektion — komm stärker zurück!` },
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
    fr: { title: "On t'offre un défi ! 🎁", body: (name: string, bet: number, sessions: number, months: number) => `@${name} t'offre un défi de ${bet}€ — ${sessions}x/sem pendant ${months} mois` },
    en: { title: "You've been gifted a challenge! 🎁", body: (name: string, bet: number, sessions: number, months: number) => `@${name} gifted you a €${bet} challenge — ${sessions}x/week for ${months} months` },
    de: { title: "Du hast eine Challenge geschenkt bekommen! 🎁", body: (name: string, bet: number, sessions: number, months: number) => `@${name} schenkt dir eine ${bet}€ Challenge — ${sessions}x/Woche für ${months} Monate` },
  },
  challenge_accepted: {
    fr: { title: "Défi accepté ! 🔥", body: (name: string) => `@${name} a accepté ton défi ! C'est parti` },
    en: { title: "Challenge accepted! 🔥", body: (name: string) => `@${name} accepted your challenge! Let's go` },
    de: { title: "Challenge angenommen! 🔥", body: (name: string) => `@${name} hat deine Challenge angenommen! Los geht's` },
  },
  challenge_declined: {
    fr: { title: "Défi refusé", body: (name: string, refunded: boolean) => refunded ? `@${name} a refusé le défi. Tu as été remboursé.` : `@${name} a refusé le défi.` },
    en: { title: "Challenge declined", body: (name: string, refunded: boolean) => refunded ? `@${name} declined the challenge. You've been refunded.` : `@${name} declined the challenge.` },
    de: { title: "Challenge abgelehnt", body: (name: string, refunded: boolean) => refunded ? `@${name} hat die Challenge abgelehnt. Du wurdest erstattet.` : `@${name} hat die Challenge abgelehnt.` },
  },
  referral_reward: {
    fr: { title: "Bonus parrainage disponible 🪙", body: (name: string, coins: number) => `${name} a validé son défi. Clique pour récupérer ${coins} pièces.` },
    en: { title: "Referral bonus available 🪙", body: (name: string, coins: number) => `${name} completed their challenge. Tap to claim ${coins} coins.` },
    de: { title: "Empfehlungsbonus verfügbar 🪙", body: (name: string, coins: number) => `${name} hat die Challenge geschafft. Tippe, um ${coins} Münzen zu erhalten.` },
  },
  referral_signup: {
    fr: { title: "Nouveau filleul ! 🎉", body: (name: string) => `@${name} s'est inscrit grâce à toi. Récupère tes 50 pièces !` },
    en: { title: "New referral! 🎉", body: (name: string) => `@${name} signed up thanks to you. Claim your 50 coins!` },
    de: { title: "Neue Empfehlung! 🎉", body: (name: string) => `@${name} hat sich dank dir angemeldet. Hol dir deine 50 Münzen!` },
  },
  gym_saved: {
    fr: { title: "Salle enregistrée ! 📍", body: (name: string) => `Ta salle "${name}" a été enregistrée. Tu recevras un rappel à chaque visite.` },
    en: { title: "Gym saved! 📍", body: (name: string) => `Your gym "${name}" has been saved. You'll get a reminder on each visit.` },
    de: { title: "Gym gespeichert! 📍", body: (name: string) => `Dein Gym "${name}" wurde gespeichert. Du erhältst bei jedem Besuch eine Erinnerung.` },
  },
};

export function getNotifText(locale: 'fr' | 'en' | 'de', type: string, ...args: any[]): NotifTexts {
  const entry = texts[type]?.[locale] || texts[type]?.['fr'];
  if (!entry) return { title: type, body: '' };
  const title = entry.title;
  const body = typeof entry.body === 'function' ? entry.body(...args) : entry.body;
  return { title, body };
}
