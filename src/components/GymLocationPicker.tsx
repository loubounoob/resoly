import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, Loader2, Check, Search, X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

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
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(
    currentLat && currentLon ? { lat: currentLat, lon: currentLon } : null
  );
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (value: string) => {
    setGymName(value);
    setSaved(false);
    setSelectedCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 400);
  };

  const handleSelectSuggestion = (result: NominatimResult) => {
    const shortName = result.display_name.split(",").slice(0, 2).join(",").trim();
    setGymName(shortName);
    setSelectedCoords({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
    setShowSuggestions(false);
    setSuggestions([]);
  };

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
    <div className="space-y-3" ref={containerRef}>
      <label className="text-sm font-medium block">{t('gym.myGym')}</label>
      <p className="text-xs text-muted-foreground">
        {t('gym.searchDesc')}
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={gymName}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={t('gym.searchPlaceholder')}
          className="w-full h-11 rounded-xl border border-border bg-secondary pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {gymName && (
          <button
            onClick={() => { setGymName(""); setSuggestions([]); setSelectedCoords(null); setSaved(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.place_id}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors border-b border-border last:border-b-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
