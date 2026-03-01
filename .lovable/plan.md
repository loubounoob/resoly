

## Plan : 4 corrections i18n + layout

### 1. Espace en haut de l'écran OnboardingChallenge (image 1)

Le composant `OnboardingChallenge.tsx` utilise `fixed inset-0` et commence le contenu avec `pt-5`. Il manque le même safe-area padding que le reste de l'app.

**Fichier** : `src/pages/OnboardingChallenge.tsx` (ligne 247)
- Ajouter un `div` safe-area identique à celui de `App.tsx` en tout premier enfant du conteneur, ou ajouter `style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }}` au conteneur `px-6 pt-5`.

### 2. Stripe : langue et devise (image 2)

La page Stripe Checkout affiche "Payer Resoly" et la description en français malgré un utilisateur anglophone. Deux problèmes :
- **Pas de `locale` passé** à `stripe.checkout.sessions.create()` dans les edge functions
- **La description** est générée côté frontend via `t()` mais ça passe bien la langue. Le problème principal est le `locale` Stripe manquant.

**Fichiers** :
- `supabase/functions/create-challenge-payment/index.ts` : ajouter `locale` dans le body reçu et le passer à `stripe.checkout.sessions.create({ locale: ... })`
- `supabase/functions/buy-coins/index.ts` : idem
- `src/pages/CreateChallenge.tsx` : passer `locale` dans le body de l'invoke
- `src/pages/CreateSocialChallenge.tsx` : idem
- `src/components/BuyCoinsDrawer.tsx` : passer `locale` dans le body

Mapping locale : `fr` → `'fr'`, `en` → `'en'`, `de` → `'de'` (Stripe supporte ces valeurs directement)

### 3. Shopify : descriptions non traduites (image 3)

Les options ("Taille") et descriptions produits viennent de Shopify en français. Deux approches :
- Les noms d'options comme "Taille" restent dans Shopify (pas de traduction côté app pour les noms dynamiques)
- Pour les descriptions HTML : créer une edge function de traduction via Lovable AI, ou traduire côté client

**Approche retenue** : Créer une edge function `translate-text` qui traduit un texte via Lovable AI. L'appeler depuis `ShopifyProductDetail.tsx` pour la description et les noms d'options quand la locale n'est pas `fr`.

**Fichiers** :
- Créer `supabase/functions/translate-text/index.ts`
- Modifier `src/pages/ShopifyProductDetail.tsx` : appeler la traduction pour `descriptionHtml` et les noms d'options si `locale !== 'fr'`

### 4. Gemini : réponse en français au lieu de la langue utilisateur (image 4)

Le prompt dans `verify-photo` utilise déjà `${locale || 'en'}` et le frontend passe `locale`. Cependant, le fallback `reason` par défaut (ligne 87) est en français : `"Impossible d'analyser la photo"`.

De plus, le prompt dit "language requested" mais le modèle peut l'ignorer. Il faut renforcer la directive.

**Fichier** : `supabase/functions/verify-photo/index.ts`
- Changer le fallback reason (ligne 87) pour être dynamique selon la locale
- Renforcer le prompt : `"You MUST respond in ${localeName}. The reason field MUST be written in ${localeName}."`
- Ajouter un mapping locale → nom de langue complet (`fr` → `French`, `en` → `English`, `de` → `German`)

---

### Section technique

- Stripe Checkout accepte un paramètre `locale` qui traduit toute l'interface de paiement (boutons, labels, etc.)
- Pour la traduction Shopify, on utilisera Lovable AI avec un cache mémoire côté client pour éviter les appels répétés
- Le prompt Gemini sera renforcé avec le nom complet de la langue plutôt que le code ISO

