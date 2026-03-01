

## Plan : Barre fixe omniprésente en haut

### Problème
Le `div` fixe en haut n'a pas de hauteur explicite — il utilise `padding-top` via `safe-top`, mais comme il n'a pas de contenu, il est quasi invisible. De plus, le contenu en dessous n'a pas assez de marge pour compenser cette barre fixe.

### Solution

1. **`src/index.css`** — Créer deux nouvelles classes :
   - `.safe-top-bar` : hauteur fixe = `env(safe-area-inset-top, 1rem)` avec `min-height: 1rem` pour le bandeau fixe
   - `.safe-top-spacer` : `padding-top` identique pour pousser le contenu en dessous

2. **`src/App.tsx`** — Modifier le bandeau fixe :
   - Lui donner une hauteur réelle via `h-[max(env(safe-area-inset-top,0px),1rem)]` en style inline
   - Retirer `safe-top` du conteneur principal et le remplacer par un `margin-top` identique pour que le contenu commence après la barre fixe
   - Le bandeau reste `fixed`, `z-[100]`, `bg-background` → il couvre toujours la zone du status bar même au scroll

### Fichiers modifiés
- `src/App.tsx` — Hauteur explicite sur le bandeau fixe + margin-top sur le conteneur
- `src/index.css` — Ajustement/ajout des classes utilitaires

