

# Deux corrections

## 1. Montant remboursé sur le Dashboard

Le Dashboard calcule actuellement `totalBet = challenge.bet_per_month * challenge.duration_months`, ce qui donne un montant erroné (ex: 800 x 3 = 2400). Puisque la mise est désormais unique (one-time), le montant affiché doit simplement être `challenge.bet_per_month` (qui contient la mise fixe).

**Fichier** : `src/pages/Dashboard.tsx` (ligne 108)
- Remplacer `const totalBet = challenge.bet_per_month * challenge.duration_months;` par `const totalBet = challenge.bet_per_month;`
- Le calcul des coins reste : `calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week)`

## 2. Flux de check-in : retour IA puis félicitations avant "Déjà validé"

Actuellement, après validation d'une photo, la query `checkIns` se rafraîchit et `hasCheckedInToday` devient `true` immédiatement, ce qui affiche directement "Déjà validé aujourd'hui". Le flux souhaité est :

1. L'utilisateur prend une photo
2. L'IA analyse (loader)
3. Résultat IA affiché (validé ou non) avec la raison
4. Si validé : bouton "Continuer" mène à un écran de félicitations (avec confettis/message motivant et bouton retour dashboard)
5. Seulement si l'utilisateur revient sur la page `/verify` après avoir déjà validé, il voit "Déjà validé aujourd'hui"

**Fichier** : `src/pages/PhotoVerify.tsx`

- Ajouter un état `sessionStatus` avec les valeurs : `"idle" | "capturing" | "ai-result" | "congrats"`
- Ne plus utiliser `hasCheckedInToday` pour bloquer la prise de photo pendant la session en cours
- Utiliser `hasCheckedInToday` uniquement au chargement initial (si l'utilisateur arrive sur la page et a déjà validé avant)
- Après que le status passe à `"success"` :
  - Afficher le résultat IA (checkmark + raison) avec un bouton "Continuer"
  - Au clic sur "Continuer", passer à l'écran de félicitations avec un message motivant et un bouton "Retour au dashboard"
- Si `status === "error"` : garder le comportement actuel (bouton "Réessayer")

Le flux complet sera :

```text
Arrivee sur /verify
     |
     v
hasCheckedInToday? --oui--> "Deja valide aujourd'hui"
     |
    non
     |
     v
  Camera (prise de photo)
     |
     v
  Analyse IA (loader)
     |
     v
  Resultat IA (succes ou echec)
     |           |
   succes      echec --> "Reessayer"
     |
     v
  Bouton "Continuer"
     |
     v
  Ecran felicitations
  (message + bouton retour dashboard)
```

