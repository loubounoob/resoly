

## Plan: Corrections pseudo, visibilite demandes d'ami, et photo de profil

### Probleme 1 : Pseudo demande plusieurs fois

**Diagnostic** : Le formulaire d'inscription (`Auth.tsx`) envoie le `username` dans `raw_user_meta_data`, et le trigger `handle_new_user` le lit pour l'inserer dans `profiles`. Cependant, `UsernameGuard` s'affiche sur **chaque route protegee** et verifie si le profil a un `username`. Si le profil n'est pas encore cree au moment du check (race condition entre le trigger et la redirection), le guard affiche le formulaire de pseudo. De plus, si l'utilisateur choisit un pseudo via le guard, il fait un `UPDATE` -- mais s'il n'y a pas encore de profil (trigger pas encore execute), l'update ne touche aucune ligne.

**Solution** :
- Supprimer le champ `username` du formulaire d'inscription (`Auth.tsx`) pour eviter la double saisie. Le trigger generera un pseudo temporaire (`user_xxxx`).
- `UsernameGuard` restera le seul point d'entree pour choisir son pseudo. Ajouter un petit delai/retry si le profil n'existe pas encore (race condition).
- Dans `UsernameGuard`, verifier que le username n'est pas un pseudo auto-genere (commencant par `user_`) -- si c'est le cas, considerer qu'il n'a pas encore choisi son pseudo.

### Probleme 2 : Demandes d'ami cachees dans le drawer

**Solution** :
- Afficher une **section "Demandes en attente"** directement sur la page `Friends.tsx`, en haut (avant le fil d'activite), avec un badge de compteur.
- Chaque demande affichera le pseudo, l'avatar et les boutons accepter/refuser.
- Garder la recherche et l'invitation dans le drawer.

### Probleme 3 : Photo de profil apres premiere seance

**Solution** :
- Creer un **bucket de stockage** `avatars` (public) via migration SQL avec les bonnes policies RLS.
- Apres la premiere seance validee (ecran "Bravo"), afficher une etape supplementaire proposant de prendre une selfie/photo de profil. L'utilisateur peut passer cette etape.
- Creer un composant `AvatarUpload` reutilisable (camera + upload vers le bucket `avatars`, mise a jour du champ `avatar_url` dans `profiles`).
- Ajouter une option de changement de photo de profil accessible depuis le Dashboard (tap sur l'avatar dans le header).

### Details techniques

**Migration SQL** :
```sql
-- Creer le bucket avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- RLS: les utilisateurs peuvent uploader leur avatar
CREATE POLICY "Users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: les utilisateurs peuvent modifier/supprimer leur avatar
CREATE POLICY "Users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: lecture publique
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
```

**Fichiers modifies** :
1. `src/pages/Auth.tsx` -- Retirer les champs pseudo et prenom du signup (seuls email/password)
2. `src/components/UsernameGuard.tsx` -- Ajouter retry si profil pas encore cree + ignorer les pseudos auto-generes (`user_*`)
3. `src/pages/Friends.tsx` -- Deplacer les demandes en attente dans la page principale (hors du drawer), avec badge visible
4. `src/pages/PhotoVerify.tsx` -- Apres "Bravo" de la premiere seance, proposer l'upload d'avatar
5. `src/pages/Dashboard.tsx` -- Rendre l'avatar cliquable dans le header pour changer la photo

**Nouveaux fichiers** :
1. `src/components/AvatarUpload.tsx` -- Composant reutilisable pour upload de photo de profil (camera/galerie, crop, upload vers storage, mise a jour `profiles.avatar_url`)

