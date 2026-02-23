

## Parrainage : notifications claimables pour toutes les recompenses

### Probleme actuel

Quand un filleul s'inscrit, le trigger `handle_new_user` credite directement 50 pieces au parrain sans aucune notification ni animation. Le parrain ne sait meme pas qu'il a ete parraine.

La recompense de 250 pieces (premier defi du filleul) passe deja par une notification claimable -- cette partie fonctionne.

### Solution

Transformer le credit direct de 50 pieces en notification claimable, identique au systeme deja en place pour les 250 pieces.

### Modifications

**1. Trigger `handle_new_user` (migration SQL)**

Supprimer la ligne `UPDATE profiles SET coins = coins + 50` et la remplacer par un INSERT direct dans la table `notifications` avec le type `referral_reward` :

```text
INSERT INTO notifications (user_id, type, title, body, data)
VALUES (
  _referrer_id,
  'referral_reward',
  'Nouveau filleul ! 🎉',
  '@username s inscrit grace a toi. Recupere tes 50 pieces.',
  '{"coins": 50, "referred_user_id": "...", "reward_type": "referral_signup", "claimed": false}'
);
```

Le parrain ne recoit plus les pieces automatiquement -- il devra cliquer "Recuperer" dans ses notifications.

**2. Notification push (trigger SQL)**

Comme `handle_new_user` s'execute dans un trigger (pas dans une edge function), on ne peut pas facilement appeler `send-notification` pour le push. On inserera directement dans la table `notifications` (notification in-app). Le push sera un bonus futur si necessaire.

Alternativement, on peut utiliser `pg_net` pour appeler l'edge function `send-notification` depuis le trigger, ce qui enverra aussi le push natif.

**3. Edge function `claim-referral-reward` -- deja fonctionnelle**

Aucune modification necessaire. Elle gere deja :
- Validation de la notification
- Prevention du double-claim
- Credit des pieces
- Marquage `claimed: true`

**4. Page Notifications -- deja fonctionnelle**

Le bouton "Recuperer X pieces" et l'animation `coinBurst` sont deja implementes pour le type `referral_reward`. Les 50 pieces de parrainage utiliseront exactement le meme rendu.

### Resume

| Element | Avant | Apres |
|---------|-------|-------|
| 50 pieces (inscription filleul) | Credit direct, invisible | Notification claimable avec animation |
| 250 pieces (defi filleul) | Notification claimable | Inchange |
| Animation de gain | Existante pour 250 | Identique pour les deux |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Modifier `handle_new_user` : remplacer credit direct par INSERT notification + appel push via `pg_net` |

Un seul fichier a modifier (migration SQL pour le trigger). Le reste du systeme (claim, UI, animations) est deja en place.

