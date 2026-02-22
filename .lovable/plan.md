
## Systeme intelligent d'echec de defi

### Contexte

Actuellement, `check-challenge-peril` envoie une alerte quand un defi est en danger, mais ne le marque jamais comme echoue. Le dimanche soir (ou lundi matin), meme si l'utilisateur n'a clairement pas pu atteindre son objectif, le defi reste "active". Il faut un mecanisme automatique qui detecte l'echec et agit.

---

### Ce qui va changer

#### 1. Nouvelle Edge Function : `fail-challenge`

Une fonction backend appelee automatiquement (via le cron existant ou un nouveau) qui :

- Parcourt tous les defis actifs payes
- Pour chaque defi, verifie si on est **dimanche soir** (ou le dernier moment de la semaine) ET que les seances restantes > 0 (objectif non atteint)
- Marque le defi comme `status = 'failed'`
- Envoie une notification push + in-app via `send-notification` :
  - Type : `challenge_failed`
  - Titre : "Defi termine..."
  - Body : "Tu n'as pas atteint ton objectif cette semaine. Ta mise de X euros est perdue. Mais chaque echec est une lecon -- reviens plus fort !"
- Synchronise le statut dans Google Sheets via `sync-challenge-sheet`

#### 2. Cron job pour l'echec automatique

Un nouveau cron job planifie a **dimanche 23h00** qui appelle `fail-challenge`. C'est le moment ou la semaine se termine et ou on peut confirmer l'echec.

#### 3. Detection cote frontend (Dashboard)

Quand l'utilisateur ouvre le Dashboard et que son defi vient de passer en `failed` :

- Un overlay plein ecran s'affiche avec une animation sombre (pas de confettis, mais un effet visuel empathique)
- Icone animee (bouclier brise ou flamme eteinte)
- Titre : "Defi termine..."
- Message encourageant : "Tu n'as pas atteint ton objectif. Chaque echec rapproche du succes. Reviens plus fort !"
- Montant perdu affiche clairement
- Bouton "Relever le defi" qui redirige vers la creation d'un nouveau defi
- Auto-dismiss apres 6 secondes

#### 4. Nouveau composant : `ChallengeFailedOverlay`

Similaire a `ChallengeAcceptedOverlay` mais avec un ton different :

- Fond sombre avec un leger effet de "verre brise" ou particules tombantes
- Couleurs rouges/grises au lieu de vert/dore
- Animation d'entree en scale-in lente
- Pas de confettis, mais un effet subtil de particules qui tombent (via canvas ou CSS)

#### 5. Notifications cross-party

Les amis de l'utilisateur verront aussi le changement de statut dans leur fil d'activite (le defi disparait puisqu'il n'est plus actif).

---

### Changements techniques

**Nouveau fichier : `supabase/functions/fail-challenge/index.ts`**
- Recupere tous les defis actifs payes
- Pour chaque defi, calcule si l'objectif hebdomadaire est impossible a atteindre (sessions restantes > jours restants, en etant dimanche = 0 jours restants)
- Marque le defi en `status = 'failed'`
- Appelle `send-notification` avec type `challenge_failed`
- Appelle `sync-challenge-sheet` pour mettre a jour Google Sheets
- Retourne le nombre de defis echoues

**Fichier modifie : `supabase/config.toml`**
- Ajouter l'entree `[functions.fail-challenge]` avec `verify_jwt = false`

**Nouveau cron job (migration SQL)**
- Planifie a `0 23 * * 0` (dimanche 23h UTC) pour appeler `fail-challenge`

**Nouveau fichier : `src/components/ChallengeFailedOverlay.tsx`**
- Overlay plein ecran avec fond sombre
- Icone animee (ShieldOff ou FlameKindling) avec effet scale-in
- Titre "Defi termine..." en rouge/gris
- Message d'encouragement personnalise avec le montant perdu
- Bouton "Relever le defi" qui redirige vers `/onboarding-challenge`
- Auto-dismiss apres 6 secondes

**Fichier modifie : `src/pages/Dashboard.tsx`**
- Ajouter un check au chargement : si aucun challenge actif mais qu'un challenge `failed` recent existe (dans les dernieres 24h), afficher le `ChallengeFailedOverlay`
- Utiliser un state `showFailedOverlay` + un query pour detecter les challenges recemment echoues
- Ajouter un hook `useRecentlyFailedChallenge` dans `useChallenge.ts`

**Fichier modifie : `src/hooks/useChallenge.ts`**
- Ajouter `useRecentlyFailedChallenge()` : query qui cherche un challenge avec `status = 'failed'` et `updated_at` dans les 24 dernieres heures, pour declencher l'overlay une seule fois

**Fichier modifie : `src/pages/Notifications.tsx`**
- Ajouter le type `challenge_failed` dans `typeConfig` avec icone ShieldOff et couleur destructive

**Fichier modifie : `src/index.css`**
- Ajouter une animation CSS `fall-particles` pour l'effet visuel de l'overlay d'echec
