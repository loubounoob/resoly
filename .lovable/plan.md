

# Boutique 100% Pieces -- Shopify = Catalogue uniquement

## Objectif
Utiliser Shopify uniquement comme source de produits (catalogue). Tous les achats se font exclusivement en pieces virtuelles. Les commandes sont enregistrees dans la base de donnees de l'application avec toutes les informations necessaires (produit, variante, adresse, client).

## Ce qui change

### 1. Nouvelle table `coin_orders` dans la base de donnees
Remplace la logique Shopify Admin API. Stocke toutes les commandes :
- `user_id`, `product_title`, `variant_title`, `variant_id`
- `selected_options` (JSON : taille, couleur, etc.)
- `coins_spent`, `price_amount`, `price_currency`
- `shipping_first_name`, `shipping_last_name`, `shipping_address1`, `shipping_address2`, `shipping_city`, `shipping_zip`, `shipping_country`, `shipping_phone`
- `email`
- `status` (pending, confirmed, shipped, delivered)
- Protection RLS : les utilisateurs voient uniquement leurs propres commandes

### 2. Simplification de la Edge Function `purchase-with-coins`
- Suppression de tout appel a l'API Admin Shopify (plus besoin de token)
- Deduction des pieces du profil utilisateur
- Insertion de la commande dans `coin_orders`
- Sauvegarde des infos de livraison dans le profil pour pre-remplissage futur

### 3. Simplification du panier (cart)
- Le panier devient 100% local (Zustand sans appels Shopify Cart API)
- Plus de `cartId`, `checkoutUrl`, `lineId`, ni de sync avec Shopify
- Le panier stocke simplement les articles avec produit, variante, quantite
- Le bouton "Commander" ouvre le formulaire de livraison puis paye en pieces

### 4. Mise a jour du CartDrawer
- Remplacement du bouton "Payer avec Shopify" par "Payer en pieces"
- Affichage du total en pieces au lieu d'euros
- Clic sur "Payer" ouvre le `ShippingFormDrawer`, puis appelle `purchase-with-coins` pour chaque article

### 5. Mise a jour des pages Shop et ProductDetail
- Suppression du bouton "Ajouter au panier" pour paiement euros
- Un seul bouton "Ajouter au panier" (qui ajoute pour paiement en pieces)
- Affichage du prix en pieces en priorite (le prix euros peut rester a titre indicatif)
- Le bouton "Acheter maintenant en pieces" reste sur la page detail

### 6. Nettoyage
- Suppression des mutations Shopify Cart (cartCreate, cartLinesAdd, etc.) de `lib/shopify.ts` -- on garde uniquement `fetchShopifyProducts` et `storefrontApiRequest`
- Suppression du hook `useCartSync` (plus de sync Shopify)
- Suppression du `CartSyncWrapper` dans `App.tsx`
- Suppression de la Edge Function `shopify-oauth` et de la table `shopify_tokens` (plus necessaires)

## Details techniques

### Schema `coin_orders`
```text
coin_orders
+-----------------------+-----------+
| user_id               | uuid      |
| product_title         | text      |
| variant_title         | text      |
| variant_id            | text      |
| selected_options      | jsonb     |
| coins_spent           | integer   |
| price_amount          | numeric   |
| price_currency        | text      |
| shipping_first_name   | text      |
| shipping_last_name    | text      |
| shipping_address1     | text      |
| shipping_address2     | text      |
| shipping_city         | text      |
| shipping_zip          | text      |
| shipping_country      | text      |
| shipping_phone        | text      |
| email                 | text      |
| status                | text      |
| created_at            | timestamp |
+-----------------------+-----------+
RLS: SELECT/INSERT pour user_id = auth.uid()
```

### Nouveau cartStore simplifie
```text
CartItem = { product, variantId, variantTitle, price, quantity, selectedOptions }
CartStore = { items[], addItem, updateQuantity, removeItem, clearCart }
(plus de cartId, checkoutUrl, lineId, isLoading async, syncCart)
```

### Flux d'achat
```text
1. Utilisateur ajoute au panier (local)
2. Clic "Commander" dans le panier
3. Formulaire de livraison s'ouvre
4. Confirmation → appel purchase-with-coins pour chaque article
5. Pieces deduites, commande enregistree dans coin_orders
6. Panier vide
```

## Fichiers modifies
- `src/stores/cartStore.ts` -- simplifie (local uniquement)
- `src/lib/shopify.ts` -- suppression mutations cart, garde catalogue
- `src/components/CartDrawer.tsx` -- paiement en pieces
- `src/pages/Shop.tsx` -- un seul bouton "ajouter au panier"
- `src/pages/ShopifyProductDetail.tsx` -- simplifie
- `src/hooks/useCartSync.ts` -- supprime
- `src/App.tsx` -- supprime CartSyncWrapper
- `supabase/functions/purchase-with-coins/index.ts` -- supprime Shopify API, ajoute insert coin_orders
- Migration SQL -- creation table `coin_orders`

