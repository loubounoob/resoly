

## Achats en pieces avec formulaire de livraison + commandes Shopify

### Probleme actuel
Quand un utilisateur achete avec des pieces, la commande n'apparait pas dans Shopify car le `SHOPIFY_ACCESS_TOKEN` n'a pas le scope `write_orders`. De plus, aucune information de livraison (nom, prenom, adresse) n'est collectee, donc meme si la commande etait creee, elle serait incomplete.

### Solution proposee

Ajouter un **formulaire de livraison** (nom, prenom, adresse, ville, code postal, pays, telephone) qui s'affiche quand l'utilisateur clique sur "Acheter avec pieces". Ce formulaire collecte les memes informations qu'un checkout Shopify classique. Les donnees sont envoyees a l'edge function qui cree une vraie commande Shopify avec toutes les infos client.

### Flow utilisateur

1. L'utilisateur selectionne un produit et ses options (taille, couleur)
2. Il clique sur "Acheter avec X pieces"
3. Un **drawer/modal** s'ouvre avec un formulaire d'adresse de livraison (prenom, nom, adresse, complement, ville, code postal, pays, telephone)
4. L'utilisateur remplit et valide
5. L'edge function verifie le solde, deduit les pieces, et cree la commande Shopify avec les infos de livraison
6. Toast de confirmation

### Changements prevus

**1. Nouveau composant `src/components/ShippingFormDrawer.tsx`**
- Drawer avec formulaire : prenom, nom, adresse ligne 1, adresse ligne 2 (optionnel), ville, code postal, pays (defaut France), telephone
- Bouton "Confirmer et payer avec X pieces"
- Validation des champs obligatoires

**2. Modification de `src/pages/ShopifyProductDetail.tsx`**
- Le bouton "Acheter avec pieces" ouvre le drawer au lieu d'appeler directement l'edge function
- Le drawer passe les infos de livraison au `handleBuyWithCoins`
- La fonction envoie les infos shipping dans le body de la requete a l'edge function

**3. Modification de `supabase/functions/purchase-with-coins/index.ts`**
- Accepter les champs `shipping` dans le body : `firstName`, `lastName`, `address1`, `address2`, `city`, `zip`, `country`, `phone`
- Creer la commande Shopify avec `shipping_address` et `customer` complets :

```
order: {
  line_items: [{ variant_id, quantity: 1 }],
  financial_status: "paid",
  shipping_address: {
    first_name, last_name, address1, address2, city, zip, country, phone
  },
  customer: { first_name, last_name, email },
  email: user.email,
  note: "Paye avec X pieces",
  tags: "coins-purchase",
  transactions: [{ kind: "sale", status: "success", amount, gateway: "Pieces" }]
}
```

- Cela produira une commande complete dans Shopify Admin, identique a une commande classique

**4. Sauvegarder l'adresse dans le profil (optionnel mais recommande)**
- Ajouter des colonnes `first_name`, `last_name`, `address1`, `city`, `zip`, `country`, `phone` dans la table `profiles` pour pre-remplir le formulaire lors des achats suivants

### Details techniques

**Fichiers crees** :
- `src/components/ShippingFormDrawer.tsx` - Formulaire de livraison dans un drawer

**Fichiers modifies** :
- `src/pages/ShopifyProductDetail.tsx` - Integrer le drawer + passer shipping a l'edge function
- `supabase/functions/purchase-with-coins/index.ts` - Accepter et utiliser les donnees de livraison dans la commande Shopify

**Migration base de donnees** :
- Ajouter les colonnes d'adresse a la table `profiles` pour pre-remplissage futur

### Note importante
La creation de commande Shopify depend du scope `write_orders` du `SHOPIFY_ACCESS_TOKEN`. Si le scope n'est pas encore actif, les pieces seront deduites et les infos sauvegardees localement, mais la commande Shopify ne sera pas creee tant que le token n'est pas mis a jour. Le systeme est concu pour fonctionner dans les deux cas.
