import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Mail, Lock, Loader2, User, Calendar, Tag, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/LocaleContext";
import { COUNTRY_CODES, COUNTRY_MAP, type CountryCode } from "@/i18n/currencies";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, locale, country, setCountry } = useLocale();

  // Pre-select country from locale detection
  useEffect(() => {
    if (!selectedCountry) {
      setSelectedCountry(country);
    }
  }, [country]);

  // Capture invite code from URL
  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) setReferralCode(invite);
  }, [searchParams]);

  // When country selection changes, update locale context immediately
  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setCountry(value as CountryCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const inviteCode = referralCode.trim() || undefined;
        const metadata: Record<string, any> = {};
        if (inviteCode) metadata.invite_code_used = inviteCode;
        if (age) metadata.age = parseInt(age);
        if (gender) metadata.gender = gender;
        if (selectedCountry) metadata.country = selectedCountry;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: Object.keys(metadata).length > 0 ? metadata : undefined,
          },
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
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
        {isLogin ? t('auth.welcomeBack') : t('auth.joinChallenge')}
      </h1>
      <p className="text-muted-foreground mb-8">
        {isLogin ? t('auth.loginSub') : t('auth.signupSub')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder={t('auth.email')}
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
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 pl-11 bg-secondary border-border rounded-xl"
            minLength={6}
            required
          />
        </div>

        {!isLogin && (
          <>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="number"
                placeholder={t('auth.age')}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-12 pl-11 bg-secondary border-border rounded-xl"
                min={13}
                max={99}
                required
              />
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Select value={gender} onValueChange={setGender} required>
                <SelectTrigger className="h-12 pl-11 bg-secondary border-border rounded-xl">
                  <SelectValue placeholder={t('auth.gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('auth.male')}</SelectItem>
                  <SelectItem value="female">{t('auth.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={handleCountryChange} required>
                <SelectTrigger className="h-12 pl-11 bg-secondary border-border rounded-xl">
                  <SelectValue placeholder={t('auth.country')} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {COUNTRY_MAP[code].label[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('auth.referralCode')}
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="h-12 pl-11 bg-secondary border-border rounded-xl"
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isLogin ? (
            t('auth.loginBtn')
          ) : (
            t('auth.signupBtn')
          )}
        </Button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        {isLogin ? (
          <>{t('auth.noAccount')} <span className="text-primary font-medium">{t('auth.signupLink')}</span></>
        ) : (
          <>{t('auth.hasAccount')} <span className="text-primary font-medium">{t('auth.loginLink')}</span></>
        )}
      </button>
    </div>
  );
};

export default Auth;
