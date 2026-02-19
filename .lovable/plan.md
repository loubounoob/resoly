

## Plan : Achat de pieces + Systeme de parrainage

### Ce qui sera fait

**1. Drawer "Acheter des pieces"** : en cliquant sur le badge de pieces (dashboard, boutique, etc.), un drawer s'ouvre avec :
- 4 packs : 500 pieces (10EUR), 1000 pieces (20EUR), 2500 pieces (50EUR), 5000 pieces (100EUR)
- Un bouton pour chaque pack qui declenche un paiement Stripe
- Une section "Parrainage" en bas avec le code invite de l'utilisateur et un bouton copier

**2. Edge Function `buy-coins`** : cree une session Stripe Checkout pour acheter un pack de pieces. Au retour (page payment-success), les pieces sont creditees au profil.

**3. Edge Function `credit-coins-after-payment`** : appelee par la page payment-success pour verifier le paiement Stripe et crediter les pieces.

**4. Systeme de parrainage** :
- A l'inscription, le champ `?invite=CODE` dans l'URL est capture et stocke dans le profil comme `referred_by` (user_id du parrain)
- Quand un filleul cree son profil avec un code parrain valide : +50 pieces pour le parrain
- Quand un filleul cree un defi de +50EUR : +250 pieces supplementaires pour le parrain

---

### Details techniques

**Migration SQL** :
```
ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(user_id);
```

**Nouveau composant `src/components/BuyCoinsDrawer.tsx`** :
- Drawer avec les 4 packs affiches en cartes
- Section parrainage avec code invite + bouton copier
- Appel a `supabase.functions.invoke("buy-coins", { body: { pack } })` au clic
- Redirection vers Stripe Checkout (window.location.href)

**Edge Function `supabase/functions/buy-coins/index.ts`** :
- Recoit le pack choisi (10, 20, 50, 100)
- Cree une session Stripe Checkout avec le montant correspondant
- Metadata : `{ type: "coin_purchase", coins: X, user_id }` pour verification ensuite
- success_url : `/payment-success?session_id={CHECKOUT_SESSION_ID}&type=coins`

**Modification de `src/pages/PaymentSuccess.tsx`** :
- Detecter `type=coins` dans les params
- Appeler une edge function `verify-coin-purchase` pour crediter les pieces
- Afficher un message de succes adapte

**Edge Function `supabase/functions/verify-coin-purchase/index.ts`** :
- Recupere la session Stripe, verifie le paiement
- Lit les metadata pour connaitre le nombre de pieces
- Credite le profil de l'utilisateur (ajout atomique avec `coins + X`)
- Protection contre double-credit (verifier si deja traite)

**Modification de `src/pages/Auth.tsx`** :
- Lire `?invite=CODE` depuis l'URL
- Stocker dans `localStorage` pour le reprendre apres inscription
- Passer le code dans `signUp({ options: { data: { invite_code_used: CODE } } })`

**Modification du trigger `handle_new_user` (migration SQL)** :
- Lire `invite_code_used` depuis `raw_user_meta_data`
- Chercher le parrain par son `invite_code`
- Si trouve : mettre `referred_by = parrain.user_id` + crediter 50 pieces au parrain

**Modification de `create-challenge-payment` ou `verify-payment`** :
- Quand un defi est cree avec une mise >= 50EUR, verifier si l'utilisateur a un `referred_by`
- Si oui et que c'est la premiere fois (premier defi du filleul >= 50EUR) : crediter 250 pieces au parrain

**Modification du Dashboard (coin badge)** :
- Rendre le badge de pieces cliquable
- Ouvrir le `BuyCoinsDrawer` au clic

**Fichiers crees :**
- `src/components/BuyCoinsDrawer.tsx`
- `supabase/functions/buy-coins/index.ts`
- `supabase/functions/verify-coin-purchase/index.ts`
- 1 migration SQL (colonne `referred_by` + mise a jour du trigger)

**Fichiers modifies :**
- `src/pages/Dashboard.tsx` (badge cliquable)
- `src/pages/Auth.tsx` (capture du code invite)
- `src/pages/PaymentSuccess.tsx` (gestion type=coins)
- `supabase/functions/verify-payment/index.ts` (bonus parrainage 250 pieces)
- `src/pages/Shop.tsx` / `src/pages/Rewards.tsx` (si badge de pieces present, le rendre cliquable aussi)

