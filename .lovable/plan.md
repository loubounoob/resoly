

## Plan de modifications

### 1. ChallengeAcceptedOverlay : supprimer l'auto-dismiss

Supprimer le timer de 4 secondes et le `onClick` sur le fond pour que l'overlay reste jusqu'au clic sur le bouton "Go".

**Fichier : `src/components/ChallengeAcceptedOverlay.tsx`**
- Supprimer le `setTimeout(() => handleGo(), 4000)` (ligne 44)
- Supprimer le `onClick={handleGo}` sur le div englobant (ligne 61)

---

### 2. PaymentSuccess : ajouter confettis apres creation de defi personnel

Quand le paiement est verifie avec succes (defi personnel, pas coins, pas social), afficher des confettis et une animation de celebration similaire au ChallengeAcceptedOverlay.

**Fichier : `src/pages/PaymentSuccess.tsx`**
- Importer `confetti` de `canvas-confetti` et les icones necessaires
- Quand `status === "success"` et que ce n'est ni coins ni social, lancer des confettis automatiquement via un `useEffect`
- Remplacer le contenu succes pour un defi personnel par une presentation plus festive (icone Flame animee, texte "C'est parti !", confettis)

---

### 3. Supprimer le systeme IBAN pour les defis offerts (Boost)

Le remboursement d'un defi offert gagne se fera sur la carte Stripe du createur (celui qui a paye). Le beneficiaire gagne les pieces mais pas d'argent via IBAN.

#### 3a. Edge Function `complete-challenge`
- Quand `social_challenge_id` existe (defi offert), au lieu de creer un `pending_payout` avec IBAN, retrouver le `stripe_payment_intent_id` du createur dans `social_challenge_members` et faire un remboursement Stripe vers lui
- Le beneficiaire recoit toujours les pieces normalement

#### 3b. Edge Function `accept-boost-challenge`
- Supprimer la reception et l'utilisation du parametre `iban`
- Supprimer la sauvegarde de l'IBAN dans le profil
- Supprimer l'IBAN du `insertData` pour `social_challenge_members`

#### 3c. Frontend `src/pages/Notifications.tsx`
- Supprimer le champ de saisie IBAN (`ibanInputId`, `ibanValue`)
- Appeler `accept-boost-challenge` sans IBAN
- Le bouton "Accepter" fonctionne directement sans etape intermediaire

#### 3d. Frontend `src/pages/Friends.tsx`
- Supprimer le champ IBAN dans la section des defis offerts en attente
- Supprimer la validation IBAN dans `handleAcceptChallenge`

#### 3e. Frontend `src/pages/Settings.tsx`
- Supprimer la section IBAN des parametres (elle n'est plus utile)

---

### Details techniques

**`complete-challenge` -- nouveau flux pour defi offert :**

```text
[Defi offert gagne]
      |
      v
[Trouver le createur via social_challenges.created_by]
      |
      v
[Trouver son stripe_payment_intent_id via social_challenge_members]
      |
      v
[Stripe refund vers le createur] + [Pieces pour le beneficiaire]
```

**`PaymentSuccess` -- confettis pour defi personnel :**

```text
[Paiement verifie]
      |
      v
[status === "success" && !isCoins && !isSocial]
      |
      v
[Lancer confettis] + [Afficher animation festive]
```

