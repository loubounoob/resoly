

## Écrans pré-permission motivants (FR / EN / DE)

Avant chaque demande d'autorisation système (notifications, caméra, localisation), on affiche un écran custom traduit qui explique le bénéfice concret pour l'utilisateur, avec un visuel motivant. Cela augmente le taux d'acceptation et donne du contexte.

### 1. Composant `PrePermissionDialog`

Créer `src/components/PrePermissionDialog.tsx` — un Dialog/Drawer plein écran avec :
- Une icône animée (Bell, Camera, MapPin)
- Un titre motivant
- 2-3 bullet points expliquant les bénéfices
- Bouton principal "Activer" → déclenche la vraie permission système
- Lien discret "Plus tard" pour skip

### 2. Textes i18n (3 langues)

Ajouter une section `permissions` dans chaque fichier locale :

**Notifications** — Ton motivant, l'utilisateur se projette dans ses victoires :
- FR : "Ne rate jamais une victoire" / "Sois alerté quand ton défi est en péril, quand un ami te lance un défi, et quand tu gagnes des récompenses."
- EN : "Never miss a win" / "Get alerted when your challenge is at risk, when a friend challenges you, and when you earn rewards."
- DE : "Verpasse nie einen Sieg" / "Werde benachrichtigt wenn deine Challenge in Gefahr ist, ein Freund dich herausfordert und du Belohnungen verdienst."

**Caméra** — L'utilisateur se voit valider ses séances :
- FR : "Prouve que t'y étais" / "Un selfie à la salle et l'IA valide ta séance en 2 secondes. Simple, rapide, efficace."
- EN : "Prove you showed up" / "A selfie at the gym and AI validates your session in 2 seconds. Simple, fast, effective."
- DE : "Beweis, dass du da warst" / "Ein Selfie im Gym und die KI bestätigt dein Training in 2 Sekunden. Einfach, schnell, effektiv."

**Localisation** — L'utilisateur comprend la valeur :
- FR : "Ta salle, ton terrain de jeu" / "On détecte quand tu arrives à la salle pour te rappeler de valider ta séance. Zéro effort."
- EN : "Your gym, your playground" / "We detect when you arrive at the gym to remind you to check in. Zero effort."
- DE : "Dein Gym, dein Spielfeld" / "Wir erkennen, wann du im Gym ankommst und erinnern dich ans Einchecken. Null Aufwand."

### 3. Intégration aux flux existants

| Permission | Où s'insère le dialog | Fichier modifié |
|---|---|---|
| **Notifications** | Avant `PushNotifications.requestPermissions()` | `src/hooks/usePushNotifications.ts` → extraire dans un hook qui affiche le dialog d'abord |
| **Caméra** | Avant l'ouverture du file input sur PhotoVerify | `src/pages/PhotoVerify.tsx` |
| **Localisation** | Avant `Geolocation.requestPermissions()` dans GymLocationPicker et useGymProximity | `src/components/GymLocationPicker.tsx`, `src/hooks/useGymProximity.ts` |

Chaque intégration : vérifier si la permission est déjà accordée → si oui, skip le dialog. Sinon, afficher le `PrePermissionDialog`, et au clic sur "Activer", déclencher la vraie permission système.

### Fichiers créés / modifiés

1. **Créer** `src/components/PrePermissionDialog.tsx`
2. **Modifier** `src/i18n/locales/fr.ts` — ajouter section `permissions`
3. **Modifier** `src/i18n/locales/en.ts` — idem
4. **Modifier** `src/i18n/locales/de.ts` — idem
5. **Modifier** `src/hooks/usePushNotifications.ts` — afficher pre-permission avant requestPermissions
6. **Modifier** `src/pages/PhotoVerify.tsx` — afficher pre-permission caméra
7. **Modifier** `src/components/GymLocationPicker.tsx` — afficher pre-permission localisation
8. **Modifier** `src/hooks/useGymProximity.ts` — afficher pre-permission localisation

