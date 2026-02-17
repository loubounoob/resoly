

# Pseudo obligatoire pour tous les utilisateurs

## Objectif
Chaque utilisateur doit avoir un pseudo unique (`username`). Il sera visible dans l'interface et requis des la connexion. Les comptes existants recevront un pseudo genere automatiquement.

## 1. Migration base de donnees

- Attribuer un pseudo aleatoire aux comptes existants qui n'en ont pas (format : `user_XXXX` avec 4 caracteres aleatoires)
- Generer un `invite_code` pour les comptes qui n'en ont pas
- Ajouter une contrainte `UNIQUE` sur la colonne `username` (deja nullable, on ne la rend pas NOT NULL car le trigger `handle_new_user` ne genere pas de username a la creation -- on gere cote app)
- Mettre a jour le trigger `handle_new_user` pour generer automatiquement un username et un invite_code a chaque nouveau compte

## 2. Ecran de saisie du pseudo (intercepteur)

Creer un composant `UsernameGuard` qui enveloppe les routes protegees :
- Verifie si le profil de l'utilisateur a un `username` defini
- Si non : affiche un ecran plein-page obligatoire pour choisir son pseudo
  - Champ de saisie avec validation (min 3 caracteres, max 20, alphanumerique + underscores)
  - Verification en temps reel de la disponibilite (requete debounced sur `profiles`)
  - Bouton "Confirmer" desactive tant que le pseudo n'est pas valide et disponible
  - Pas de bouton retour -- l'utilisateur ne peut pas continuer sans pseudo
- Si oui : affiche les enfants normalement

## 3. Affichage du pseudo dans l'interface

- **Dashboard** : afficher `@username` sous le nom/logo en haut de page
- **Page Amis** : afficher le pseudo `@username` sur chaque carte d'ami dans le fil d'activite et le classement
- **Page Amis - Drawer d'ajout** : afficher le pseudo dans les resultats de recherche et les demandes en attente

## 4. Inscription -- pseudo a la creation de compte

- Ajouter un champ "Pseudo" dans le formulaire d'inscription (`Auth.tsx`) avec verification de disponibilite en temps reel
- Envoyer le pseudo dans `raw_user_meta_data` au signup, et le trigger `handle_new_user` l'enregistrera dans `profiles.username`

## Details techniques

### Fichiers modifies
| Fichier | Changement |
|---------|-----------|
| Migration SQL | Username aleatoire pour existants, update trigger `handle_new_user`, contrainte unique |
| `src/App.tsx` | Wrapper `UsernameGuard` autour des routes protegees |
| `src/pages/Auth.tsx` | Ajout champ pseudo a l'inscription + validation disponibilite |
| `src/pages/Dashboard.tsx` | Affichage `@username` |
| `src/pages/Friends.tsx` | Affichage `@username` dans le fil et le classement |
| `src/hooks/useFriends.ts` | Inclure `username` dans les selects si pas deja fait |

### Fichiers crees
| Fichier | Description |
|---------|-----------|
| `src/components/UsernameGuard.tsx` | Intercepteur qui bloque l'acces sans pseudo |

### Validation du pseudo
- Regex : `/^[a-zA-Z0-9_]{3,20}$/`
- Verification unicite via requete `profiles.username` avec `ilike` exact match
- Feedback visuel : icone check vert si disponible, croix rouge si pris

