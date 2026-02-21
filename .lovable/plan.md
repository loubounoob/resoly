
## Modifier le style des cercles verts (jours de la semaine)

Le probleme : les cercles de check des jours de la semaine ont un fond vert vif avec un texte blanc, ce qui donne un aspect "plein" pas tres esthetique. L'objectif est de revenir au style avec un fond sombre (couleur du fond de l'app) et un contour vert + texte vert.

### Changements prevus

**1. Dashboard - Cercles du tracker hebdomadaire** (`src/pages/Dashboard.tsx`)
- Remplacer le style des jours valides : au lieu de `bg-gradient-primary text-primary-foreground shadow-glow` (fond vert plein, texte blanc), utiliser `border-2 border-primary bg-primary/15 text-primary shadow-glow` (fond sombre avec legere teinte verte, bordure verte, texte/checkmark vert)

**2. Friends - Cercles du tracker hebdomadaire** (`src/pages/Friends.tsx`)
- Meme modification que sur le Dashboard pour les cercles de la semaine des amis

### Details techniques

Avant :
```
bg-gradient-primary text-primary-foreground shadow-glow
```

Apres :
```
border-2 border-primary bg-primary/15 text-primary shadow-glow
```

Cela donne un cercle avec :
- Fond quasi-noir avec une legere teinte verte (comme le fond de l'app)
- Bordure verte visible
- Checkmark vert (au lieu de blanc)
- L'effet glow reste present
