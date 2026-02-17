

# Renommage Resoly + Correction du compteur hebdomadaire + Premiere semaine adaptee

## 1. Renommer FitBet en Resoly

Tous les fichiers contenant "FitBet" seront mis a jour :
- `src/pages/Dashboard.tsx` -- header
- `src/pages/Landing.tsx` -- logo + features
- `src/pages/Auth.tsx` -- logo
- `src/pages/CreateChallenge.tsx` -- description Stripe
- `supabase/functions/create-challenge-payment/index.ts` -- product name
- `index.html` -- titre de la page et meta tags
- Mise a jour de la feature "Cote variable selon la difficulte" sur la Landing (supprimee car les cotes n'existent plus), remplacee par un message pertinent

## 2. Correction du compteur hebdomadaire

Le code actuel utilise deja `startOfWeek(now, { weekStartsOn: 1 })` (lundi), ce qui est correct. Le probleme vient probablement du fait que le compteur de streak ("6 jours") n'est pas lie a la semaine mais au nombre total de jours consecutifs. Le compteur affiche "6/3 seances" car il y a effectivement 6 check-ins enregistres dans la semaine courante (plus que l'objectif).

**Correction du streak** : le calcul actuel compare `differenceInDays` avec `<= 1`, ce qui peut compter plusieurs check-ins du meme jour ou mal gerer les ecarts. Il sera refactorise pour compter les jours calendaires uniques consecutifs en partant d'aujourd'hui.

## 3. Premiere semaine intelligemment ajustee

Quand un utilisateur cree un defi un mercredi avec un objectif de 4 seances/semaine, il est injuste d'exiger 4 seances entre mercredi et dimanche. Le systeme doit adapter l'objectif de la premiere semaine.

### Logique d'ajustement
- Calculer le nombre de jours restants dans la semaine a partir de la date de debut du defi
- Appliquer une regle proportionnelle : `objectif_premiere_semaine = ceil(sessions_per_week * jours_restants / 7)`
- Exemple : defi cree un mercredi (5 jours restants), 4x/semaine → `ceil(4 * 5/7)` = 3 seances

### Confirmation par l'utilisateur
- Ajouter une etape de confirmation dans `CreateChallenge.tsx`
- Avant de lancer le defi, afficher un message du type :
  "Tu commences un mercredi. Ton objectif pour cette premiere semaine sera de **3 seances** (au lieu de 4). Ca te va ?"
- L'utilisateur valide, et la valeur `first_week_goal` est sauvegardee dans le challenge

### Modification de la base de donnees
- Ajouter une colonne `first_week_sessions` (integer, nullable) a la table `challenges`
- Si `null`, l'objectif est le meme que `sessions_per_week`

### Modification du Dashboard
- Detecter si on est dans la premiere semaine du defi (`started_at` est dans la semaine courante)
- Si oui, utiliser `first_week_sessions` comme objectif hebdo au lieu de `sessions_per_week`

## Details techniques

### Fichiers modifies
- `src/pages/Dashboard.tsx` -- renommage + logique premiere semaine + fix streak
- `src/pages/Landing.tsx` -- renommage + suppression mention "cotes"
- `src/pages/Auth.tsx` -- renommage
- `src/pages/CreateChallenge.tsx` -- renommage + etape confirmation premiere semaine
- `src/components/BottomNav.tsx` -- aucun changement necessaire
- `supabase/functions/create-challenge-payment/index.ts` -- renommage
- `index.html` -- titre Resoly
- Migration SQL : `ALTER TABLE challenges ADD COLUMN first_week_sessions integer;`

### Calcul du streak (corrige)
```text
1. Trier les check-ins verifies par date decroissante
2. Extraire les dates calendaires uniques (sans heure)
3. Partir d'aujourd'hui : si pas de check-in aujourd'hui, partir d'hier
4. Compter les jours consecutifs sans trou
```

### Flux premiere semaine dans CreateChallenge
```text
1. L'utilisateur configure son defi (seances, duree, mise)
2. Clic "Lancer le defi"
3. On calcule le jour de la semaine actuel
4. Si on n'est pas lundi → afficher un dialog de confirmation :
   "Cette semaine a deja commence. Ton objectif cette semaine sera
    de X seances (ajuste). Les semaines suivantes : Y seances."
   [Confirmer] [Annuler]
5. L'utilisateur confirme → le defi est cree avec first_week_sessions = X
```

