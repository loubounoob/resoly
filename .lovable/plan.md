

## Synchronisation des defis vers Google Sheets

### Principe

Creer une edge function `sync-challenge-sheet` qui envoie les donnees de chaque defi paye vers un second webhook Google Sheets (ou le meme, sur un onglet different). La fonction est appelee automatiquement a chaque validation de paiement d'un defi.

### Donnees envoyees pour chaque defi

- **Pseudo** (username)
- **Age**
- **Sexe** (gender)
- **Email**
- **Type** : perso ou social (offert/defi entre amis)
- **Mise totale** (bet_per_month x duration_months)
- **Mise par mois** (bet_per_month)
- **Nombre de seances/semaine** (sessions_per_week)
- **Nombre de mois** (duration_months)
- **Total seances** (total_sessions)
- **Pieces estimees** (calcul de la formule coins)
- **Statut** (active, completed, failed)
- **Date de creation**
- **Date de fin estimee** (created_at + duration_months)
- **Stripe Payment Intent ID** (pour la compta)
- **Code promo utilise** (loubou ou non)

### Colonnes calculees cote Google Sheets (a configurer dans le Sheet)

Le webhook recevra toutes les donnees brutes. Tu pourras ensuite ajouter des colonnes calculees dans ton Google Sheet :

- **Argent des defis perdus (= mon revenu)** : filtrer les lignes avec statut "failed", sommer les mises totales
- **Argent encore en jeu** : filtrer les lignes avec statut "active", sommer les mises totales
- **Argent a rembourser estime** : filtrer les lignes avec statut "active", sommer les mises (pire cas = tout rembourser)
- **Date de fin estimee** : deja envoyee, permet de voir quand les remboursements arriveront
- **Tableau de bord visuel** : graphiques par mois, par sexe, par tranche d'age, taux de reussite

### Implementation technique

**1. Nouveau secret necessaire**
- `GOOGLE_SHEETS_CHALLENGE_WEBHOOK_URL` : URL du webhook Google Apps Script pour l'onglet defis (peut etre le meme script que les commandes si tu geres par onglet)

**2. Edge function `sync-challenge-sheet/index.ts`**
- Recoit les donnees du defi + profil utilisateur
- Les envoie au webhook via POST
- Retourne succes/erreur

**3. Modifications des fonctions existantes**
- **`verify-payment/index.ts`** : apres confirmation du paiement d'un defi, recuperer le profil utilisateur (username, age, gender) et appeler `sync-challenge-sheet` avec toutes les infos
- **`create-challenge-payment/index.ts`** : meme chose dans le cas du code promo "loubou" (bypass Stripe)
- **`complete-challenge/index.ts`** : envoyer une mise a jour au sheet quand un defi est complete (statut = completed)
- **`check-challenge-peril/index.ts`** : pas de modification, le statut "failed" est gere ailleurs

**4. Fichier `supabase/config.toml`**
- Ajouter `[functions.sync-challenge-sheet]` avec `verify_jwt = false`

### Etape prealable

Il faudra que tu crees un nouveau Google Apps Script / webhook pour recevoir les donnees des defis (ou ajouter un onglet au script existant). Une fois l'URL prete, je te demanderai de la renseigner comme secret.

