
# Modifications multiples

## 1. Desactiver la verification email a l'inscription
- Utiliser l'outil configure-auth pour activer l'auto-confirm des emails
- Modifier `Auth.tsx` : apres un `signUp` reussi, naviguer directement vers `/dashboard` au lieu d'afficher le message "verifie ton email"

## 2. Mise fixe (pas mensuelle) dans CreateChallenge
- Renommer le label "Mise mensuelle" en "Ta mise" et supprimer le "/mois"
- Changer le max du slider de 200 a 5000, step de 10
- Changer les bornes affichees (10 euros / 5 000 euros)
- Le `totalBet` devient simplement `betAmount` (plus de multiplication par la duree)
- Adapter le summary card : afficher la mise totale = betAmount directement
- Adapter l'appel a `create-challenge-payment` avec `amount: betAmount`
- Adapter le calcul des coins : `calculateCoins(betAmount, duration, sessionsPerWeek)`

## 3. Sessions max 6 par semaine
- Changer `SESSIONS_OPTIONS` de `[2, 3, 4, 5, 6, 7]` a `[2, 3, 4, 5, 6]`
- Ajuster la grille de `grid-cols-6` a `grid-cols-5`

## 4. Premiere semaine plus genereuse
- Changer la formule de `Math.ceil(sessions * daysLeft / 7)` a `Math.floor(sessions * daysLeft / 7)` pour arrondir a l'inferieur (moins de sessions exigees)
- Si le resultat est 0 et qu'il reste au moins 1 jour, le mettre a 1

## 5. Dashboard : supprimer elements
- Supprimer le compteur de jours consecutifs (badge `{currentStreak}j` en haut a droite)
- Supprimer la ligne "Progression globale : X/Y seances"
- Supprimer le bouton "Mes pieces"
- Tout le code de calcul du streak peut etre supprime aussi

## Details techniques

**Fichiers modifies** :
- `src/pages/Auth.tsx` : navigation directe apres signup
- `src/pages/CreateChallenge.tsx` : mise fixe, max 5000, sessions max 6, premiere semaine genereuse
- `src/pages/Dashboard.tsx` : suppression streak badge, progression globale, bouton mes pieces
- Configuration auth : auto-confirm email
