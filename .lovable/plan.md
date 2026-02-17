

# Onglet Amis -- feature sociale complete

## Vue d'ensemble

Ajout d'un onglet "Amis" au centre de la barre de navigation basse, ouvrant un ecran social organise en 3 blocs. Le systeme inclut l'ajout d'amis, la creation de groupes, les defis sociaux (Duel, Boost, Groupe) et un classement.

## 1. Base de donnees -- nouvelles tables

### `friendships`
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) -- celui qui envoie la demande
- `friend_id` (uuid, NOT NULL) -- celui qui la recoit
- `status` (text, default 'pending') -- 'pending' | 'accepted' | 'rejected'
- `created_at` (timestamptz)
- RLS : chaque utilisateur voit/cree/met a jour ses propres relations (user_id = auth.uid() OR friend_id = auth.uid())

### `groups`
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `description` (text, nullable)
- `photo_url` (text, nullable)
- `created_by` (uuid, NOT NULL)
- `created_at` (timestamptz)
- RLS : lecture pour les membres du groupe (via group_members), creation libre

### `group_members`
- `id` (uuid, PK)
- `group_id` (uuid, FK -> groups)
- `user_id` (uuid, NOT NULL)
- `joined_at` (timestamptz)
- RLS : lecture/insertion pour les membres et le createur

### `social_challenges`
- `id` (uuid, PK)
- `type` (text) -- 'duel' | 'boost' | 'group'
- `created_by` (uuid, NOT NULL)
- `target_user_id` (uuid, nullable) -- pour duel/boost
- `group_id` (uuid, nullable, FK -> groups) -- pour group challenge
- `sessions_per_week` (integer)
- `duration_months` (integer)
- `bet_amount` (numeric)
- `status` (text, default 'pending') -- 'pending' | 'active' | 'completed'
- `created_at` (timestamptz)
- RLS : les participants voient/creent leurs defis

### `social_challenge_members`
- `id` (uuid, PK)
- `social_challenge_id` (uuid, FK -> social_challenges)
- `user_id` (uuid, NOT NULL)
- `challenge_id` (uuid, nullable, FK -> challenges) -- le defi individuel lie
- `bet_amount` (numeric) -- mise individuelle (pour groupe)
- `status` (text, default 'pending') -- 'pending' | 'joined' | 'completed' | 'failed'
- `created_at` (timestamptz)

### Modification de `profiles`
- Ajouter `username` (text, unique, nullable) -- pseudo pour recherche d'amis
- Ajouter `invite_code` (text, unique, nullable) -- code d'invitation unique

## 2. Navigation

### `src/components/BottomNav.tsx`
- Ajouter l'onglet "Amis" en position centrale (index 2) avec l'icone `Users` de lucide-react
- Ordre final : Accueil | Check-in | **Amis** | Shop | Commandes

## 3. Page Amis (`src/pages/Friends.tsx`)

### Structure
Page scrollable avec 3 sections empilees verticalement :

### Section 1 : Fil d'activite
- Liste verticale de cartes pour chaque ami accepte
- Chaque carte affiche :
  - Avatar rond (depuis `profiles.avatar_url`, fallback initiales)
  - Prenom (depuis `profiles.display_name` ou `profiles.first_name`)
  - Mini jauge circulaire SVG identique au Dashboard (meme style, taille reduite ~48px)
  - Statut colore : vert "X/Y cette semaine" / orange "Derniere chance" / rouge "En retard"
  - Bouton discret "Encourager" (icone flamme)
- Les donnees sont recuperees via une jointure friendships -> profiles -> challenges -> check_ins

### Section 2 : Defis sociaux
- Bouton principal vert "Lancer un defi social"
- Au clic : navigation vers `/friends/create-social` (nouvel ecran)
- En dessous : liste horizontale scrollable des defis sociaux actifs (cartes avec avatars alignes, progression circulaire individuelle, statut collectif)

### Section 3 : Classement du cercle
- Liste verticale minimaliste
- Chaque ligne : avatar + prenom + nombre total de seances validees + semaines actives
- Tri par nombre de seances decroissant

### Ajout d'amis
- Bouton "+" en haut a droite de la page
- Ouvre un drawer/modal avec :
  - Champ de recherche par pseudo (`profiles.username`)
  - Bouton "Partager mon lien d'invitation" (copie un lien avec `invite_code`)
  - Liste des demandes en attente avec boutons accepter/refuser

## 4. Creation de defi social (`src/pages/CreateSocialChallenge.tsx`)

### Flux
1. Memes sliders que CreateChallenge (mise, frequence, duree)
2. Choix du type en 3 cartes :
   - "Duel" -- chacun cree son propre defi, validation independante
   - "Defi Boost" -- je configure un defi pour un ami et j'avance la mise, il recupere s'il reussit
   - "Groupe" -- parametres communs, membres rejoignent avec leur propre mise
3. Selection de l'ami (duel/boost) ou du groupe (groupe)
4. Confirmation et creation

## 5. Creation de groupe (`src/pages/CreateGroup.tsx`)

- Formulaire : nom, photo (upload optionnel), description courte
- Selection d'amis existants (liste checkbox)
- Bouton de creation

## 6. Hooks et logique metier

### `src/hooks/useFriends.ts`
- `useFriendsList()` -- amis acceptes avec leurs profils
- `useFriendRequests()` -- demandes en attente
- `useSendFriendRequest(username)` -- envoi de demande
- `useRespondFriendRequest(id, accept)` -- accepter/refuser
- `useFriendsActivity()` -- activite des amis (challenges + check-ins)
- `useLeaderboard()` -- classement du cercle

### `src/hooks/useSocialChallenges.ts`
- `useSocialChallenges()` -- defis sociaux actifs
- `useCreateSocialChallenge()` -- creation
- `useJoinSocialChallenge()` -- rejoindre un defi groupe

### `src/hooks/useGroups.ts`
- `useGroups()` -- groupes de l'utilisateur
- `useCreateGroup()` -- creation
- `useGroupMembers(groupId)` -- membres d'un groupe

## 7. Routing (`src/App.tsx`)

Nouvelles routes protegees :
- `/friends` -> `Friends.tsx`
- `/friends/create-social` -> `CreateSocialChallenge.tsx`
- `/friends/create-group` -> `CreateGroup.tsx`

## 8. Fichiers crees/modifies

| Fichier | Action |
|---------|--------|
| `src/components/BottomNav.tsx` | Modifie -- ajout onglet Amis |
| `src/pages/Friends.tsx` | Cree -- page principale |
| `src/pages/CreateSocialChallenge.tsx` | Cree -- creation defi social |
| `src/pages/CreateGroup.tsx` | Cree -- creation de groupe |
| `src/hooks/useFriends.ts` | Cree -- logique amis |
| `src/hooks/useSocialChallenges.ts` | Cree -- logique defis sociaux |
| `src/hooks/useGroups.ts` | Cree -- logique groupes |
| `src/App.tsx` | Modifie -- nouvelles routes |
| Migration SQL | 6 tables + colonnes profiles |

## 9. Style visuel

- Meme charte que le reste : fond noir profond, cartes `bg-gradient-card`, bordures `border-border`, accent vert `primary`, ombres `shadow-card`
- Jauges circulaires SVG identiques au Dashboard (meme code, taille adaptee)
- Statuts colores : vert (hsl 82) = en avance, orange (hsl 35) = normal, rouge (hsl 0) = en retard
- Bouton "Encourager" discret avec icone flamme
- Interface epuree, pas de surcharge

