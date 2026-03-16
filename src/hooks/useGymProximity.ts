import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";

const PROXIMITY_THRESHOLD_METERS = 50;
const STORAGE_KEY = "gym_proximity_last_notified";

const GYM_NOTIF_TEXTS = {
  fr: {
    title: "Tu es à la salle ! 💪",
    body: "N'oublie pas de prendre ta photo pour valider ta séance",
  },
  en: {
    title: "You're at the gym! 💪",
    body: "Don't forget to take your photo to validate your session",
  },
  de: {
    title: "Du bist im Gym! 💪",
    body: "Vergiss nicht, dein Foto zu machen, um dein Training zu bestätigen",
  },
} as const;

function getNotifLocale(): "fr" | "en" | "de" {
  const country = localStorage.getItem("resoly_country") || "FR";
  if (country === "FR") return "fr";
  if (country === "DE" || country === "CH") return "de";
  return "en";
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function alreadyNotifiedToday(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return false;
  return last === new Date().toISOString().slice(0, 10);
}

function markNotifiedToday() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
}

interface UseGymProximityOptions {
  gymLatitude: number | null | undefined;
  gymLongitude: number | null | undefined;
  hasActiveChallenge: boolean;
}

export const useGymProximity = ({ gymLatitude, gymLongitude, hasActiveChallenge }: UseGymProximityOptions) => {
  const watchIdRef = useRef<string | null>(null);

  // Sauvegarde les coordonnées pour le geofencing natif (AppDelegate)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (gymLatitude == null || gymLongitude == null) return;

    const country = localStorage.getItem("resoly_country") || "FR";
    Preferences.set({ key: "gym_latitude", value: String(gymLatitude) });
    Preferences.set({ key: "gym_longitude", value: String(gymLongitude) });
    Preferences.set({ key: "resoly_country", value: country });
  }, [gymLatitude, gymLongitude]);

  // watchPosition pour quand l'app est au premier plan
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!hasActiveChallenge) return;
    if (gymLatitude == null || gymLongitude == null) return;

    let cancelled = false;

    const start = async () => {
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") return;
        await LocalNotifications.requestPermissions();

        const id = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 10000 }, (position) => {
          if (cancelled || !position) return;
          const dist = haversineDistance(
            position.coords.latitude,
            position.coords.longitude,
            gymLatitude,
            gymLongitude,
          );
          if (dist < PROXIMITY_THRESHOLD_METERS && !alreadyNotifiedToday()) {
            markNotifiedToday();
            const texts = GYM_NOTIF_TEXTS[getNotifLocale()];
            LocalNotifications.schedule({
              notifications: [
                {
                  id: 9001,
                  title: texts.title,
                  body: texts.body,
                  actionTypeId: "GYM_CHECKIN",
                  extra: { route: "/verify" },
                },
              ],
            });
          }
        });
        watchIdRef.current = id;
      } catch (err) {
        console.error("Gym proximity error:", err);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
    };
  }, [gymLatitude, gymLongitude, hasActiveChallenge]);
};
