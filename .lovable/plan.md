

## Problemes identifiés

1. **Code promo LOUBOUNOOBLEGOAT crash** : L'edge function `apply-promo-code` tente de mettre le PaymentIntent à 50 cents USD, mais le compte Stripe est en EUR. 50 cents USD = ~0.43€, en dessous du minimum Stripe (0.50€). Solution : au lieu de modifier le montant Stripe, **bypasser le paiement entierement** coté frontend quand ce code est appliqué.

2. **Stripe Elements en francais / pays France pour un americain** : `loadStripe()` n'est pas appelé avec la locale utilisateur, et le `PaymentElement` n'a pas de `defaultValues` pour le pays.

## Plan

### 1. Fix code promo LOUBOUNOOBLEGOAT — bypass total du paiement

Au lieu de réduire le montant Stripe (probleme de minimum par devise), changer l'approche :

- **Edge function `apply-promo-code`** : Pour `LOUBOUNOOBLEGOAT`, ne pas toucher au PaymentIntent. Retourner `{ valid: true, type: "free", newAmount: 0 }`.
- **Frontend `StripePaymentSheet`** : Quand `discountedAmount === 0`, afficher un bouton "Confirmer — Gratuit" qui appelle directement `onSuccess` sans passer par Stripe `confirmPayment`. Le PaymentIntent est annulé (ou ignoré).
- **Frontend `PaymentForm`** : Cacher le `PaymentElement` quand le montant est 0, montrer juste le bouton de confirmation gratuit.

### 2. Stripe Elements locale + pays pré-rempli

- **`src/lib/stripe.ts`** : Modifier `getStripe()` pour accepter une locale et la passer à `loadStripe(key, { locale })`. Invalider le cache si la locale change.
- **`StripePaymentSheet.tsx`** : Ajouter props `locale` et `country`. Passer au `PaymentElement` : `defaultValues: { billingDetails: { address: { country } } }`. Passer la locale à `getStripe(locale)`.
- **`CreateChallenge.tsx`, `CreateSocialChallenge.tsx`, `BuyCoinsDrawer.tsx`** : Passer `locale` et `country` depuis `useLocale()` au `StripePaymentSheet`.

### 3. Enrichir le customer Stripe avec le profil utilisateur

- **`create-challenge-payment` et `buy-coins`** : Après création/récupération du customer Stripe, update avec `name`, `address.country` depuis le profil Supabase. Cela permettra a Stripe de pré-remplir automatiquement les informations connues.

### Fichiers modifiés
- `supabase/functions/apply-promo-code/index.ts` — retourner `type: "free"` sans toucher au PI
- `src/components/StripePaymentSheet.tsx` — bypass paiement si montant 0, props locale/country, defaultValues
- `src/lib/stripe.ts` — locale-aware `getStripe(locale)`
- `supabase/functions/create-challenge-payment/index.ts` — enrichir customer Stripe
- `supabase/functions/buy-coins/index.ts` — enrichir customer Stripe
- `src/pages/CreateChallenge.tsx` — passer locale/country
- `src/pages/CreateSocialChallenge.tsx` — passer locale/country
- `src/components/BuyCoinsDrawer.tsx` — passer locale/country

