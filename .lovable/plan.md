

# Stories Instagram-style sur le Dashboard

## Concept
Afficher les photos de check-in validees des amis (et de soi-meme) sous forme de stories cliquables, visibles pendant 24h puis automatiquement supprimees.

## Emplacement
Entre la carte "Ta semaine" (week tracker) et la carte "Mise/Pieces en jeu", sous forme d'une rangee horizontale compacte d'avatars (style Instagram Stories).

---

## Etapes techniques

### 1. Storage bucket pour les photos de stories
- Creer un bucket `check-in-photos` (public) via migration SQL
- Ajouter des policies RLS pour que les utilisateurs puissent uploader leurs propres photos et que les amis puissent les lire

### 2. Sauvegarder la photo lors du check-in
- Modifier `PhotoVerify.tsx` : lors d'un check-in verifie avec succes, uploader la photo dans le bucket `check-in-photos` et mettre a jour le champ `photo_url` (deja existant dans la table `check_ins`)

### 3. Nettoyage automatique apres 24h (pg_cron)
- Migration SQL : creer un job pg_cron qui tourne toutes les heures
- Le job supprime les fichiers du bucket storage et met `photo_url = NULL` pour les check-ins de plus de 24h

### 4. Hook `useStories`
- Nouveau hook dans `src/hooks/useStories.ts`
- Requete les check-ins verifies des amis + les siens des dernieres 24h ayant un `photo_url` non null
- Joint avec les profils pour avoir avatar et username
- Regroupe par utilisateur (un avatar = toutes les stories recentes d'un user)

### 5. Composant `StoriesBar` sur le Dashboard
- Nouveau composant `src/components/StoriesBar.tsx`
- Rangee horizontale scrollable d'avatars avec bordure coloree (vert = story non vue)
- Chaque avatar est cliquable et ouvre un Dialog/Drawer plein ecran avec la photo
- Design compact : hauteur ~70px max pour ne pas casser la mise en page
- Place entre le week tracker et la carte mise/pieces

### 6. Viewer de story
- Dialog plein ecran avec la photo, le nom de l'utilisateur et l'heure du check-in
- Swipe ou boutons pour naviguer entre les stories d'un meme utilisateur

---

## Structure des fichiers modifies/crees

| Fichier | Action |
|---|---|
| Migration SQL (bucket + pg_cron) | Creer |
| `src/hooks/useStories.ts` | Creer |
| `src/components/StoriesBar.tsx` | Creer |
| `src/pages/PhotoVerify.tsx` | Modifier (upload photo) |
| `src/pages/Dashboard.tsx` | Modifier (ajouter StoriesBar) |

