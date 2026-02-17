import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flame, AtSign, Check, X, Loader2 } from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const UsernameGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // Check if user already has a username
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setHasUsername(!!data?.username);
      });
  }, [user]);

  // Debounced availability check
  useEffect(() => {
    if (!USERNAME_REGEX.test(username)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", username)
        .limit(1);
      setAvailable(!data || data.length === 0);
      setChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleConfirm = useCallback(async () => {
    if (!user || !available) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.toLowerCase() })
      .eq("user_id", user.id);
    if (error) {
      setSaving(false);
      return;
    }
    setHasUsername(true);
  }, [user, username, available]);

  if (hasUsername === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (hasUsername) return <>{children}</>;

  const isValid = USERNAME_REGEX.test(username);
  const canConfirm = isValid && available && !checking && !saving;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <Flame className="w-10 h-10 text-primary mb-4" />
      <h1 className="text-2xl font-display font-bold mb-2">Choisis ton pseudo</h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Ton pseudo sera visible par tes amis et unique sur Resoly.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="mon_pseudo"
            className="h-12 pl-11 bg-secondary border-border rounded-xl pr-10"
            maxLength={20}
            autoFocus
          />
          {isValid && !checking && available !== null && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {available ? (
                <Check className="w-5 h-5 text-primary" />
              ) : (
                <X className="w-5 h-5 text-destructive" />
              )}
            </div>
          )}
          {checking && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          3 à 20 caractères, lettres, chiffres et underscores uniquement.
        </p>

        {isValid && available === false && (
          <p className="text-xs text-destructive">Ce pseudo est déjà pris</p>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmer"}
        </Button>
      </div>
    </div>
  );
};

export default UsernameGuard;
