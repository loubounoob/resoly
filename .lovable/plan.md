

## Plan : App Store Ready — Sécurité, Conformité & Automatisation

### 1. Suppression de compte + endpoint RGPD

**Edge Function `delete-account`** : supprime toutes les données utilisateur (check_ins, challenges, rewards, notifications, push_tokens, friendships, social_challenge_members, coin_orders, shop_orders, profiles) puis appelle `supabase.auth.admin.deleteUser(userId)`. Authentifié via `getClaims()`.

**Frontend `Settings.tsx`** : ajouter un bouton "Supprimer mon compte" avec AlertDialog de confirmation. Appelle `supabase.functions.invoke('delete-account')`, puis sign out et redirect vers `/`.

**i18n** : ajouter les clés `settings.deleteAccount`, `settings.deleteAccountConfirm`, `settings.deleteAccountDescription` dans fr/en/de.

### 2. Privacy Policy

**Page `src/pages/PrivacyPolicy.tsx`** : page publique accessible sans auth, contenant la politique de confidentialité (données collectées, Stripe, géolocalisation, photos, durée de rétention, contact RGPD).

**Route** : ajouter `/privacy` dans App.tsx (non protégée).

**Lien dans Settings** : ajouter un lien vers `/privacy`.

**Lien dans Landing** : ajouter un lien en footer.

### 3. Sécuriser le webhook Stripe

**`verify-payment/index.ts`** : dans le path webhook (`isWebhook`), utiliser `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` au lieu de parser directement le JSON. Lire le body en `req.text()`, valider la signature via le header `stripe-signature`, puis parser l'event.

**Secret** : demander à l'utilisateur d'ajouter `STRIPE_WEBHOOK_SECRET` via l'outil `add_secret`.

### 4. Remboursement automatique (déjà en place)

`complete-challenge/index.ts` appelle déjà `stripe.refunds.create()` pour les défis réussis. `fail-challenge/index.ts` ne rembourse pas. **Aucun changement nécessaire** — la logique est correcte.

### 5. Planifier les crons

Exécuter deux `cron.schedule` via l'outil insert SQL (pas migration) :

- `check-challenge-peril` : tous les jours à 10h00 UTC
- `fail-challenge` : tous les jours à 23h00 UTC

Les deux appellent les Edge Functions existantes via `net.http_post`.

### 6. `verify_jwt` sur les Edge Functions

**Note importante** : le projet utilise le système signing-keys. `verify_jwt = true` ne fonctionne pas avec signing-keys. La validation JWT se fait déjà en code via `getClaims()` dans les fonctions authentifiées. Les fonctions cron/webhook ont `verify_jwt = false` par nécessité. **Aucun changement à faire** — c'est déjà la bonne approche.

### 7. APNs dans Firebase

**Action manuelle requise (pas de code)** : l'utilisateur doit uploader la clé APNs (.p8) dans Firebase Console > Project Settings > Cloud Messaging > Apple app configuration. Lovable ne peut pas faire cette action. Je fournirai les instructions détaillées.

### 8. Vérifier produits physiques uniquement

Les coins sont échangeables uniquement contre des produits Shopify (physiques). L'achat de coins via Stripe (`buy-coins`) est un achat de monnaie virtuelle échangeable contre des biens physiques — c'est conforme aux guidelines Apple (pas d'IAP requis car les coins ne débloquent pas de contenu digital). **Aucun changement nécessaire**, mais j'ajouterai un commentaire documentant cette distinction.

---

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/functions/delete-account/index.ts` | Créer |
| `supabase/config.toml` | Ajouter `[functions.delete-account]` |
| `src/pages/Settings.tsx` | Ajouter bouton suppression + lien privacy |
| `src/pages/PrivacyPolicy.tsx` | Créer |
| `src/App.tsx` | Ajouter route `/privacy` |
| `supabase/functions/verify-payment/index.ts` | Sécuriser webhook signature |
| `src/i18n/locales/fr.ts` | Clés suppression + privacy |
| `src/i18n/locales/en.ts` | Clés suppression + privacy |
| `src/i18n/locales/de.ts` | Clés suppression + privacy |
| SQL insert (crons) | 2 `cron.schedule` |
| Secret `STRIPE_WEBHOOK_SECRET` | Demander à l'utilisateur |

