
## Animation de victoire "Clash Royale" pour defi reussi

### Vue d'ensemble

Quand le defi est complete (`isChallengeComplete = true`), la carte "Mise en jeu" (encadree en rouge sur ta capture) se transforme en une carte doree scintillante style Clash Royale. Au clic, un overlay plein ecran de celebration se declenche avec confettis, compteur de pieces anime, et remboursement automatique.

---

### Ce qui va changer

#### 1. Carte doree "Victoire" (remplace la carte mise en jeu)

Quand `isChallengeComplete` est vrai, la carte actuelle "50 euros en jeu" sera remplacee par une version doree animee :

- Bordure doree scintillante avec animation de shimmer qui parcourt la carte
- Fond en degrade dore (from-amber-900/30 via-yellow-600/20 to-amber-900/30)
- Icone trophee au lieu du sac d'argent
- Texte "50 euros gagnes !" au lieu de "en jeu"
- Texte "Pièces bonus : +205" avec l'icone coin
- Indication "Appuie pour recuperer" qui pulse doucement
- Animation d'entree en scale-in pour marquer le changement

#### 2. Overlay plein ecran de celebration (nouveau composant `ChallengeVictoryOverlay`)

Quand l'utilisateur clique sur la carte doree :

- **Phase 1 (0-1s)** : Fond noir + confettis massifs dores/verts qui explosent des deux cotes
- **Phase 2 (1-2.5s)** : 
  - Icone trophee doree animee au centre (scale-in + pulse)
  - Titre "DEFI REUSSI !" en lettres dorees
  - Montant rembourse afiche : "50 euros rembourses"
  - Si le remboursement est en cours, afficher "Remboursement en cours..." avec un spinner
  - Si le remboursement prend plus de 3 secondes, afficher "Le remboursement peut prendre quelques instants"
- **Phase 3 (2.5-5s)** :
  - Compteur de pieces qui monte de 0 a X avec un effet de "slot machine" (chiffres qui defilent)
  - L'icone coin a cote du compteur en header se met a jour en temps reel
  - Son visuel (particules dorees qui montent vers le compteur)
- **Phase 4 (5-7s)** :
  - Message "Et maintenant ?"
  - Deux boutons : "Creer un nouveau defi" et "Offrir un defi"
  - Auto-dismiss pas necessaire ici, l'utilisateur doit choisir

Le remboursement (`complete-challenge`) est appele DES que l'overlay s'ouvre, en parallele de l'animation.

#### 3. Apres la celebration

Une fois que l'utilisateur clique sur un bouton :
- Le dashboard revient a l'etat "Aucun defi actif" (deja gere par `invalidateQueries`)
- Le solde de pieces est mis a jour
- Redirection vers `/onboarding-challenge` ou `/create-social-challenge`

---

### Changements techniques

**Nouveau fichier : `src/components/ChallengeVictoryOverlay.tsx`**
- Props : `betAmount`, `coinsEarned`, `challengeId`, `onClose`
- Appelle `complete-challenge` au montage
- Gere les 4 phases avec des `setTimeout` sequentiels
- Compteur anime de pieces (de 0 au total) avec `requestAnimationFrame`
- Confettis via `canvas-confetti` (deja installe) avec particules dorees
- Gestion des erreurs : si le remboursement echoue, affiche un message d'erreur mais laisse l'utilisateur continuer

**Fichier modifie : `src/pages/Dashboard.tsx`**
- Supprime le bloc `isChallengeComplete` actuel (lignes 345-361) et la fonction `handleCompleteChallenge`
- Quand `isChallengeComplete`, la carte mise en jeu devient la carte doree cliquable
- Au clic, ouvre `ChallengeVictoryOverlay` via un state `showVictoryOverlay`
- Ajouter un state `showVictoryOverlay`

**Fichier modifie : `src/index.css`**
- Ajouter l'animation CSS `shimmer` pour l'effet de brillance sur la carte doree
- Ajouter l'animation `coin-counter` pour le defilement des chiffres

---

### Detail du shimmer dore

```text
@keyframes shimmer:
  0%   -> background-position: -200% 0
  100% -> background-position: 200% 0

Applique sur un pseudo-element ::before de la carte
avec un gradient transparent-blanc-transparent
```

### Flux du remboursement

```text
[Clic carte doree]
      |
      v
[Ouvre Overlay] -----> [Appelle complete-challenge en parallele]
      |                         |
      v                         v
[Phase 1: confettis]    [Attente reponse...]
[Phase 2: trophee]              |
[Phase 3: compteur]     [Succes? -> met a jour coins]
      |                 [Erreur? -> message d'erreur]
      v                         |
[Phase 4: boutons] <-----------/
```
