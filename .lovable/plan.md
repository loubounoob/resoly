

# Plan : Code promo Stripe "loubou" + Boutique de sport avec pieces

## 1. Code promo Stripe "loubou" (-100%)

Creer un coupon Stripe "loubou" qui offre 100% de reduction, puis l'activer dans le checkout.

### Actions :
- **Creer le coupon Stripe** via l'outil Stripe avec `percent_off: 100` et le nom "loubou"
- **Modifier l'edge function `create-challenge-payment`** pour activer le champ `allow_promotion_codes: true` dans la session Checkout Stripe, ce qui permet a l'utilisateur de saisir le code promo directement sur la page de paiement Stripe

## 2. Nouvelle table `shop_products` en base de donnees

Creer une table pour stocker les produits de la boutique, achetables avec des pieces.

### Schema :
- `id` (uuid, PK)
- `name` (text)
- `description` (text)
- `image_url` (text)
- `price_coins` (integer) -- prix en pieces
- `category` (text) -- ex: "vetements", "accessoires", "equipement"
- `stock` (integer, default -1 pour illimite)
- `active` (boolean, default true)
- `created_at` (timestamptz)

RLS : SELECT ouvert a tous les utilisateurs authentifies (catalogue public), pas d'INSERT/UPDATE/DELETE cote client.

## 3. Table `shop_orders` pour les achats

- `id` (uuid, PK)
- `user_id` (uuid)
- `product_id` (uuid, FK -> shop_products)
- `coins_spent` (integer)
- `status` (text, default 'pending')
- `created_at` (timestamptz)

RLS : SELECT et INSERT pour l'utilisateur lui-meme.

## 4. Seed de produits de sport

Inserer ~8 produits de sport directement dans la migration :
- Bande de resistance (150 pieces)
- Shaker proteine (200 pieces)
- Gants de musculation (350 pieces)
- Serviette microfibre (250 pieces)
- Corde a sauter (300 pieces)
- Tapis de yoga (500 pieces)
- Sac de sport (800 pieces)
- Ecouteurs sport Bluetooth (1200 pieces)

## 5. Edge function `purchase-product`

Nouvelle edge function pour gerer l'achat securise :
- Verifie l'authentification
- Verifie que le produit existe et est actif
- Verifie que l'utilisateur a assez de pieces
- Deduit les pieces du profil
- Cree une commande dans `shop_orders`
- Utilise le service role pour la transaction

## 6. Refonte de la page Rewards -> Boutique

Transformer `src/pages/Rewards.tsx` en une boutique avec :
- **Header** : solde de pieces en haut
- **Grille de produits** : cards avec image, nom, prix en pieces, bouton "Acheter"
- **Filtres par categorie** (optionnel, via tabs)

## 7. Page fiche produit (`/shop/:productId`)

Nouvelle page `src/pages/ProductDetail.tsx` :
- Image du produit en grand
- Nom, description, prix en pieces
- Bouton "Acheter avec X pieces"
- Retour a la boutique

## 8. Hooks et routing

- Nouveau hook `useShopProducts` pour lister les produits
- Nouveau hook `usePurchaseProduct` (mutation) pour acheter
- Ajouter la route `/shop/:productId` dans `App.tsx`

---

## Sections techniques

### Fichiers crees :
- `supabase/functions/purchase-product/index.ts`
- `src/pages/ProductDetail.tsx`

### Fichiers modifies :
- `supabase/functions/create-challenge-payment/index.ts` (ajout `allow_promotion_codes: true`)
- `supabase/config.toml` (ajout config pour `purchase-product`)
- `src/pages/Rewards.tsx` (refonte complete en boutique)
- `src/hooks/useChallenge.ts` (ajout hooks shop)
- `src/App.tsx` (nouvelle route `/shop/:productId`)

### Migration SQL :
- Creation table `shop_products` + RLS
- Creation table `shop_orders` + RLS
- Seed des 8 produits

### Note sur Shopify :
Shopify n'est pas connecte au projet. Les produits seront geres en interne dans la base de donnees. Si tu souhaites connecter Shopify plus tard, on pourra l'ajouter.

