import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, Loader2, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import PrePermissionDialog from "@/components/PrePermissionDialog";

interface GymLocationPickerProps {
  currentGymName?: string | null;
  currentLat?: number | null;
  currentLon?: number | null;
  onSaved?: () => void;
}

const GymLocationPicker = ({ currentGymName, currentLat, currentLon, onSaved }: GymLocationPickerProps) => {
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gymName] = useState(currentGymName || "");

  // Never pre-populate from props — requires fresh GPS to save
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const hasExisting = !!(currentLat && currentLon);

  const [showLocationPermission, setShowLocationPermission] = useState(false);

  // React-level safety timer — guarantees loading is always reset no matter what
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, []);

  const stopLoading = () => {
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
    setLoading(false);
  };

  const doGetLocation = () => {
    if (!user) return;
    setLoading(true);
    setSaved(false);

    // Absolute safety net: force-stop loading after 9s regardless of geolocation state
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      setLoading(false);
      toast.error(t("gym.gpsTimeout") || "Localisation trop lente, réessaie");
    }, 9000);

    // Callback-based API — avoids async/await promise hanging on iOS WebView
    navigator.geolocation.getCurrentPosition(
      (position) => {
        stopLoading();
        const { latitude, longitude } = position.coords;
        setSelectedCoords({ lat: latitude, lon: longitude });
        toast.success(t("gym.gpsRetrieved"));
      },
      (err) => {
        stopLoading();
        if (err.code === 1) {
          toast.error(t("gym.gpsDenied"));
        } else if (err.code === 3) {
          toast.error(t("gym.gpsTimeout") || "Localisation trop lente, réessaie");
        } else {
          toast.error(t("gym.gpsError"));
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    );
  };

  const handleUseCurrentLocation = () => {
    if (Capacitor.isNativePlatform()) {
      const shown = localStorage.getItem("location_pre_permission_shown");
      if (!shown) {
        setShowLocationPermission(true);
        return;
      }
    }
    doGetLocation();
  };

  const handleLocationPermissionAccept = () => {
    localStorage.setItem("location_pre_permission_shown", "true");
    setShowLocationPermission(false);
    doGetLocation();
  };

  const handleLocationPermissionDismiss = () => {
    localStorage.setItem("location_pre_permission_shown", "true");
    setShowLocationPermission(false);
  };

  const handleSave = async () => {
    if (!user || !selectedCoords) {
      toast.error(t("gym.selectLocation"));
      return;
    }
    setLoading(true);
    try {
      const finalGymName = gymName.trim() || t("gym.myGym");
      const { error } = await supabase
        .from("profiles")
        .update({
          gym_latitude: selectedCoords.lat,
          gym_longitude: selectedCoords.lon,
          gym_name: finalGymName,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;

      setSaved(true);
      toast.success(t("gym.saved"));
      onSaved?.();

      const { data: profile } = await supabase.from("profiles").select("country").eq("user_id", user.id).single();

      const country = ((profile as any)?.country || "FR").toUpperCase();
      const locale = country === "FR" ? "fr" : country === "DE" || country === "CH" ? "de" : "en";

      const texts: Record<string, { title: string; body: string }> = {
        fr: {
          title: "Salle enregistrée ! 📍",
          body: `Ta salle "${finalGymName}" a été enregistrée. Tu recevras un rappel à chaque visite.`,
        },
        en: {
          title: "Gym saved! 📍",
          body: `Your gym "${finalGymName}" has been saved. You'll get a reminder on each visit.`,
        },
        de: {
          title: "Gym gespeichert! 📍",
          body: `Dein Gym "${finalGymName}" wurde gespeichert. Du erhältst bei jedem Besuch eine Erinnerung.`,
        },
      };

      supabase.functions
        .invoke("send-notification", {
          body: {
            user_id: user.id,
            type: "gym_saved",
            title: texts[locale].title,
            body: texts[locale].body,
            data: { gym_name: finalGymName },
          },
        })
        .catch((err) => console.error("Push notification error:", err));
    } catch (err: any) {
      console.error(err);
      toast.error(t("gym.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium block">{t("gym.myGym")}</label>
      <p className="text-xs text-muted-foreground">{t("gym.searchDesc")}</p>

      {/* Show existing gym info if present and no new coords yet */}
      {hasExisting && !selectedCoords && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <Check className="w-3.5 h-3.5" />
          <span>
            {currentGymName || t("gym.myGym")} — {t("gym.positionSelected")}
          </span>
        </div>
      )}

      {/* Show new coords when GPS was obtained */}
      {selectedCoords && (
        <div className="flex items-center gap-2 text-xs text-green-500">
          <Check className="w-3.5 h-3.5" />
          <span>
            {t("gym.positionSelected")} — {hasExisting ? "nouvelle position" : ""}
          </span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleUseCurrentLocation}
        disabled={loading}
        className="w-full"
        size="sm"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
        {t("gym.useLocation")}
      </Button>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saved || !selectedCoords}
        className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            {t("common.saved")}
          </>
        ) : (
          t("gym.saveGym")
        )}
      </Button>

      <PrePermissionDialog
        type="location"
        open={showLocationPermission}
        onAccept={handleLocationPermissionAccept}
        onDismiss={handleLocationPermissionDismiss}
      />
    </div>
  );
};

export default GymLocationPicker;
