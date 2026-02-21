

## Refonte des cartes commandes

### Ce qui change

1. **Photo produit** -- Charger les produits Shopify au montage de la page, puis associer chaque commande a son image via le `variant_id` stocke dans `coin_orders`. Afficher la photo a gauche de chaque carte (miniature carree 64x64).

2. **Barre de progression visuelle** -- Sous chaque carte, ajouter une barre horizontale a 5 etapes (En attente, Preparation, Livraison, Arrive bientot, Arrive). La portion remplie correspond au statut calcule dynamiquement. Couleur degradee selon l'avancement.

3. **Navigation vers le produit** -- Rendre chaque carte cliquable. Au clic, naviguer vers `/shopify/{handle}` en retrouvant le handle du produit grace aux donnees Shopify chargees.

4. **Amelioration esthetique** -- Nouvelle mise en page : image a gauche, infos a droite, badge statut en haut a droite, barre de progression en bas de la carte.

---

### Details techniques

**Chargement des images Shopify**
- Appeler `fetchShopifyProducts(50)` dans un `useEffect` au montage de la page `Orders.tsx`
- Construire un dictionnaire `variantId -> { imageUrl, handle }` a partir des produits retournes
- Matcher chaque `order.variant_id` avec ce dictionnaire pour afficher l'image et permettre la navigation

**Barre de progression**
- Mapper les 5 statuts a un index numerique (0-4) : pending=0, preparing=1, shipping=2, arriving=3, delivered=4
- Afficher une barre `Progress` ou une barre custom avec 5 segments/points
- La barre se remplit proportionnellement : `(statusIndex + 1) / 5 * 100`

**Structure de la carte**
```
+--------------------------------------------------+
| [Image 64x64] | Titre produit      [Badge statut]|
|                | Variante (S, M...)               |
|                | 500 pieces       21 fev. 2026    |
+--------------------------------------------------+
| [===progress bar===============-------]          |
| En attente  Prep.  Livraison  Bientot  Arrive    |
+--------------------------------------------------+
```

**Fichier modifie** : `src/pages/Orders.tsx` uniquement
- Import de `fetchShopifyProducts` depuis `@/lib/shopify`
- Ajout d'un `useState` + `useEffect` pour les produits Shopify
- Carte rendue cliquable avec `onClick={() => navigate(/shopify/${handle})}`
- Ajout de la barre de progression sous chaque carte

