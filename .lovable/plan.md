

## Modifications a effectuer

### 1. BuyCoinsDrawer : copier uniquement le code, pas un lien

Le bouton de parrainage copie actuellement un lien complet (`https://...//auth?invite=CODE`). Il faut copier uniquement le code.

**Fichier : `src/components/BuyCoinsDrawer.tsx`**
- Ligne 50 : remplacer `const link = ...` par simplement `inviteCode`
- Ligne 51 : copier `inviteCode` au lieu de `link`
- Ligne 53 : changer le toast en "Code copie !"
- Ligne 104 : changer "Partage ton lien" en "Partage ton code"

### 2. CreateSocialChallenge : afficher le username au lieu du display_name

Dans la liste des amis (etape "target"), le composant affiche `f.display_name || f.first_name || "Ami"` (ligne 262). Il faut afficher `f.username` a la place.

**Fichier : `src/pages/CreateSocialChallenge.tsx`**
- Ligne 95 : modifier `getInitials` pour utiliser `p?.username` en priorite
- Ligne 262 : remplacer `{f.display_name || f.first_name || "Ami"}` par `{f.username || "Ami"}`

### 3. Verification du systeme de parrainage

Le systeme de parrainage est deja fonctionnel :
- **50 pieces au parrain** : gere par le trigger `handle_new_user` dans la base de donnees quand un filleul s'inscrit avec un code
- **250 pieces bonus** : gere par l'edge function `verify-payment` quand le filleul cree un defi de 50EUR ou plus

Aucune modification necessaire cote parrainage, le code est correct.

### Resume des changements

| Fichier | Modification |
|---------|-------------|
| `src/components/BuyCoinsDrawer.tsx` | Copier le code seul, pas un lien. Texte "Partage ton code" |
| `src/pages/CreateSocialChallenge.tsx` | Afficher `username` au lieu de `display_name` dans la liste d'amis |

