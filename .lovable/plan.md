

## Plan : Achats en pieces identiques aux achats en euros + variantes

### 1. Donner 100 000 pieces a l'utilisateur
- Mettre a jour le profil de l'utilisateur `930c1035-5920-4aab-b102-c53b8412cdeb` avec `coins = 100000`

### 2. Ajouter la selection de variantes (tailles, couleurs) sur la page detail produit
- `ShopifyProductDetail.tsx` : ajouter un selecteur pour chaque option du produit (ex: Taille S/M/L/XL, Couleur)
- Le variant selectionne determine le prix, la disponibilite, et l'ID utilise pour l'ajout au panier ou l'achat en pieces
- Afficher les options sous forme de boutons cliquables (style "chip")

### 3. Rendre l'achat en pieces identique a l'achat en euros
Actuellement, l'achat en pieces appelle directement une edge function qui deduit les pieces et tente de creer une commande Shopify (echoue a cause des scopes). Pour que ce soit "pareil" :

**Approche : achat en pieces via le panier Shopify (meme flow que l'argent reel)**
- Quand l'utilisateur clique "Acheter avec pieces" :
  1. Verifier le solde de pieces cote serveur (edge function)
  2. Deduire les pieces
  3. Creer un panier Shopify via l'API Storefront (cote client, meme methode que l'ajout au panier classique)
  4. Mais au lieu d'envoyer vers le checkout Shopify (qui demande un vrai paiement), on cree une commande directement via l'Admin API dans l'edge function

**Probleme identifie** : Le `SHOPIFY_ACCESS_TOKEN` actuel n'a pas le scope `write_orders`, ce qui empeche la creation de commandes Shopify. L'edge function continuera a deduire les pieces et a tenter la creation de commande. Si le scope est ajoute plus tard, les commandes apparaitront automatiquement.

**Solution pragmatique retenue** :
- L'edge function `purchase-with-coins` reste le point central pour l'achat en pieces
- Elle deduit les pieces + cree la commande Shopify (quand le scope sera actif)
- On ajoute le passage du **variant selectionne** (avec taille/couleur) dans l'appel
- On enregistre egalement la commande dans la table `shop_orders` de la base de donnees pour garder une trace locale

### 4. Modifications de fichiers

**`src/pages/ShopifyProductDetail.tsx`** :
- Ajouter un state `selectedVariantIndex` pour gerer la selection de variante
- Afficher les options du produit (tailles, couleurs) sous forme de boutons selectionnables
- Mettre a jour le prix affiche (EUR et pieces) selon le variant selectionne
- Passer le variant selectionne dans les appels `addItem` et `handleBuyWithCoins`

**`src/pages/Shop.tsx`** :
- Pas de changement majeur (les cartes produit restent simples, la selection de variante se fait sur la page detail)

**`supabase/functions/purchase-with-coins/index.ts`** :
- Ajouter le support d'options selectionnees dans le body de la requete
- Inclure les options dans la note de la commande Shopify

**Base de donnees** :
- UPDATE du profil utilisateur pour mettre `coins = 100000`

### 5. Tests a effectuer
- Naviguer vers un produit, selectionner une taille, acheter avec pieces
- Verifier que les pieces sont bien deduites
- Verifier le solde mis a jour dans l'interface
- Comparer le flow avec l'ajout au panier classique

