

# Trois modifications

## 1. Slider de mise : max 1 000 euros, defaut 100 euros

Dans `src/pages/CreateChallenge.tsx` :
- Changer la valeur initiale de `betAmount` de 50 a 100
- Changer le `max` du Slider de 5000 a 1000
- Mettre a jour le label de borne droite de "5 000 euros" a "1 000 euros"

## 2. Enlever le prix EUR des fiches produits dans le Shop

Dans `src/pages/Shop.tsx` :
- Supprimer la ligne qui affiche `{parseFloat(price.amount).toFixed(2)} {price.currencyCode}` (ligne 48) dans le composant `ShopifyProductCard`
- Garder uniquement le prix en pieces

## 3. Afficher les produits du shop dans la page de creation du defi

Dans `src/pages/CreateChallenge.tsx` :
- Importer `fetchShopifyProducts` et le type `ShopifyProduct` depuis `@/lib/shopify`
- Charger les produits au montage avec un `useEffect` + `useState`
- Calculer le prix en pieces de chaque produit (prix EUR x 50)
- Ajouter une section "Ce que tu pourras acheter" entre le summary card et le code promo
- Afficher un carrousel horizontal (scroll) de cartes produits compactes : image, nom, prix en pieces
- Mettre en evidence les produits accessibles avec les pieces calculees (opacite reduite ou badge "accessible" selon que `coinsPreview >= coinsPrice`)
- L'utilisateur peut ainsi ajuster sa mise / duree / sessions pour atteindre le nombre de pieces qu'il souhaite

### Details techniques

**Fichiers modifies** :
- `src/pages/CreateChallenge.tsx` : slider max 1000, defaut 100, section produits
- `src/pages/Shop.tsx` : suppression prix EUR

La section produits sera un scroll horizontal avec des cartes de ~120px de large, affichant l'image en carre, le nom tronque et le prix en pieces. Les produits dont le prix en pieces est inferieur ou egal a `coinsPreview` auront un badge vert "Accessible", les autres seront legerement estompes pour inciter l'utilisateur a augmenter sa mise.

