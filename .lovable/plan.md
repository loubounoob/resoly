

## Diagnostic : Erreur de paiement Stripe

### Cause identifiee

Les logs de la fonction `create-challenge-payment` montrent cette erreur :

```text
StripePermissionError: The provided key 'rk_live_...' does not have 
the required permissions for this endpoint. Having the 
'rak_ephemeral_key_write' permission would allow this request to continue.
```

La cle Stripe configuree est une **restricted key** (`rk_live_...`) au lieu d'une **secret key** complete (`sk_live_...`). Les restricted keys ont des permissions limitees et celle-ci ne peut pas creer de cles ephemeres ni potentiellement certaines operations de paiement.

### Solution

Le probleme n'est pas dans le code mais dans la configuration du secret `STRIPE_SECRET_KEY`. Il y a deux options :

**Option A (recommandee)** : Remplacer le secret `STRIPE_SECRET_KEY` par la cle secrete complete de ton compte Stripe (`sk_live_...` ou `sk_test_...`), disponible dans le dashboard Stripe sous Developers > API Keys.

**Option B** : Si tu veux garder une restricted key, ajouter les permissions suivantes dans le dashboard Stripe :
- `rak_ephemeral_key_write`
- `rak_customer_write` / `rak_customer_read`
- `rak_payment_intent_write`

### Implementation

Aucun changement de code necessaire. Il suffit de mettre a jour la valeur du secret `STRIPE_SECRET_KEY` avec la bonne cle via l'outil de gestion des secrets.

