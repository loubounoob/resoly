

## Pourquoi Apple Pay ne marche pas dans Capacitor/Xcode

### Le probleme

Sur le **web** (Safari), Apple Pay fonctionne automatiquement via Stripe Elements car Safari gere nativement le Payment Request API et ton domaine est verifie par Stripe.

Dans **Capacitor** (WKWebView), c'est different :
- La WebView n'est **pas** Safari — elle ne supporte pas le Payment Request API de la meme maniere
- Apple Pay dans une WebView necessite que le **Merchant ID** soit configure dans Xcode (capability Apple Pay) et que le domaine soit enregistre dans Stripe
- Stripe Elements detecte qu'il est dans une WebView non-Safari et **masque** le bouton Apple Pay

### Ce qu'il faut changer

**Cote code (ce que je peux faire) :**

1. **`PaymentElement` options** — Ajouter `wallets: { applePay: 'auto' }` dans les options du `PaymentElement` pour s'assurer que Stripe tente de l'afficher quand le contexte le permet

2. **`Elements` options** — Ajouter `paymentMethodCreation: 'manual'` n'est pas necessaire ici, mais on peut ajouter le `payment_method_types` cote serveur

3. **Edge Functions** (`create-challenge-payment` et `buy-coins`) — Aucun changement necessaire, `automatic_payment_methods: { enabled: true }` inclut deja Apple Pay

**Cote Xcode (ce que tu dois faire manuellement) :**

1. **Ajouter la capability Apple Pay** dans Xcode :
   - Target > Signing & Capabilities > + Capability > Apple Pay
   - Cocher ton Merchant ID (`merchant.com.resoly.app`)

2. **Enregistrer le Merchant ID** dans le Apple Developer Portal si ce n'est pas deja fait

3. **Enregistrer ton domaine** dans le Stripe Dashboard :
   - Settings > Payment Methods > Apple Pay > Add domain
   - Ajouter le domaine de ton app web ET verifier le fichier `apple-developer-merchantid-domain-association`

4. **Important** : Dans Capacitor, la WebView charge ton preview URL (`lovableproject.com`). Pour la production, tu devras pointer vers ton propre domaine ou utiliser le build local (`webDir: 'dist'`) et enregistrer ce domaine dans Stripe.

### Changement de code minimal

Modifier `StripePaymentSheet.tsx` pour ajouter `wallets` config au `PaymentElement` et s'assurer que le `applePay` wallet est explicitement autorise. Cela ne suffira pas seul — les etapes Xcode ci-dessus sont obligatoires.

### Resume

Le code actuel n'a pas de bug — c'est un probleme d'environnement. Apple Pay dans une WebView Capacitor necessite la capability Xcode + Merchant ID + enregistrement domaine Stripe. Je peux ajouter la config `wallets` dans le code pour etre explicite, mais les etapes Xcode sont indispensables.

