import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";
import GymLocationPicker from "@/components/GymLocationPicker";
import { useMyProfile } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();
  const { user } = useAuth();
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast.success(t('settings.deleteAccountSuccess'));
      await supabase.auth.signOut();
      queryClient.clear();
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(t('settings.deleteAccountError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">{t('settings.title')}</h1>
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
          <h2 className="text-sm font-medium text-muted-foreground">{t('settings.account')}</h2>
          <p className="text-sm">{user?.email}</p>

          <button
            onClick={() => navigate("/privacy")}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Shield className="w-4 h-4" />
            {t('settings.privacyPolicy')}
          </button>

          <Button variant="destructive" onClick={handleLogout} className="w-full rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            {t('settings.logout')}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-xl border-destructive text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('settings.deleteAccount')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings.deleteAccount')}</AlertDialogTitle>
                <AlertDialogDescription>{t('settings.deleteAccountDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? t('common.loading') : t('settings.deleteAccountConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
