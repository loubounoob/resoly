import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import GymLocationPicker from "@/components/GymLocationPicker";
import { useMyProfile } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [iban, setIban] = useState("");
  const [savingIban, setSavingIban] = useState(false);

  useEffect(() => {
    if ((myProfile as any)?.iban) {
      setIban((myProfile as any).iban);
    }
  }, [myProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">Paramètres</h1>
      </div>

      <div className="space-y-8">
        {/* Gym location */}
        <section className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card">
          <GymLocationPicker
            currentGymName={(myProfile as any)?.gym_name}
            currentLat={(myProfile as any)?.gym_latitude}
            currentLon={(myProfile as any)?.gym_longitude}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-profile"] })}
          />
        </section>

        {/* IBAN */}
        <section className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">IBAN (pour recevoir tes gains)</h2>
          <Input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            className="font-mono text-sm"
          />
          <Button
            size="sm"
            className="w-full rounded-xl"
            disabled={savingIban}
            onClick={async () => {
              if (!user) return;
              setSavingIban(true);
              const { error } = await supabase
                .from("profiles")
                .update({ iban: iban.trim() || null } as any)
                .eq("user_id", user.id);
              setSavingIban(false);
              if (error) {
                toast.error("Erreur lors de la sauvegarde");
              } else {
                toast.success("IBAN mis à jour ✓");
                queryClient.invalidateQueries({ queryKey: ["my-profile"] });
              }
            }}
          >
            {savingIban ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </section>

        {/* Account */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Compte</h2>
          <p className="text-sm">{user?.email}</p>
          <Button variant="destructive" onClick={handleLogout} className="w-full rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
