

## Migration Stripe Checkout → Stripe Payment Sheet : Analyse complète

### Scope de la migration

Après audit complet, voici tous les points d'impact :

**Edge Functions à modifier (4) :**
1. `create-challenge-payment` — remplacer `checkout.sessions.create()` par `paymentIntents.create()` + retourner `clientSecret` au lieu d'une URL
2. `buy-coins` — même transformation
3. `verify-payment` — adapter le path frontend (plus de `sessionId`, utiliser `paymentIntentId`) ; le path webhook passe de `checkout.session.completed` à `payment_intent.succeeded`
4. `verify-coin-purchase` — même adaptation

**Edge Functions inchangées (2) :**
- `complete-challenge` — utilise déjà `stripe.refunds.create({ payment_intent })`, pas de changement
- `fail-challenge` — pas de logique Stripe

**Pages frontend à modifier (4) :**
1. `CreateChallenge.tsx` — remplacer `window.location.href = data.url` par un composant Stripe Elements intégré (PaymentSheet-like)
2. `CreateSocialChallenge.tsx` — idem
3. `BuyCoinsDrawer.tsx` — idem
4. `PaymentSuccess.tsx` — adapter la vérification (plus de `session_id` dans l'URL, confirmer via `paymentIntentId`)

**Nouveau composant à créer (1) :**
- `StripePaymentSheet.tsx` — drawer/modal avec Stripe Elements (`PaymentElement`) qui gère la confirmation du paiement in-app sans redirection

**Nouveau package npm (1) :**
- `@stripe/react-stripe-js` + `@stripe/stripe-js` pour Stripe Elements côté frontend

### Point critique : les codes promo

Stripe Checkout gère nativement `allow_promotion_codes: true`. Avec PaymentIntent, il faut :
- Soit ajouter un champ promo côté frontend + valider via l'API Stripe `promotionCodes.list()` côté edge function et appliquer la réduction manuellement sur le `amount`
- Soit utiliser des Coupons Stripe appliqués avant la création du PaymentIntent

Actuellement `create-challenge-payment` utilise `allow_promotion_codes: true` — cette logique devra être reconstruite.

### Plan d'implémentation

**Étape 1 : Installer les dépendances Stripe Elements**
- Ajouter `@stripe/react-stripe-js` et `@stripe/stripe-js`

**Étape 2 : Créer le composant `StripePaymentSheet`**
- Un drawer/modal qui charge `<Elements>` avec le `clientSecret`
- Affiche un `<PaymentElement>` (formulaire carte intégré, identique au PaymentSheet natif)
- Bouton "Payer" qui appelle `stripe.confirmPayment()`
- Gère le retour `succeeded` / `failed` directement dans l'app

**Étape 3 : Modifier les 2 edge functions de création de paiement**
- `create-challenge-payment` : créer un `PaymentIntent` au lieu d'une `CheckoutSession`, retourner `{ clientSecret, paymentIntentId }` 
- `buy-coins` : idem
- Stocker les metadata (`user_id`, `challenge_id`, etc.) sur le PaymentIntent

**Étape 4 : Modifier les pages frontend**
- `CreateChallenge.tsx` et `CreateSocialChallenge.tsx` : au lieu de rediriger, ouvrir le `StripePaymentSheet` avec le `clientSecret`
- `BuyCoinsDrawer.tsx` : idem
- Sur confirmation réussie, appeler `verify-payment` / `verify-coin-purchase` directement

**Étape 5 : Adapter les fonctions de vérification**
- `verify-payment` : accepter `paymentIntentId` au lieu de `sessionId`, utiliser `stripe.paymentIntents.retrieve()` au lieu de `checkout.sessions.retrieve()`
- `verify-coin-purchase` : idem
- Adapter le webhook pour écouter `payment_intent.succeeded` au lieu de `checkout.session.completed`

**Étape 6 : Gérer les codes promo**
- Ajouter un champ texte promo dans le `StripePaymentSheet`
- Valider côté edge function via l'API Stripe Promotion Codes
- Appliquer la réduction sur le montant du PaymentIntent

### Verdict

C'est faisable en une fois. Le chantier touche ~10 fichiers (4 edge functions + 4 pages + 1 nouveau composant + 1 package). Le risque principal est la gestion des codes promo qui nécessite une reconstruction manuelle. Le reste est une transformation mécanique bien définie.

Voulez-vous que je procède ?

