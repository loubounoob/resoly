

# Dashboard motivant -- focus effort court terme

## Objectif
Transformer le dashboard pour qu'il mette en avant l'effort a court terme (la semaine en cours) plutot que la fin du defi. Supprimer les elements qui evoquent une "fin" (jours restants) et les remplacer par des indicateurs d'engagement et de motivation.

## Changements sur `src/pages/Dashboard.tsx`

### Supprime
- Le bloc "Jours restants" (lignes 186-193) avec l'icone Calendar et `daysRemaining` -- evoque la fin
- L'import de `Calendar` (plus utilise)
- Le calcul de `daysRemaining`, `endDate` (plus necessaires)

### Remplace le progress ring central
Au lieu d'afficher le pourcentage global du defi (qui rappelle combien il reste), afficher la **progression de la semaine en cours** :
- Anneau = seances faites cette semaine / objectif hebdo
- Texte central : `{thisWeekCheckIns.length}/{challenge.sessions_per_week}` avec "cette semaine" en sous-titre
- Phrase de motivation dynamique sous l'anneau selon le ratio :
  - 0 seances : "C'est le moment de commencer !"
  - En cours mais pas fini : "Continue comme ca, plus que X !"
  - Objectif atteint : "Objectif de la semaine atteint !"

### Enrichir le week tracker
- Ajouter une barre de progression sous les jours (seances faites / objectif semaine)
- Changer le titre de "Cette semaine" a un message plus engageant : "Ta semaine" avec un emoji

### Nouveau bloc "Serie en cours" (remplace jours restants)
- Mettre en avant le streak avec un visuel plus fort (icone feu + nombre grand)
- Message motivant : "X jours d'affilée ! Continue !" ou "Commence ta serie aujourd'hui !"

### Bloc "Pieces a gagner" -- ajouter contexte motivant
- Ajouter une sous-ligne : "Termine ton defi pour les debloquer" pour renforcer la motivation
- Garder l'affichage des pieces mais le rendre plus compact

### Progression globale du defi
- Deplacer l'info `completedSessions/totalSessions` dans un petit indicateur discret en bas (pas en ring central)
- Afficher en texte simple : "Progression globale : X/Y seances" sans l'aspect "countdown"

## Fichiers modifies
- `src/pages/Dashboard.tsx` uniquement

## Resume visuel du nouveau layout
```text
[Header : FitBet | coins | streak]

[Anneau semaine : 2/4 cette semaine]
[Message motivant dynamique]

[Ta semaine -- tracker jours L M M J V S D]
[Barre progression semaine]

[Serie en cours : 5 jours d'affilée]

[Pieces a gagner : 500 -- "Termine ton defi !"]

[Progression globale : 12/48 seances (discret)]

[Bouton Check-in]
[Lien Mes pieces]
```

