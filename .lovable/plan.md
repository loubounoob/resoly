

## Plan: Système intelligent d'échec automatique de défi

### Problème identifié
Le job cron `fail-challenge-daily` n'a jamais été créé dans la base de données (aucun log d'exécution). Les défis impossibles à réussir restent affichés comme "actifs" partout dans l'app.

### Solution en 3 couches

**Couche 1 — Vérification temps réel côté client (Dashboard + Friends)**
Ajouter une détection côté frontend : quand un utilisateur ouvre le Dashboard ou la page Amis, vérifier immédiatement si son défi est encore faisable. Si `sessionsRestantes > joursRestants`, appeler l'edge function `fail-challenge` pour ce défi spécifique, puis rafraîchir les données.

- Modifier `useActiveChallenge` dans `useChallenge.ts` pour inclure une vérification automatique à chaque fetch : si le défi retourné est mathématiquement impossible, déclencher le marquage en échec côté serveur
- Modifier `useFriendsActivity` dans `useFriends.ts` pour filtrer les défis impossibles et ne pas les afficher comme actifs

**Couche 2 — Edge Function améliorée**
Modifier `fail-challenge/index.ts` pour accepter un paramètre optionnel `challenge_id` permettant de cibler un seul défi (appel temps réel depuis le client), en plus du mode batch existant (cron).

**Couche 3 — Création du cron job dans la base**
Exécuter le SQL pour créer le job `pg_cron` quotidien à 23h UTC qui appelle `fail-challenge` en batch. Cela garantit que même les utilisateurs qui n'ouvrent pas l'app voient leur défi échouer.

### Détails techniques

```text
┌──────────────────────────────────────────────────┐
│  Utilisateur ouvre Dashboard/Friends             │
│  → useActiveChallenge() fetch le défi            │
│  → Calcul client: sessionsRestantes > joursLeft? │
│  → OUI → invoke("fail-challenge", {challenge_id})│
│  → Invalide le cache → overlay ChallengeFailedOverlay│
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Cron 23h UTC tous les jours                     │
│  → fail-challenge (mode batch, tous les défis)   │
│  → Marque en "failed" + notification + sheets    │
└──────────────────────────────────────────────────┘
```

### Fichiers modifiés
1. `supabase/functions/fail-challenge/index.ts` — Accepter `challenge_id` optionnel pour mode ciblé
2. `src/hooks/useChallenge.ts` — Ajouter un hook `useAutoFailCheck` qui vérifie et déclenche l'échec automatiquement
3. `src/pages/Dashboard.tsx` — Intégrer `useAutoFailCheck` pour détecter l'échec dès l'ouverture
4. `src/hooks/useFriends.ts` — Filtrer les défis impossibles côté client dans `useFriendsActivity`
5. Migration SQL — Créer le cron job `fail-challenge-daily` via `pg_cron`

### Résultat attendu
- Un défi est marqué "failed" en temps réel dès que l'utilisateur (ou un ami) ouvre l'app
- Le cron nocturne couvre les utilisateurs inactifs
- L'overlay d'échec s'affiche immédiatement sans délai
- La page Amis n'affiche plus "Dernière chance" pour des défis déjà impossibles

