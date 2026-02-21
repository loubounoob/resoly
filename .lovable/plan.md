

## Corriger le flux complet des defis offerts (Boost)

### Problemes identifies

1. **Acceptation echoue** : L'edge function `accept-boost-challenge` verifie si l'utilisateur a deja un defi actif, mais ne verifie pas si l'utilisateur a deja rejoint CE defi specifique. De plus, les anciennes notifications de boost deja traites restent visibles.

2. **Refus ne rembourse pas** : `handleDeclineSocialChallenge` ne fait rien cote serveur -- il cache juste la notification localement. Pas de remboursement Stripe, pas de mise a jour du statut.

3. **Pas de `stripe_payment_intent_id` sur les membres sociaux** : Le paiement Stripe du createur n'est pas stocke sur `social_challenge_members`, donc impossible de rembourser en cas de refus.

4. **Completion du defi offert** : `complete-challenge` rembourse le createur via Stripe mais ne gere pas le versement au beneficiaire via IBAN. Il faut marquer l'IBAN et le montant a verser pour traitement.

5. **Pas de modification d'IBAN** : Aucun ecran ne permet de changer l'IBAN apres acceptation.

---

### Plan de corrections

#### 1. Migration base de donnees

Ajouter une colonne `stripe_payment_intent_id` a la table `social_challenge_members` pour pouvoir rembourser le createur si le defi est refuse.

```text
ALTER TABLE social_challenge_members
  ADD COLUMN stripe_payment_intent_id text;
```

#### 2. Edge function `verify-payment` -- stocker le payment intent

Quand le paiement social est verifie, sauvegarder `session.payment_intent` sur le `social_challenge_members` du createur.

#### 3. Edge function `create-challenge-payment` -- stocker le payment intent (promo code)

Quand le code promo est utilise, pas de payment intent (c'est normal, rien a rembourser).

#### 4. Nouvelle edge function `decline-boost-challenge`

- Authentifie l'utilisateur (doit etre le `target_user_id`)
- Met le statut du `social_challenges` a `"declined"`
- Recupere le `stripe_payment_intent_id` du membre createur
- Si present, rembourse via Stripe
- Supprime la notification associee
- Retourne `{ success: true, refunded: true/false }`

#### 5. Edge function `accept-boost-challenge` -- corrections

- Avant de verifier "deja un defi actif", verifier d'abord si l'utilisateur a deja rejoint CE defi specifique (eviter les doublons)
- Nettoyer la notification apres acceptation reussie

#### 6. Edge function `complete-challenge` -- gerer les defis offerts

- Detecter si le defi est lie a un `social_challenge_id`
- Si oui, recuperer l'IBAN du beneficiaire depuis `social_challenge_members`
- Au lieu de rembourser le createur via Stripe, creer une entree dans une nouvelle table `pending_payouts` (ou simplement logger/notifier) avec l'IBAN et le montant a verser
- Attribuer les pieces normalement

Pour simplifier : on ajoute une table `pending_payouts` pour tracer les versements IBAN a faire.

```text
CREATE TABLE pending_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  social_challenge_id uuid NOT NULL,
  amount numeric NOT NULL,
  iban text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payouts"
  ON pending_payouts FOR SELECT USING (auth.uid() = user_id);
```

#### 7. Frontend -- Notifications (`src/pages/Notifications.tsx`)

- `handleDeclineSocialChallenge` : appeler la nouvelle edge function `decline-boost-challenge` au lieu de juste cacher la notification
- Ajouter un etat de chargement pour le refus
- Supprimer la notification de la liste apres traitement

#### 8. Frontend -- Settings (`src/pages/Settings.tsx`)

Ajouter une section "IBAN" dans les parametres :
- Afficher l'IBAN actuel (depuis `social_challenge_members` ou un champ `iban` sur `profiles`)
- Permettre de le modifier

Pour plus de coherence, ajouter une colonne `iban` sur la table `profiles` et la synchroniser.

```text
ALTER TABLE profiles ADD COLUMN iban text;
```

#### 9. Config `supabase/config.toml`

Ajouter la config pour la nouvelle edge function :
```text
[functions.decline-boost-challenge]
verify_jwt = false
```

---

### Resume des fichiers modifies

- **Migration SQL** : ajouter `stripe_payment_intent_id` sur `social_challenge_members`, ajouter `iban` sur `profiles`, creer table `pending_payouts`
- **`supabase/functions/decline-boost-challenge/index.ts`** : nouvelle function
- **`supabase/functions/accept-boost-challenge/index.ts`** : fix doublons
- **`supabase/functions/verify-payment/index.ts`** : stocker payment intent sur membre
- **`supabase/functions/complete-challenge/index.ts`** : gerer les payouts IBAN
- **`src/pages/Notifications.tsx`** : appeler decline cote serveur
- **`src/pages/Settings.tsx`** : ajouter gestion IBAN

