

## Plan : Traduction des notifications + Fix affichage ami 0/0

### 1. Traduction des notifications (titre + body)

Toutes les notifications sont créées côté serveur avec du texte français en dur. Il faut récupérer le `country` du destinataire depuis son profil, mapper vers la locale, puis utiliser des textes traduits.

**Approche** : Ajouter une fonction utilitaire `getNotifTexts(locale, type, params)` dans chaque edge function qui génère le titre et le body dans la bonne langue.

**Fichiers à modifier** (6 edge functions + 1 hook frontend) :

| Fichier | Notifications concernées |
|---------|------------------------|
| `src/hooks/useFriends.ts` | `friend_request`, `friend_accepted` (×3 occurrences) |
| `supabase/functions/verify-payment/index.ts` | `referral_reward`, `social_challenge` |
| `supabase/functions/complete-challenge/index.ts` | `challenge_completed`, `boost_completed` |
| `supabase/functions/fail-challenge/index.ts` | `challenge_failed` |
| `supabase/functions/check-challenge-peril/index.ts` | `challenge_peril` |
| `supabase/functions/accept-boost-challenge/index.ts` | `challenge_accepted` |
| `supabase/functions/decline-boost-challenge/index.ts` | `challenge_declined` |

**Logique pour les edge functions** : Avant d'envoyer la notif, récupérer le `country` du profil destinataire → mapper vers locale (`FR`→`fr`, `DE/CH`→`de`, reste→`en`) → choisir le bon texte.

**Logique pour le hook frontend** (`useFriends.ts`) : Récupérer le `country` du profil du destinataire et mapper vers la locale.

**Textes à traduire** (exemples) :
- `friend_request` : "New friend request" / "Neue Freundschaftsanfrage"
- `friend_accepted` : "Request accepted!" / "Anfrage akzeptiert!"
- `challenge_completed` : "Challenge won! 🏆" / "Challenge geschafft! 🏆"
- `challenge_failed` : "Challenge over... 😔" / "Challenge beendet... 😔"
- `challenge_peril` : "⚠️ Your challenge is in danger!" / "⚠️ Deine Challenge ist in Gefahr!"
- `social_challenge` : "You've been gifted a challenge! 🎁" / "Du hast eine Challenge geschenkt bekommen! 🎁"
- `challenge_accepted` : "Challenge accepted! 🔥" / "Challenge angenommen! 🔥"
- `challenge_declined` : "Challenge declined" / "Challenge abgelehnt"
- `referral_reward` : "Referral bonus available 🪙" / "Empfehlungsbonus verfügbar 🪙"
- `boost_completed` : "Gifted challenge completed! 🎉" / "Geschenkte Challenge geschafft! 🎉"

### 2. Fix affichage 0/0 pour ami sans objectif cette semaine

**Problème** : Quand un ami a un défi actif mais `first_week_sessions = 0` (défi démarré le week-end), `weeklyGoal = 0` → le ring affiche `0/0`.

**Solution** : Dans `src/pages/Friends.tsx`, ne pas afficher le `MiniProgressRing` quand `weeklyGoal === 0`. Afficher le statut comme "No active challenge" dans ce cas.

**Fichier** : `src/pages/Friends.tsx`
- Ligne 216 : conditionner `MiniProgressRing` sur `friend.weeklyGoal > 0`
- Dans `getStatusInfo` : quand `friend.hasChallenge && friend.weeklyGoal === 0`, afficher un texte adapté (ex: "First week — starts Monday")

