

## Ajouter un parcours de motivation avant "Offrir un defi"

### Concept

Avant d'arriver sur les parametres du defi (mise, seances, duree), l'utilisateur traversera un parcours emotionnel en 3 ecrans courts, type storytelling. Chaque ecran pose une question simple avec des choix rapides (boutons). Le ton est chaleureux, valorisant, et met en avant le geste noble d'offrir un defi sante a un proche.

### Parcours en 3 etapes

**Etape 1 -- "C'est pour qui ?"**
- Titre : "Tu fais ca pour quelqu'un de special."
- Sous-titre : "C'est qui ?"
- Choix (boutons) : Mon pere / Ma mere / Un(e) ami(e) / Mon frere ou ma soeur / Autre
- Icone coeur ou cadeau en haut

**Etape 2 -- "Pourquoi tu lui offres ?"**
- Titre : "Chaque geste compte."
- Sous-titre : "Pourquoi tu veux l'aider ?"
- Choix : Il/elle en a besoin / Pour qu'on se motive ensemble / Pour lui montrer que j'y crois / Juste pour lui faire plaisir

**Etape 3 -- "Pourquoi c'est important"**
- Titre : "Prendre soin de ses proches, c'est rare."
- Sous-titre : "Peu de gens le font. Toi, tu le fais."
- Message court valorisant + bouton "Creer le defi"
- Phrase d'impact en dessous : "La sante de ceux qu'on aime, ca n'a pas de prix."

Apres l'etape 3, on arrive sur le formulaire actuel (parametres du defi).

### Changements techniques

**Fichier modifie : `src/pages/CreateSocialChallenge.tsx`**

- Ajouter un nouveau type d'etape au state `step` : `"motivation1" | "motivation2" | "motivation3" | "params" | "target" | "confirm"`
- Le state initial passe de `"params"` a `"motivation1"`
- Ajouter 3 nouveaux blocs conditionnels pour les ecrans de motivation
- Stocker les reponses dans un state local (pas envoye en base, purement UX)
- Le bouton retour navigue entre les etapes de motivation avant d'arriver aux params
- Aucune modification de base de donnees necessaire
- Aucune nouvelle dependance

### Design visuel

Chaque ecran de motivation :
- Fond uni, centre verticalement
- Grande icone/emoji en haut (Heart, Gift, Star)
- Titre en `text-xl font-bold`
- Sous-titre en `text-sm text-muted-foreground`
- Boutons de choix en `rounded-xl` empiles verticalement, style carte
- Le choix selectionne passe automatiquement a l'ecran suivant (pas de bouton "Suivant")
- Animation fluide grace au changement de step

