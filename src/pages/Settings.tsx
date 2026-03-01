import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import GymLocationPicker from "@/components/GymLocationPicker";
import { useMyProfile } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { COUNTRY_CODES, COUNTRY_MAP, type CountryCode } from "@/i18n/currencies";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();
  const { user } = useAuth();
  const { t, locale, country, setCountry } = useLocale();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/");
  };

  const handleCountryChange = async (value: string) => {
    setCountry(value as CountryCode);
    if (user) {
      await supabase.from("profiles").update({ country: value } as any).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    }
    toast.success(t('settings.countrySaved'));
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">{t('settings.title')}</h1>
      </div>

      <div className="space-y-8">
        {/* Language and country */}
        <section className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-medium">{t('settings.languageCountry')}</h2>
          </div>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger className="h-12 bg-secondary border-border rounded-xl">
              <SelectValue placeholder={t('settings.selectCountry')} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_MAP[code].label[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

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
          <Button variant="destructive" onClick={handleLogout} className="w-full rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            {t('settings.logout')}
          </Button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
