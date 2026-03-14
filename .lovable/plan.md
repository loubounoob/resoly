

## Problème

Le `DrawerContent` du paiement Stripe a `max-h-[90vh]` mais le contenu intérieur (`<div className="px-4 pb-6">`) n'a pas de scroll. Quand le formulaire Stripe (carte, expiration, CVC, pays, Link, etc.) dépasse la hauteur du drawer, le bouton de confirmation est coupé et inaccessible.

## Solution

Rendre le contenu du drawer scrollable tout en gardant le bouton de confirmation toujours visible (sticky en bas).

### Modifications dans `src/components/StripePaymentSheet.tsx`

1. **Wrapper principal** : Ajouter `overflow-y-auto` sur le conteneur `px-4 pb-6` pour permettre le scroll du formulaire Stripe.

2. **Bouton sticky** : Extraire le bouton de confirmation du flux scrollable et le placer dans un conteneur sticky/fixed en bas du drawer avec un fond solide, pour qu'il reste toujours visible même quand on scroll le formulaire.

3. **Structure révisée du `PaymentForm`** :
   - Le form utilise `flex flex-col` avec une hauteur contrainte
   - La zone scrollable (description, montant, promo, PaymentElement) dans un `div` avec `overflow-y-auto flex-1`
   - Le bouton de confirmation dans un `div` sticky en bas avec padding et background

4. **Même traitement pour le drawer loading** (cohérence).

### Fichier modifié
- `src/components/StripePaymentSheet.tsx`

