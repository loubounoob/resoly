

## Plan : Dashboard non-scrollable + Système i18n complet (3 langues, multi-devises)

Ce projet comporte **deux parties** : un correctif rapide et une refonte majeure.

---

### Partie 1 : Dashboard fixe (non-scrollable)

**Problème** : Le dashboard (état "aucun défi actif") a un léger scroll indésirable.

**Solution** : Ajouter `overflow-hidden` et `h-screen` sur le conteneur du dashboard quand il n'y a pas de défi actif, et `overflow-y-auto` quand il y a un défi (car le contenu est long).

**Fichier** : `src/pages/Dashboard.tsx`  
- État sans défi : `min-h-screen` → `h-screen overflow-hidden`  
- État avec défi : garder `min-h-screen` + ajouter `overflow-y-auto`

---

### Partie 2 : Internationalisation complète

#### Architecture i18n

1. **Fichiers de traductions** (`src/i18n/`)
   - `src/i18n/locales/fr.ts` — toutes les chaînes en français
   - `src/i18n/locales/en.ts` — toutes les chaînes en anglais  
   - `src/i18n/locales/de.ts` — toutes les chaînes en allemand
   - `src/i18n/types.ts` — type TypeScript pour les clés de traduction
   - `src/i18n/currencies.ts` — config devises par pays

2. **Contexte React** (`src/contexts/LocaleContext.tsx`)
   - Fournit `locale` (fr/en/de), `currency` (EUR/USD/GBP/AUD/CHF/CAD), `currencySymbol`, `country`
   - Hook `useLocale()` pour accéder partout
   - Fonction `t(key)` pour traduire
   - Fonction `formatCurrency(amount)` pour afficher les montants

3. **Mapping pays → langue/devise**

```text
Pays            Langue   Devise   Symbole
─────────────────────────────────────────
France          fr       EUR      €
États-Unis      en       USD      $
Allemagne       de       EUR      €
Irlande         en       EUR      €
Angleterre      en       GBP     £
Australie       en       AUD      A$
Suisse          de       CHF      CHF
Canada          en       CAD      C$
```

#### Détection automatique de la langue

- Au premier chargement de l'app (avant login), utiliser `navigator.language` pour détecter la langue du navigateur
- Mapper `fr-*` → français, `de-*` → allemand, reste → anglais
- Stocker dans `localStorage` comme valeur par défaut

#### Inscription — champ nationalité

**Fichier** : `src/pages/Auth.tsx`
- Ajouter un `Select` "Pays" avec les 8 options (France, États-Unis, Allemagne, Irlande, Angleterre, Australie, Suisse, Canada)
- Stocker dans `metadata.country` lors du `signUp`

**Migration DB** : Ajouter colonne `country` à la table `profiles` (type text, nullable)
- Mettre à jour le trigger de création de profil pour copier `raw_user_meta_data->>'country'`

#### Confirmation de la langue au choix du pays

- Quand l'utilisateur choisit un pays à l'inscription, mettre à jour la langue et la devise immédiatement
- Si le choix contredit la géolocalisation du navigateur, le choix du pays a priorité

#### Fichiers à modifier pour remplacer les chaînes en dur

Chaque fichier ci-dessous contient des textes en français qui devront être remplacés par des appels à `t('cle')` :

| Fichier | Nb approx. de chaînes |
|---------|----------------------|
| `src/pages/Landing.tsx` | ~10 |
| `src/pages/Auth.tsx` | ~15 |
| `src/pages/Dashboard.tsx` | ~25 |
| `src/pages/OnboardingChallenge.tsx` | ~30 |
| `src/pages/CreateChallenge.tsx` | ~20 |
| `src/pages/CreateSocialChallenge.tsx` | ~20 |
| `src/pages/PhotoVerify.tsx` | ~15 |
| `src/pages/Friends.tsx` | ~20 |
| `src/pages/Shop.tsx` | ~10 |
| `src/pages/ShopifyProductDetail.tsx` | ~10 |
| `src/pages/Orders.tsx` | ~10 |
| `src/pages/Notifications.tsx` | ~15 |
| `src/pages/Settings.tsx` | ~8 |
| `src/pages/PaymentSuccess.tsx` | ~12 |
| `src/pages/CreateGroup.tsx` | ~8 |
| `src/components/BottomNav.tsx` | ~5 |
| `src/components/BuyCoinsDrawer.tsx` | ~10 |
| `src/components/ChallengeFailedOverlay.tsx` | ~8 |
| `src/components/ChallengeVictoryOverlay.tsx` | ~10 |
| `src/components/ChallengeAcceptedOverlay.tsx` | ~5 |
| `src/components/UsernameGuard.tsx` | ~6 |
| `src/components/ShippingFormDrawer.tsx` | ~10 |
| `src/components/MotivationSteps.tsx` | ~20 |
| `src/components/GymLocationPicker.tsx` | ~10 |
| `src/components/StoriesBar.tsx` | ~3 |
| `src/components/CartDrawer.tsx` | ~8 |
| `src/components/NotificationBell.tsx` | 0 |

**Total** : ~300+ chaînes × 3 langues

#### Devises — adaptations

- **Slider de mise** (`CreateChallenge.tsx`, `CreateSocialChallenge.tsx`) : afficher `100$`, `100€`, `100£`, `100 CHF`, etc. selon la devise
- **Toutes les mentions de `€`** dans Dashboard, overlays, Friends : remplacer par `formatCurrency(amount)`
- **Packs d'achat de pièces** (`BuyCoinsDrawer.tsx`) : adapter les prix affichés selon la devise (mêmes valeurs numériques : 10/20/50/100)

#### Stripe — adaptation devise

- **Edge functions** (`create-challenge-payment`, `buy-coins`) : passer la devise du user (lue depuis son profil) lors de la création de la session Stripe
- Le montant reste identique (10-1000), seule la devise change

#### IA Gemini — langue de réponse

- **Edge function `verify-photo`** : ajouter la langue au prompt système pour que Gemini réponde dans la bonne langue (français/anglais/allemand)
- Passer le paramètre `locale` depuis le frontend

#### Descriptions produits Shopify — traduction automatique

- Créer un utilitaire qui traduit les descriptions HTML des produits côté client via un appel edge function utilisant Gemini
- Cacher les traductions en mémoire pour éviter les appels répétés

#### Dates — adaptation locale

- `date-fns/locale` : utiliser `fr`, `enUS`, ou `de` selon la langue sélectionnée
- Fichiers concernés : `Orders.tsx`, `Notifications.tsx`, `StoriesBar.tsx`

#### Changement de langue dans les Settings

- Ajouter une section "Langue et pays" dans `Settings.tsx`
- Permettre de changer le pays (ce qui change la langue et la devise)

---

### Ordre d'implémentation

Vu l'ampleur, je propose de découper en étapes :

1. **Fix scroll dashboard** (immédiat)
2. **Infrastructure i18n** : types, contexte, 3 fichiers de traductions
3. **Migration DB** : colonne `country` sur `profiles`
4. **Auth.tsx** : champ pays + détection navigateur
5. **Traduction de toutes les pages** (par lots)
6. **Adaptation devises** (interface + Stripe)
7. **Adaptation IA + traduction produits**
8. **Settings** : changement de langue

### Section technique

- Les fichiers de traductions utilisent un objet TypeScript typé avec des clés imbriquées (ex: `t('dashboard.noChallenge')`)
- Le contexte `LocaleContext` est placé au niveau de `App.tsx`, au-dessus de `AuthProvider`
- La détection de langue par `navigator.language` se fait au montage initial du contexte
- La devise est déterminée par le pays, pas par la langue (ex: Irlande = anglais + EUR)
- Les edge functions reçoivent `locale` et `currency` en paramètre dans le body des requêtes

