

## Plan : Correction du systeme d'amis + defis sociaux avec paiement Stripe

### Probleme principal : Les profils ne sont pas crees

**Diagnostic** : La fonction `handle_new_user()` existe dans la base de donnees mais **aucun trigger n'est attache** a la table `auth.users`. Resultat : sur 10 utilisateurs inscrits, seul 1 a un profil (cree manuellement). Les amis apparaissent avec "?" et "---" car ils n'ont pas de profil.

### Corrections a effectuer

#### 1. Creer le trigger manquant + reparer les profils existants (Migration SQL)

```sql
-- Attacher le trigger a auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Creer les profils manquants pour les utilisateurs existants
INSERT INTO public.profiles (user_id, display_name, username, invite_code)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  'user_' || substr(md5(random()::text), 1, 6),
  upper(substr(md5(random()::text), 1, 8))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
```

Cela garantit que chaque utilisateur a un profil et sera redirige vers `UsernameGuard` pour choisir un vrai pseudo.

#### 2. Defis sociaux : ajouter le systeme de pieces + recompenses + paiement Stripe

Actuellement, quand on cree un defi social, il est juste enregistre en base sans paiement. Il faut :

**a) Afficher les pieces a gagner sur l'ecran de creation** (`CreateSocialChallenge.tsx`)
- Ajouter le calcul `calculateCoins` sur l'ecran de recap (identique au defi perso)
- Afficher les produits Shopify accessibles avec les pieces gagnables

**b) Rediriger le createur vers Stripe apres creation**
- Apres `createSocial.mutateAsync()`, appeler l'edge function `create-challenge-payment` avec un nouveau parametre `socialChallengeId`
- Adapter l'edge function pour gerer les social challenges (mettre a jour le `payment_status` du membre dans `social_challenge_members`)

**c) Ajouter `payment_status` a la table `social_challenge_members`**
- Migration SQL : `ALTER TABLE social_challenge_members ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';`

**d) Permettre au destinataire d'accepter et payer**
- Quand un defi social en "pending" cible l'utilisateur connecte, afficher un bouton "Accepter le defi" sur la page Amis
- Cliquer sur "Accepter" cree l'entree dans `social_challenge_members` puis redirige vers Stripe
- Le duel passe en "active" uniquement quand les deux membres ont `payment_status = 'paid'`

**e) Envoyer une notification au destinataire**
- Quand un defi social est cree, appeler `send-notification` pour prevenir le destinataire

#### 3. Adapter l'edge function de paiement

Modifier `create-challenge-payment` pour :
- Accepter un `socialChallengeId` et `memberId` en plus de `challengeId`
- Si `socialChallengeId` est fourni, mettre a jour `social_challenge_members.payment_status` = 'paid'
- Verifier si tous les membres ont paye, et si oui, passer le `social_challenges.status` a 'active'

#### 4. Adapter `verify-payment` de la meme maniere

Modifier `verify-payment` pour gerer les `socialChallengeId` dans les metadonnees de la session Stripe.

### Fichiers modifies

1. **Migration SQL** -- Trigger `on_auth_user_created` + backfill profiles + ajout `payment_status` a `social_challenge_members`
2. `src/pages/CreateSocialChallenge.tsx` -- Ajout coins preview, produits Shopify, redirection Stripe apres creation, notification
3. `src/pages/Friends.tsx` -- Section "Defis recus" avec bouton Accepter + payer pour les defis ciblant l'utilisateur
4. `supabase/functions/create-challenge-payment/index.ts` -- Support `socialChallengeId`
5. `supabase/functions/verify-payment/index.ts` -- Support `socialChallengeId`
6. `src/hooks/useSocialChallenges.ts` -- Ajout mutation `useAcceptSocialChallenge` + `useRespondSocialChallenge`
7. `src/pages/PaymentSuccess.tsx` -- Gerer le retour de paiement social challenge

### Flux utilisateur final

```text
Createur                          Destinataire
   |                                    |
   |-- Cree defi social ------------->  |
   |-- Redirige vers Stripe             |
   |-- Paie --------------------------> |
   |                                    |-- Recoit notification
   |                                    |-- Voit "Defi recu" sur /friends
   |                                    |-- Clique "Accepter"
   |                                    |-- Redirige vers Stripe
   |                                    |-- Paie
   |                                    |
   |<-- Les deux ont paye ------------->|
   |-- Defi passe en "active"           |
   |-- Chacun fait ses seances          |
```

