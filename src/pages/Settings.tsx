import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import GymLocationPicker from "@/components/GymLocationPicker";
import { useMyProfile } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
