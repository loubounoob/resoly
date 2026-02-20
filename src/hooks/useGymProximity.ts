import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { LocalNotifications } from "@capacitor/local-notifications";

const PROXIMITY_THRESHOLD_METERS = 50;
const STORAGE_KEY = "gym_proximity_last_notified";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function alreadyNotifiedToday(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return false;
  const today = new Date().toISOString().slice(0, 10);
  return last === today;
}

function markNotifiedToday() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
}

interface UseGymProximityOptions {
  gymLatitude: number | null | undefined;
  gymLongitude: number | null | undefined;
  hasActiveChallenge: boolean;
}

export const useGymProximity = ({
  gymLatitude,
  gymLongitude,
  hasActiveChallenge,
}: UseGymProximityOptions) => {
  const watchIdRef = useRef<string | null>(null);

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

        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position) => {
            if (cancelled || !position) return;
            const dist = haversineDistance(
              position.coords.latitude,
              position.coords.longitude,
              gymLatitude,
              gymLongitude
            );

            if (dist < PROXIMITY_THRESHOLD_METERS && !alreadyNotifiedToday()) {
              markNotifiedToday();
              LocalNotifications.schedule({
                notifications: [
                  {
                    id: 9001,
                    title: "Tu es à la salle ! 💪",
                    body: "N'oublie pas de prendre ta photo pour valider ta séance",
                    actionTypeId: "GYM_CHECKIN",
                    extra: { route: "/verify" },
                  },
                ],
              });
            }
          }
        );
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
