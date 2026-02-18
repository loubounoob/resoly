

## Plan : Notification push par geolocalisation "salle de sport"

### Concept

Quand un utilisateur avec un defi actif se trouve a proximite de sa salle de sport, l'application lui envoie automatiquement une notification locale pour lui rappeler de prendre sa photo de check-in.

### 1. Enregistrer la localisation de la salle de sport

**Migration SQL** : Ajouter deux colonnes a la table `profiles` :

```text
ALTER TABLE profiles ADD COLUMN gym_latitude double precision;
ALTER TABLE profiles ADD COLUMN gym_longitude double precision;
ALTER TABLE profiles ADD COLUMN gym_name text;
```

**Nouveau composant `GymLocationPicker`** :
- Affiche un bouton "Definir ma salle de sport"
- Utilise le plugin `@capacitor/geolocation` pour recuperer la position actuelle
- L'utilisateur peut valider "C'est ici ma salle" ou ajuster manuellement
- Sauvegarde lat/lng dans `profiles`

**Integration** : Le picker sera accessible depuis :
- La page de creation de defi (etape optionnelle)
- Les parametres du profil (Dashboard > avatar > parametres)

### 2. Surveillance de la position en arriere-plan

**Dependance** : `@capacitor/geolocation` (a installer)

**Nouveau hook `src/hooks/useGymProximity.ts`** :
- S'active uniquement si : plateforme native + defi actif + gym_latitude/gym_longitude definis
- Utilise `Geolocation.watchPosition()` pour surveiller la position
- Calcule la distance entre la position actuelle et la salle (formule Haversine)
- Si distance < 200 metres et pas encore notifie aujourd'hui :
  - Envoie une notification locale via `@capacitor/local-notifications`
  - Stocke un flag dans localStorage pour eviter le spam (1 notif max par jour)

**Dependance supplementaire** : `@capacitor/local-notifications` (notifications locales, pas besoin de passer par FCM pour ca)

### 3. Notification locale

Le message de la notification :
- Titre : "Tu es a la salle ! 💪"
- Corps : "N'oublie pas de prendre ta photo pour valider ta seance"
- Action au tap : ouvre la page `/verify` (photo check-in)

### 4. Configuration Capacitor

Mise a jour de `capacitor.config.ts` pour ajouter la configuration des plugins Geolocation et LocalNotifications.

### Fichiers concernes

| Fichier | Modification |
|---|---|
| Migration SQL | Ajouter `gym_latitude`, `gym_longitude`, `gym_name` a `profiles` |
| `package.json` | Installer `@capacitor/geolocation` et `@capacitor/local-notifications` |
| `capacitor.config.ts` | Ajouter config des plugins |
| `src/hooks/useGymProximity.ts` | **Nouveau** -- surveillance position + notification locale |
| `src/components/GymLocationPicker.tsx` | **Nouveau** -- composant pour definir sa salle |
| `src/pages/CreateChallenge.tsx` | Ajouter etape optionnelle "Definir ma salle" |
| `src/pages/Dashboard.tsx` | Ajouter le hook `useGymProximity` |

### Details techniques

**Calcul de distance (Haversine)** :

```text
function haversineDistance(lat1, lon1, lat2, lon2) -> metres
  Retourne la distance en metres entre deux points GPS
```

**Hook useGymProximity** :

```text
1. Recuperer gym_latitude/gym_longitude depuis le profil
2. Verifier qu'un defi actif existe
3. Demarrer watchPosition avec { enableHighAccuracy: true }
4. A chaque update de position :
   - Calculer distance vers la salle
   - Si < 200m ET pas deja notifie aujourd'hui :
     -> LocalNotifications.schedule({ title, body, id })
     -> Stocker la date dans localStorage
5. Cleanup : clearWatch au unmount
```

**Permissions requises** (a configurer dans les projets natifs) :
- iOS : `NSLocationWhenInUseUsageDescription` dans Info.plist
- Android : `ACCESS_FINE_LOCATION` dans AndroidManifest.xml

### Limitations

- La surveillance en arriere-plan necessiterait un plugin supplementaire (`@capacitor-community/background-geolocation`). Pour cette premiere version, la detection fonctionne quand l'app est ouverte (foreground). On pourra ajouter le mode arriere-plan dans une iteration future si souhaite.
- Sur le web (non-natif), le systeme sera desactive silencieusement.
