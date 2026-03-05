

## Plan de correction : Sécurité financière critique

### 1. Migration SQL — Fonctions atomiques `increment_coins` et `decrement_coins`

Créer deux fonctions SQL :
- `increment_coins(uid uuid, amount int)` — `UPDATE profiles SET coins = coins + amount WHERE user_id = uid`
- `decrement_coins(uid uuid, amount int)` — `UPDATE profiles SET coins = coins - amount WHERE user_id = uid AND coins >= amount`, retourne le nouveau solde (ou erreur si insuffisant)

### 2. `complete-challenge` — Atomique + idempotent

Refactorisation complète de la logique :

1. **UPDATE atomique** : Remplacer le `SELECT * + guard status !== active` par un `UPDATE challenges SET status = 'completed', coins_awarded = coinsToEarn WHERE id = challengeId AND user_id = userId AND status = 'active'`. Vérifier que `count > 0` sinon return `{ already_completed: true }`.
2. **Coins via RPC** : Remplacer `update({ coins: profile.coins + coinsToEarn })` par `supabaseAdmin.rpc('increment_coins', { uid: userId, amount: coinsToEarn })`.
3. **Refund APRÈS l'UPDATE** : Déplacer le bloc Stripe refund après le UPDATE atomique réussi.
4. **Idempotency key** : Ajouter `{ idempotencyKey: challengeId }` sur `stripe.refunds.create()`.

Le calcul des coins nécessite toujours un SELECT du challenge et du profil pour le country/promo, mais le guard de statut est dans l'UPDATE atomique.

### 3. Webhook Stripe (`verify-payment`) — Idempotent pour les coins

Dans le path `coin_purchase` (lignes 91-112) :
1. Avant de créditer, vérifier si le `paymentIntent.id` a déjà été traité en cherchant dans les challenges ou en ajoutant un check : `SELECT 1 FROM profiles WHERE user_id = uid` n'est pas suffisant. Solution : utiliser un INSERT idempotent dans une table de tracking ou simplement stocker le PI id.
2. **Solution retenue** : Ajouter une colonne `stripe_pi_id` à une vérification inline — avant de créditer, faire un `SELECT` sur `coin_orders` ou utiliser un mécanisme simple : tenter un `INSERT` dans une table `processed_coin_payments(payment_intent_id text PRIMARY KEY, user_id uuid, coins int, created_at timestamptz)`. Si le INSERT échoue (conflit PK), skip.
3. Remplacer le read-then-write par `supabaseAdmin.rpc('increment_coins', ...)`.

### 4. `verify-coin-purchase` — Même fix

Remplacer le read-then-write coins par `supabaseAdmin.rpc('increment_coins', ...)`. Ajouter la même déduplication via `processed_coin_payments`.

### 5. `fail-challenge` — Race condition fix

Ligne 91-94 : Ajouter `.eq("status", "active")` au UPDATE et vérifier le résultat :
```ts
const { data: updated, error } = await supabase
  .from("challenges")
  .update({ status: "failed" })
  .eq("id", challenge.id)
  .eq("status", "active")
  .select("id");
if (!updated?.length) continue; // déjà changé par complete-challenge
```

### 6. `create-challenge-payment` — Anti-spam PI

Avant de créer un nouveau PaymentIntent, vérifier qu'il n'en existe pas déjà un pending pour ce challenge :
```ts
if (challengeId) {
  const { data: existing } = await supabaseClient
    .from("challenges")
    .select("stripe_payment_intent_id, payment_status")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .single();
  if (existing?.stripe_payment_intent_id && existing.payment_status === "pending") {
    // Retrieve existing PI, return its clientSecret if still valid
    const existingPI = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id);
    if (existingPI.status === "requires_payment_method" || existingPI.status === "requires_confirmation") {
      return Response({ clientSecret: existingPI.client_secret, paymentIntentId: existingPI.id });
    }
  }
}
```

### 7. Autres fonctions — Coin atomique

Remplacer le read-then-write dans :
- `purchase-product/index.ts` → `rpc('decrement_coins', ...)`
- `purchase-with-coins/index.ts` → `rpc('decrement_coins', ...)`
- `claim-referral-reward/index.ts` → `rpc('increment_coins', ...)`

### Fichiers impactés

| Fichier | Modification |
|---|---|
| Migration SQL | `increment_coins`, `decrement_coins`, table `processed_coin_payments` |
| `complete-challenge/index.ts` | UPDATE atomique, refund après, idempotency key, rpc coins |
| `verify-payment/index.ts` | Dedup coin_purchase, rpc coins |
| `verify-coin-purchase/index.ts` | Dedup, rpc coins |
| `fail-challenge/index.ts` | `.eq("status","active")` sur UPDATE + check rows |
| `create-challenge-payment/index.ts` | Réutiliser PI existant |
| `purchase-product/index.ts` | rpc decrement_coins |
| `purchase-with-coins/index.ts` | rpc decrement_coins |
| `claim-referral-reward/index.ts` | rpc increment_coins |

### Garanties après correction

- **Double refund impossible** : UPDATE atomique `WHERE status = 'active'` + idempotencyKey Stripe
- **Double crédit coins impossible** : `increment_coins` SQL atomique + table `processed_coin_payments` pour les webhooks
- **Race condition fail vs complete** : Les deux utilisent `WHERE status = 'active'` sur l'UPDATE, un seul gagne
- **Spam PI** : Réutilisation du PI existant pour le même challenge

