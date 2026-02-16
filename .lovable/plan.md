

## Fusionner la boutique : paiement en pieces ou en euros

### Objectif
Supprimer l'onglet "Pieces" de la navigation, fusionner tout dans le Shop, et permettre aux utilisateurs de payer les produits Shopify soit en euros (checkout Shopify classique), soit en pieces (1EUR = 50 pieces). Les achats en pieces doivent aussi creer une commande dans Shopify pour apparaitre dans l'admin.

### Changements prevus

**1. Navigation - Supprimer l'onglet Pieces**
- `BottomNav.tsx` : retirer le lien `/rewards` (Trophy/Pieces)
- `App.tsx` : supprimer la route `/rewards` et la route `/shop/:productId` (ancien detail interne)
- Supprimer ou archiver `src/pages/Rewards.tsx` et `src/pages/ProductDetail.tsx`

**2. Page Shop - Afficher le solde de pieces + double option de paiement**
- `Shop.tsx` : ajouter l'affichage du solde de pieces dans le header
- Chaque carte produit affiche le prix en EUR et en pieces (prix EUR x 50)
- Ajouter un bouton "Acheter avec pieces" en plus du bouton "Ajouter au panier"

**3. Page detail produit Shopify - Double paiement**
- `ShopifyProductDetail.tsx` : ajouter un bouton "Payer avec X pieces" sous le bouton "Ajouter au panier"
- Afficher la conversion : ex. "25,00 EUR ou 1250 pieces"
- Desactiver le bouton pieces si solde insuffisant

**4. Nouvelle Edge Function `purchase-with-coins`**
- Verifier l'authentification et le solde de pieces
- Deduire les pieces du profil utilisateur
- Creer une commande dans Shopify via l'Admin API (avec le secret `SHOPIFY_ACCESS_TOKEN` deja configure) pour que la commande apparaisse dans l'admin Shopify
- La commande sera marquee comme "paid" avec une note indiquant le paiement en pieces
- Retourner la confirmation

**5. Dashboard - Mettre a jour le lien "Mes pieces"**
- Le bouton "Mes pieces" redirigera vers `/shop` au lieu de `/rewards`

### Details techniques

**Conversion** : `prixEnPieces = Math.ceil(parseFloat(price.amount) * 50)`

**Edge Function `purchase-with-coins`** :
```
POST { variantId, productTitle, priceAmount, priceCurrency }
```
- Authentifie l'utilisateur
- Calcule le cout en pieces (montant x 50)
- Verifie le solde suffisant
- Deduit les pieces via Supabase Admin
- Cree un draft order Shopify via Admin API (`POST /admin/api/2025-01/draft_orders.json`) avec `financial_status: paid` et une note "Paye avec pieces"
- Complete le draft order pour le transformer en commande reelle

**Fichiers modifies** :
- `src/components/BottomNav.tsx` - retirer onglet Pieces
- `src/pages/Shop.tsx` - ajouter solde pieces + bouton achat pieces
- `src/pages/ShopifyProductDetail.tsx` - ajouter option paiement pieces
- `src/pages/Dashboard.tsx` - rediriger lien pieces vers /shop
- `src/App.tsx` - supprimer routes /rewards et /shop/:productId
- `supabase/functions/purchase-with-coins/index.ts` (nouveau) - achat Shopify via pieces
- `supabase/config.toml` - enregistrer la nouvelle fonction

**Fichiers supprimes** :
- `src/pages/Rewards.tsx`
- `src/pages/ProductDetail.tsx`

