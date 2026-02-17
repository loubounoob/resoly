import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Mail, Lock, User, AtSign, Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debounced username availability check
  useEffect(() => {
    if (!USERNAME_REGEX.test(username)) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", username)
        .limit(1);
      setUsernameAvailable(!data || data.length === 0);
      setCheckingUsername(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        if (!USERNAME_REGEX.test(username) || usernameAvailable === false) {
          toast({ title: "Erreur", description: "Pseudo invalide ou déjà pris", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, username: username.toLowerCase() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <Flame className="w-8 h-8 text-primary" />
        <span className="text-2xl font-display font-bold">Resoly</span>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        {isLogin ? "Content de te revoir" : "Rejoins le défi"}
      </h1>
      <p className="text-muted-foreground mb-8">
        {isLogin ? "Connecte-toi pour continuer" : "Crée ton compte pour commencer"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {!isLogin && (
          <>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ton prénom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 pl-11 bg-secondary border-border rounded-xl"
                required
              />
            </div>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ton pseudo"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setUsername(val);
                  if (!USERNAME_REGEX.test(val)) { setUsernameAvailable(null); return; }
                  setCheckingUsername(true);
                  // Inline debounce via setTimeout cleared by next render
                }}
                className="h-12 pl-11 pr-10 bg-secondary border-border rounded-xl"
                maxLength={20}
                required
              />
              {USERNAME_REGEX.test(username) && !checkingUsername && usernameAvailable !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameAvailable ? <Check className="w-5 h-5 text-primary" /> : <X className="w-5 h-5 text-destructive" />}
                </div>
              )}
              {checkingUsername && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
            </div>
          </>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 pl-11 bg-secondary border-border rounded-xl"
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 pl-11 bg-secondary border-border rounded-xl"
            minLength={6}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isLogin ? (
            "Se connecter"
          ) : (
            "Créer mon compte"
          )}
        </Button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        {isLogin ? (
          <>Pas encore de compte ? <span className="text-primary font-medium">Inscris-toi</span></>
        ) : (
          <>Déjà un compte ? <span className="text-primary font-medium">Connecte-toi</span></>
        )}
      </button>
    </div>
  );
};

export default Auth;
