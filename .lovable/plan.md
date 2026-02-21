

## Animations et notifications pour l'acceptation/refus des defis offerts

### Ce qui va changer

Quand un utilisateur accepte ou refuse un defi offert, les deux personnes (le createur et la cible) seront notifiees avec des animations visuelles.

---

### 1. Animation plein ecran a l'acceptation (cote receveur)

Quand la cible clique sur "Confirmer" et que l'acceptation reussit, au lieu de juste un toast + redirection :

- Un overlay plein ecran apparait avec une animation de celebration
- Confettis (via `canvas-confetti` deja installe)
- Grande icone animee (flamme/fusee) avec un effet de scale-in
- Titre motivant : "C'est parti ! Le defi est lance"
- Sous-titre : "Montre ce que tu vaux."
- Bouton "Go" qui redirige vers le dashboard
- L'overlay se ferme automatiquement apres 4 secondes si pas de clic

### 2. Animation a l'acceptation (cote notification card)

- La carte de notification fait un effet de "scale-out + fade" avant de disparaitre de la liste
- Remplacement par un message de confirmation anime "Defi accepte" avec un check vert

### 3. Animation au refus

- La carte de notification fait un slide-out vers la gauche avant de disparaitre
- Toast avec message de confirmation

### 4. Notifications aux deux parties

**Cote backend (edge functions)** :

- **`accept-boost-challenge`** : Apres l'acceptation, envoyer une notification au createur via `send-notification` :
  - Type : `challenge_accepted`
  - Titre : "Defi accepte !"
  - Body : "@username a accepte ton defi ! C'est parti"

- **`decline-boost-challenge`** : Apres le refus, envoyer une notification au createur :
  - Type : `challenge_declined`
  - Titre : "Defi refuse"
  - Body : "@username a refuse le defi. Tu as ete rembourse." (ou sans remboursement)

**Cote frontend** :

- Ajouter les types `challenge_accepted` et `challenge_declined` dans `typeConfig` sur la page Notifications (icones + couleurs)

### 5. Suppression de la notification apres traitement

La notification du receveur est deja supprimee cote serveur. Cote client, on va aussi la retirer visuellement de la liste avec une animation de sortie.

---

### Changements techniques

**Nouveau composant : `src/components/ChallengeAcceptedOverlay.tsx`**
- Overlay plein ecran avec fond semi-transparent
- Animation scale-in + fade-in pour le contenu central
- Declenchement de confettis via `canvas-confetti`
- Bouton "Go" pour naviguer vers /dashboard
- Auto-dismiss apres 4 secondes

**Fichier modifie : `src/pages/Notifications.tsx`**
- Ajouter un state `showAcceptOverlay` pour afficher l'overlay
- Dans `handleAcceptSocialChallenge` : au lieu de `navigate("/dashboard")`, afficher l'overlay
- Ajouter les types `challenge_accepted` et `challenge_declined` dans `typeConfig`
- Ajouter une animation CSS de sortie sur les cartes traitees (scale-out ou slide-left)
- Gerer un state `animatingOutId` pour les cartes en cours de disparition

**Fichier modifie : `supabase/functions/accept-boost-challenge/index.ts`**
- Apres la logique d'acceptation, recuperer le username du receveur depuis `profiles`
- Appeler `send-notification` pour notifier le createur (`sc.created_by`) avec type `challenge_accepted`

**Fichier modifie : `supabase/functions/decline-boost-challenge/index.ts`**
- Apres le refus, recuperer le username du receveur
- Appeler `send-notification` pour notifier le createur avec type `challenge_declined` et info de remboursement

**Fichier modifie : `src/index.css`** (ou inline styles)
- Ajouter keyframes pour `slide-out-left` et `scale-fade-out` pour les animations de sortie des cartes

