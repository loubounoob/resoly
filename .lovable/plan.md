

## Plan : Notifications push i18n + Confirmation d'enregistrement salle

### Etat actuel

**Push notifications (FCM)** : Le systeme est deja en place — `send-notification` Edge Function envoie via FCM v1, les tokens sont stockes dans `push_tokens`, le secret `FCM_SERVICE_ACCOUNT_JSON` est configure. Toutes les notifications existantes (friend request, challenge completed, challenge peril, etc.) utilisent deja le systeme i18n via `notif-i18n.ts` en 3 langues (fr, en, de).

**Enregistrement salle** : `GymLocationPicker` sauvegarde correctement `gym_latitude`, `gym_longitude`, `gym_name` dans `profiles`. Mais aucune notification push n'est envoyee apres l'enregistrement.

### Ce qui manque

1. **Notification push "salle enregistree"** — Quand l'utilisateur enregistre sa salle, il faut envoyer une notification push (FCM) dans sa langue pour confirmer.

2. **Textes i18n pour cette notification** — Ajouter un type `gym_saved` dans `notif-i18n.ts` en 3 langues.

### Changements prevus

**1. `supabase/functions/_shared/notif-i18n.ts`**
- Ajouter le type `gym_saved` avec textes en fr/en/de :
  - FR: "Salle enregistree ! 📍" / "Ta salle a ete enregistree. Tu recevras un rappel a chaque visite."
  - EN: "Gym saved! 📍" / "Your gym has been saved. You'll get a reminder on each visit."
  - DE: "Gym gespeichert! 📍" / "Dein Gym wurde gespeichert. Du erhaltst bei jedem Besuch eine Erinnerung."

**2. `src/components/GymLocationPicker.tsx`**
- Apres la sauvegarde reussie dans `handleSave`, appeler `send-notification` avec le `user_id` et le type `gym_saved`
- Recuperer le `country` du profil pour determiner la locale et generer les textes localises cote client (via la meme logique `countryToLocale`)

**3. Verification du flux complet**
- L'update `profiles` sauvegarde bien les coordonnees (deja fonctionnel)
- L'appel `send-notification` insere la notification in-app ET envoie le push FCM natif dans la langue de l'utilisateur
- Le hook `usePushNotifications` enregistre le token FCM au login (deja fonctionnel)

### Pas de changement cote base de donnees
Toutes les tables necessaires existent deja (`profiles`, `push_tokens`, `notifications`).

