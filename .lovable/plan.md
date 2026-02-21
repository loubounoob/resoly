

## Refonte du parcours motivation "Offrir un defi" -- Version motivante et dynamique

### Probleme actuel

Le ton actuel est trop emotionnel/sentimental ("quelqu'un de special", "chaque geste compte", "prendre soin de ses proches c'est rare"). Ca peut mettre mal a l'aise ou decourager certains utilisateurs, surtout entre potes ou avec un proche ou la relation est plus decontractee.

### Nouveau parcours -- 5 etapes courtes, ton motivant et direct

Le nouveau flow sera plus energique, oriente action et challenge, avec un ton complice plutot que sentimental.

**Etape 1 -- "C'est pour qui ?"**
- Icone : Target
- Titre : "Tu veux remettre qui sur les rails ?"
- Sous-titre : "Choisis ta cible."
- Options : Mon pere / Ma mere / Un(e) pote / Mon frere ou ma soeur / Autre

**Etape 2 -- "Il/elle fait du sport en ce moment ?"**
- Icone : Dumbbell (via Activity)
- Titre : "Niveau sport, il/elle en est ou ?"
- Options : Pas du tout / De temps en temps / Regulierement mais peut mieux faire / Il/elle a lache depuis un moment

**Etape 3 -- "Pourquoi maintenant ?"**
- Icone : Zap
- Titre : "Qu'est-ce qui t'a decide ?"
- Options : Je veux qu'on s'y mette ensemble / Il/elle a besoin d'un coup de boost / Je veux lui prouver que j'y crois / C'est un cadeau qui change vraiment quelque chose

**Etape 4 -- "Tu vises quoi pour lui/elle ?"**
- Icone : Trophy
- Titre : "L'objectif, c'est quoi ?"
- Options : Qu'il/elle reprenne une routine / Qu'il/elle se sente mieux / Qu'on se challenge a deux / Qu'il/elle se depasse

**Etape 5 -- Ecran de validation motivant**
- Icone : Rocket
- Titre : "Les vrais passent a l'action."
- Sous-titre : "Offrir un defi, c'est parier sur quelqu'un. Et ca, c'est fort."
- Bouton : "C'est parti" avec icone fusee
- Phrase en bas : "Un defi offert, c'est un game changer."

### Changements techniques

**Fichier : `src/components/MotivationSteps.tsx`**
- Passer de 3 a 5 etapes : `motivation1` a `motivation5`
- Remplacer toutes les questions et options par le nouveau contenu
- Changer les icones : Gift/Heart/Star vers Target/Activity/Zap/Trophy/Rocket
- Ton direct et motivant partout

**Fichier : `src/pages/CreateSocialChallenge.tsx`**
- Mettre a jour le type du state `step` pour inclure `motivation4` et `motivation5`
- Mettre a jour la logique `goBack` pour gerer les 5 etapes
- Mettre a jour le bloc conditionnel qui rend `MotivationSteps` pour inclure les nouvelles etapes

### Design
- Meme structure visuelle (icone ronde en haut, titre, boutons empiles)
- Transition automatique au clic sur une option (etapes 1 a 4)
- Bouton d'action uniquement sur l'etape 5

