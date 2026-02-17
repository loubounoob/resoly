

# Cercle de progression interactif avec couleurs dynamiques

## Changements sur le Dashboard

### 1. Le cercle devient cliquable
Le cercle SVG de progression hebdomadaire devient un bouton qui navigue vers `/verify` (la page de check-in photo). On ajoute un curseur pointer, une icone Camera au centre quand l'objectif n'est pas encore atteint, et un effet de pulsation subtil pour attirer l'attention.

### 2. Couleurs dynamiques du cercle

Trois etats de couleur :

```text
VERT  : weeklyDone >= weeklyGoal (objectif atteint)
ORANGE : en cours, il reste encore du temps
ROUGE  : remaining sessions >= remaining days in week
         (situation critique ou impossible)
```

Calcul des jours restants dans la semaine :
- On compte les jours entre aujourd'hui (inclus) et dimanche
- Si `sessionsRestantes > joursRestants` → rouge (impossible de rattraper)
- Si `sessionsRestantes == joursRestants` → rouge aussi (aucune marge)

### 3. Suppression du bouton "Check-in maintenant"
Le bouton vert classique en bas est supprime. Le cercle le remplace entierement comme point d'entree principal pour le check-in.

### Details techniques

**Fichier modifie** : `src/pages/Dashboard.tsx`

- Ajout d'un calcul `daysLeftInWeek` (nombre de jours restants dimanche inclus)
- Calcul de `sessionsRemaining = weeklyGoal - weeklyDone`
- Logique de couleur :
  - `isGoalMet = weeklyDone >= weeklyGoal` → gradient vert (actuel)
  - `isUrgent = sessionsRemaining >= daysLeftInWeek && !isGoalMet` → gradient rouge
  - Sinon → gradient orange
- Le `linearGradient` du SVG change dynamiquement ses `stopColor` selon l'etat
- Le conteneur du cercle est enveloppe dans un `<button onClick={() => navigate("/verify")}>`  avec `cursor-pointer` et une animation `hover:scale-105`
- Au centre du cercle, sous le compteur `X/Y`, ajout d'une petite icone Camera avec le texte "Check-in" quand l'objectif n'est pas atteint
- Suppression du `<Button>` "Check-in maintenant" (lignes 256-262)
- Le lien "Mes pieces" reste en bas

