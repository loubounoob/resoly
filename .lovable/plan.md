

## Plan: Compte à rebours 30min pour code promo + animation coins améliorée

### 1. Compte à rebours de 30 minutes

Quand un code promo valide est appliqué, un timer de 30 minutes démarre. Si le timer expire avant que l'utilisateur ne lance le défi, le code promo est automatiquement retiré.

**Changements dans `src/pages/CreateChallenge.tsx`** :
- Ajouter un state `promoExpiresAt: number | null` (timestamp)
- Ajouter un state `timeLeft: number` (secondes restantes)
- Au moment de l'application du code : `setPromoExpiresAt(Date.now() + 30 * 60 * 1000)`
- Un `useEffect` avec `setInterval` toutes les secondes qui décrémente `timeLeft` et qui, à expiration, reset `promoApplied`, `promoExpiresAt`, et affiche un toast d'expiration
- Afficher le countdown formaté `MM:SS` à côté du badge "+50% bonus" en rouge/orange quand < 5 min

### 2. Animation des coins plus visible

L'animation actuelle dure 800ms avec un simple `scale-125`. On la remplace par une animation en 2 phases bien plus visible :

**Phase 1** — Le nombre de base s'affiche barré, puis le nouveau nombre "count-up" depuis la base vers le total boosté avec un effet de compteur incrémental (comme `AnimatedCoinCounter` qui existe déjà dans le projet).

**Phase 2** — Éclat doré + particules autour du nombre pendant ~2s.

**Implémentation concrète** :
- Quand `promoAnimating` passe à `true`, afficher d'abord `baseCoins` barré, puis animer le nombre de `baseCoins` → `coinsPreview` avec un compteur qui s'incrémente sur ~2 secondes
- Ajouter un keyframe `coin-glow-burst` dans `tailwind.config.ts` : scale 1→1.3→1 + glow doré pulsant sur 2s
- Passer `promoAnimating` timeout de 800ms → 2500ms
- Ajouter un badge flottant "+50%" qui apparaît au-dessus du nombre avec une animation `slide-up` + `fade-in`

### 3. Traductions

Ajouter dans les 3 fichiers i18n :
- `promoExpired` : "Code expiré ! Réapplique-le." / "Code expired! Re-apply it." / "Code abgelaufen! Erneut anwenden."
- `promoTimeLeft` : "Temps restant" (affiché à côté du timer)

### 4. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/CreateChallenge.tsx` | Timer 30min + countdown UI + animation coins améliorée |
| `tailwind.config.ts` | Keyframe `coin-glow-burst` |
| `src/i18n/locales/fr.ts` | Clés `promoExpired`, `promoTimeLeft` |
| `src/i18n/locales/en.ts` | Idem |
| `src/i18n/locales/de.ts` | Idem |

