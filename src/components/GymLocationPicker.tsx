import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, Loader2, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";


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
  const [gymName, setGymName] = useState(currentGymName || "");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(
    currentLat && currentLon ? { lat: currentLat, lon: currentLon } : null
  );

  const handleUseCurrentLocation = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          toast.error(t('gym.gpsDenied'));
          setLoading(false);
          return;
        }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude, longitude } = position.coords;
      setSelectedCoords({ lat: latitude, lon: longitude });
      if (!gymName.trim()) setGymName(t('gym.myGym'));
      toast.success(t('gym.gpsRetrieved'));
    } catch {
      toast.error(t('gym.gpsError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !selectedCoords) {
      toast.error(t('gym.selectLocation'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          gym_latitude: selectedCoords.lat,
          gym_longitude: selectedCoords.lon,
          gym_name: gymName.trim() || t('gym.myGym'),
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      setSaved(true);
      toast.success(t('gym.saved'));
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error(t('gym.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium block">{t('gym.myGym')}</label>
      <p className="text-xs text-muted-foreground">
        {t('gym.searchDesc')}
      </p>

      {selectedCoords && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <Check className="w-3.5 h-3.5" />
          <span>{t('gym.positionSelected')}</span>
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
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 mr-2" />
        )}
        {t('gym.useLocation')}
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
            {t('common.saved')}
          </>
        ) : (
          t('gym.saveGym')
        )}
      </Button>
    </div>
  );
};

export default GymLocationPicker;
