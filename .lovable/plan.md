

## Plan : 4 ameliorations (notifications interactives, header sans defi, premiere semaine, boost sur dashboard)

### 1. Accepter/refuser une demande d'ami depuis les notifications

**Fichier** : `src/pages/Notifications.tsx`

- Pour les notifications de type `friend_request`, ajouter deux boutons (Accepter / Refuser) directement dans la carte de notification
- Extraire `from_user_id` depuis `notif.data` pour retrouver la demande d'ami correspondante
- Creer un hook `useFriendRequestByUserId` dans `useFriends.ts` qui cherche la demande en attente a partir de `from_user_id`
- Ou plus simplement : appeler `useRespondFriendRequest` apres avoir retrouve l'id de la demande via une requete directe dans le handler
- Approche retenue : dans le composant, au clic sur Accepter/Refuser, faire une requete pour trouver le friendship puis le mettre a jour

**Fichier** : `src/hooks/useFriends.ts`
- Ajouter une mutation `useRespondFriendRequestByUserId` qui prend un `senderUserId`, cherche la demande pending, et la met a jour

### 2. Header visible meme sans defi actif

**Fichier** : `src/pages/Dashboard.tsx`

Actuellement, quand `!challenge`, le composant retourne un ecran vide sans header. Il faut :
- Extraire le header (avatar, nom, NotificationBell, coins) dans un bloc reutilise
- L'afficher aussi dans le cas `!challenge` (au-dessus du CTA "Creer un defi")

### 3. Afficher les infos premiere semaine et semaines restantes

**Fichier** : `src/pages/Dashboard.tsx`

- Quand `isFirstWeek` est vrai, afficher un bandeau explicatif sous l'anneau : "Premiere semaine : objectif adapte a {firstWeekSessions} seances"
- Calculer le nombre de semaines restantes : `weeksRemaining = Math.ceil((totalSessions - completedSessions) / sessions_per_week)` ou via la date de fin
- Afficher "X semaines restantes pour remporter le defi" dans la section recapitulative

### 4. Afficher un defi boost recu sur le dashboard

**Probleme actuel** : Quand un ami offre un boost, un `social_challenge` est cree et active, mais aucune ligne n'est inseree dans la table `challenges`. Le dashboard ne consulte que `challenges` donc l'utilisateur ne voit rien.

**Solution** : 
- Modifier `useActiveChallenge` pour aussi chercher les defis sociaux actifs de l'utilisateur (via `social_challenge_members` + `social_challenges` ou `status = 'active'`)
- Si un social challenge actif est trouve (et pas de personal challenge), l'utiliser comme defi actif
- Adapter le dashboard pour afficher les infos du social challenge (sessions_per_week, duration_months, bet_amount, coins) avec le meme format (anneau, semaine, mise, pieces)
- Creer les check-ins avec un `challenge_id` pointe vers le social_challenge member ou ajouter un champ `social_challenge_id` dans `check_ins`

**Approche plus simple et robuste** : A l'activation d'un social challenge (dans `verify-payment`), creer automatiquement une ligne dans `challenges` pour chaque membre, avec un lien vers le social_challenge. Cela permet au dashboard existant de fonctionner sans modification majeure.

**Fichiers concernes** :
- `supabase/functions/verify-payment/index.ts` : quand tous les membres ont paye, creer une entree `challenges` pour chaque membre
- Une migration SQL pour ajouter `social_challenge_id` (nullable) a la table `challenges`
- `src/pages/Dashboard.tsx` : aucun changement structurel necessaire, le challenge apparaitra naturellement

### Details techniques

**Migration SQL** :
```text
ALTER TABLE challenges ADD COLUMN social_challenge_id uuid REFERENCES social_challenges(id);
```

**verify-payment (activation)** : quand all members paid :
```text
Pour chaque membre du social challenge :
  INSERT INTO challenges (
    user_id, sessions_per_week, duration_months,
    bet_per_month, total_sessions, status, payment_status,
    social_challenge_id, first_week_sessions
  ) VALUES (...)
```

**Notifications.tsx** : pour `friend_request` :
```text
<div className="flex gap-2 mt-2">
  <button onClick={handleAccept}>Accepter</button>
  <button onClick={handleReject}>Refuser</button>
</div>
```

**Dashboard.tsx** header sans defi :
```text
return (
  <div>
    {/* Header identique : avatar, nom, bell, coins */}
    <div>/* CTA creer un defi */</div>
    <BottomNav />
  </div>
);
```

**Dashboard.tsx** premiere semaine + semaines restantes :
```text
{isFirstWeek && (
  <div className="info-banner">
    Premiere semaine : objectif adapte a {firstWeekSessions} seances
  </div>
)}
<p>X semaines restantes</p>
```

### Fichiers modifies

| Fichier | Modification |
|---|---|
| Migration SQL | Ajouter `social_challenge_id` a `challenges` |
| `supabase/functions/verify-payment/index.ts` | Creer des `challenges` pour chaque membre a l'activation |
| `src/pages/Notifications.tsx` | Boutons accepter/refuser pour `friend_request` |
| `src/hooks/useFriends.ts` | Mutation pour repondre par `from_user_id` |
| `src/pages/Dashboard.tsx` | Header sans defi, bandeau premiere semaine, semaines restantes |

