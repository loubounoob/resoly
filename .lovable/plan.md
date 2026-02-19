

## Corrections a apporter

### 1. Ajustement premiere semaine dans l'onglet Amis

**Probleme** : Le Dashboard utilise `first_week_sessions` pour adapter l'objectif hebdomadaire quand on est dans la premiere semaine du defi. Mais dans le hook `useFriendsActivity`, l'objectif est toujours `challenge.sessions_per_week`, sans tenir compte de `first_week_sessions`.

**Solution** : Dans `src/hooks/useFriends.ts`, dans la fonction `useFriendsActivity`, ajouter la meme logique que le Dashboard :
- Calculer `isFirstWeek` en comparant le debut de la semaine actuelle avec le debut de la semaine ou le defi a commence
- Si `isFirstWeek` et que `first_week_sessions` existe, utiliser cette valeur au lieu de `sessions_per_week`
- Propager cette valeur corrigee dans `weeklyGoal`, `isGoalMet`, `isUrgent`, etc.

### 2. Afficher le pseudonyme (username) comme nom principal

**Probleme** : Partout dans `Friends.tsx`, le nom affiche est `display_name || first_name || "Ami"`. Or l'utilisateur veut que seul le **pseudonyme** (`username`) soit affiche.

**Solution** : Dans `src/pages/Friends.tsx`, remplacer toutes les occurrences de `display_name || first_name` par `username` comme nom principal :
- Fil d'activite (ligne 251) : afficher `profile.username` au lieu de `display_name`
- Demandes en attente (ligne 139) : idem
- Drawer de detail (ligne 295) : idem
- Defis recus (ligne 183) : utiliser `creatorProfile.username`
- Garder le `@username` en sous-titre uniquement si on affiche autre chose en principal (ce qui ne sera plus le cas, donc le supprimer pour eviter la redondance)

### Details techniques

**Fichiers modifies :**

1. **`src/hooks/useFriends.ts`** - dans `useFriendsActivity` :
   - Importer `startOfWeek` de `date-fns`
   - Apres avoir recupere le challenge de chaque ami, calculer :
     ```
     const challengeStart = new Date(challenge.started_at)
     const challengeWeekStart = startOfWeek(challengeStart, { weekStartsOn: 1 })
     const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
     const isFirstWeek = currentWeekStart.getTime() === challengeWeekStart.getTime()
     const adjustedGoal = isFirstWeek && challenge.first_week_sessions != null
       ? challenge.first_week_sessions
       : challenge.sessions_per_week
     ```
   - Utiliser `adjustedGoal` a la place de `weeklyGoal` dans tous les calculs (isGoalMet, isUrgent, etc.)
   - Ajouter `isFirstWeek` et `firstWeekSessions` dans l'objet retourne

2. **`src/pages/Friends.tsx`** :
   - Remplacer tous les `display_name || first_name || "Ami"` par `username || "Ami"`
   - Supprimer les lignes `@username` en sous-titre (devenues redondantes)
   - Dans le drawer de detail, afficher le bandeau "Premiere semaine" si `isFirstWeek` est vrai (comme sur le Dashboard)
   - Adapter le ring et le tracker pour utiliser le goal ajuste

