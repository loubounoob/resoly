

## Plan : Remboursement Stripe + protection defi actif + "Offrir un defi"

### 1. Remboursement Stripe a la fin d'un defi reussi

**Constat** : Actuellement, quand un defi est termine avec succes (`handleCompleteChallenge` dans Dashboard.tsx), le code attribue les pieces et marque le defi comme "completed", mais **aucun remboursement Stripe n'est effectue**. Le champ `stripe_payment_intent_id` est stocke en base mais jamais utilise.

**Solution** : Creer une nouvelle edge function `complete-challenge` qui :
- Verifie que le defi est bien termine (toutes les seances completees)
- Appelle `stripe.refunds.create({ payment_intent: challenge.stripe_payment_intent_id })` pour rembourser la mise
- Attribue les pieces bonus au profil de l'utilisateur
- Met a jour le statut du defi en "completed"

Le bouton "Recuperer et lancer un nouveau defi" dans Dashboard.tsx appellera cette edge function au lieu de faire les updates directement cote client.

### 2. Empecher un defi social avec quelqu'un qui a deja un defi actif

**Dans `CreateSocialChallenge.tsx`** (etape "target") :
- Recuperer les defis actifs de chaque ami via une requete supplementaire
- Afficher un indicateur visuel "Defi en cours" sur les amis qui ont deja un defi actif
- Desactiver la selection de ces amis pour les types Duel et Groupe
- Seul le type Boost reste disponible pour un ami ayant deja un defi actif

### 3. Bouton "Offrir un defi" dans l'onglet Amis

**Dans `Friends.tsx`** :
- Ajouter un bouton "Offrir un defi" visible en permanence dans la section d'activite
- Ce bouton redirige vers `/friends/create-social` avec le type pre-selectionne sur "boost"
- Si l'utilisateur a deja un defi actif, le bouton "Creer un defi" dans la bottom nav mene au Dashboard, mais le bouton "Offrir" reste accessible depuis l'onglet Amis

### Fichiers concernes

| Fichier | Modification |
|---|---|
| `supabase/functions/complete-challenge/index.ts` | **Nouveau** -- Remboursement Stripe + attribution pieces + completion |
| `src/pages/Dashboard.tsx` | Appeler `complete-challenge` au lieu de faire les updates cote client |
| `src/pages/CreateSocialChallenge.tsx` | Verifier si l'ami cible a un defi actif, bloquer la selection sauf Boost |
| `src/pages/Friends.tsx` | Ajouter bouton "Offrir un defi" (redirige vers creation Boost) |
| `src/hooks/useSocialChallenges.ts` | Ajouter hook pour verifier les defis actifs des amis |

### Details techniques

**Edge function `complete-challenge`** :

```text
1. Authentifier l'utilisateur
2. Recuperer le challenge (id + user_id)
3. Verifier que toutes les seances sont completees
4. Si stripe_payment_intent_id existe :
   -> stripe.refunds.create({ payment_intent })
5. Mettre a jour profiles.coins += coinsToEarn
6. Mettre a jour challenges.status = "completed", coins_awarded = coinsToEarn
7. Retourner { success: true, refunded: true/false }
```

**Verification ami avec defi actif** :
- Requete sur `challenges` WHERE `user_id IN (friendIds)` AND `status = 'active'` AND `payment_status = 'paid'`
- Requete sur `social_challenge_members` WHERE `user_id IN (friendIds)` avec social_challenges.status = 'active'
- Fusionner les resultats pour savoir quels amis sont occupes

