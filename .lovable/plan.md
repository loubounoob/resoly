

## Bouton fermer le panier vide

Le Sheet a deja un bouton X en haut a droite (ligne 60 de `sheet.tsx`), mais sur mobile en plein ecran il est trop discret (petite icone avec `opacity-70` sur fond sombre).

### Changement

**`src/components/CartDrawer.tsx`** — Ajouter un bouton "Fermer" explicite dans l'etat panier vide, sous l'icone et le texte "Ton panier est vide" :

```tsx
<Button variant="outline" onClick={() => setIsOpen(false)}>
  {t('common.close') || 'Fermer'}
</Button>
```

Egalement rendre le bouton X natif du Sheet plus visible en ajoutant un `z-10` et une taille plus grande sur le `SheetContent` pour qu'il soit clairement cliquable.

### Fichiers modifies

1. **`src/components/CartDrawer.tsx`** — Ajouter un bouton "Fermer" dans le bloc panier vide

