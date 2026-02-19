import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, Loader2, Check } from "lucide-react";

interface GymLocationPickerProps {
  currentGymName?: string | null;
  onSaved?: () => void;
}

const GymLocationPicker = ({ currentGymName, onSaved }: GymLocationPickerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gymName, setGymName] = useState(currentGymName || "");

  const handleLocate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") {
          toast.error("Permission de localisation refusée");
          setLoading(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude, longitude } = position.coords;

      const { error } = await supabase
        .from("profiles")
        .update({
          gym_latitude: latitude,
          gym_longitude: longitude,
          gym_name: gymName.trim() || "Ma salle",
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      setSaved(true);
      toast.success("Salle de sport enregistrée !");
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Impossible de récupérer la position");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground block">📍 Ma salle de sport (optionnel)</label>
      <p className="text-xs text-muted-foreground">
        Enregistre ta position quand tu es à la salle pour recevoir un rappel automatique à chaque visite.
      </p>
      <input
        type="text"
        value={gymName}
        onChange={(e) => setGymName(e.target.value)}
        placeholder="Nom de ta salle (ex: Basic-Fit Bastille)"
        className="w-full h-10 rounded-xl border border-border bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        onClick={handleLocate}
        disabled={loading || saved}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <MapPin className="w-4 h-4 mr-2" />
        )}
        {saved ? "Position enregistrée" : currentGymName ? "Mettre à jour la position" : "Utiliser ma position actuelle"}
      </Button>
    </div>
  );
};

export default GymLocationPicker;
