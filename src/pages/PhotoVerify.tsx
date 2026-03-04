import { Camera, CheckCircle2, XCircle, Loader2, PartyPopper } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import AvatarUpload from "@/components/AvatarUpload";
import { useActiveChallenge, useCheckIns, useCreateCheckIn, useUserCoins } from "@/hooks/useChallenge";
import { useMyProfile } from "@/hooks/useFriends";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isToday } from "date-fns";
import confetti from "canvas-confetti";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import ChallengeVictoryOverlay from "@/components/ChallengeVictoryOverlay";
import { calculateCoins, getPromoMultiplier } from "@/lib/coins";

type SessionPhase = "idle" | "loading" | "ai-result" | "congrats" | "avatar-prompt" | "victory";

const PhotoVerify = () => {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [aiStatus, setAiStatus] = useState<"success" | "error" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const didValidateThisSession = useRef(false);
  const { user } = useAuth();
  const { t, locale, formatCurrency, currency } = useLocale();

  const { data: challenge } = useActiveChallenge();
  const { data: checkIns } = useCheckIns(challenge?.id);
  const { data: myProfile } = useMyProfile();
  const createCheckIn = useCreateCheckIn();
  const navigate = useNavigate();

  const verifiedCount = checkIns ? checkIns.filter(ci => ci.verified).length : 0;
  const isFirstSession = verifiedCount === 0;
  const hasNoAvatar = !myProfile?.avatar_url;
  const hasNoGymLocation = !myProfile?.gym_latitude || !myProfile?.gym_longitude;

  const saveGymLocation = async () => {
    if (!user || !hasNoGymLocation) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") return;
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude, longitude } = position.coords;
      await supabase
        .from("profiles")
        .update({
          gym_latitude: latitude,
          gym_longitude: longitude,
          gym_name: t('photoVerify.myGym'),
        } as any)
        .eq("user_id", user.id);
    } catch (err) {
      console.error("Could not save gym location:", err);
    }
  };

  const hasCheckedInToday =
    !didValidateThisSession.current &&
    (checkIns?.some((ci) => ci.verified && isToday(new Date(ci.checked_in_at))) ?? false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!challenge) {
      toast.error(t('photoVerify.noChallenge'));
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setPhase("loading");
    setReason("");
    setAiStatus(null);

    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("verify-photo", {
        body: { imageBase64, locale },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const verified = data.verified === true;
      setReason(data.reason || "");

      const checkInResult = await createCheckIn.mutateAsync({
        challenge_id: challenge.id,
        verified,
      });

      if (verified) {
        didValidateThisSession.current = true;
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 300);

        try {
          const ext = file.name.split(".").pop() || "jpg";
          const filePath = `${user!.id}/${checkInResult.id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("check-in-photos")
            .upload(filePath, file, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("check-in-photos")
              .getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              await supabase
                .from("check_ins")
                .update({ photo_url: urlData.publicUrl })
                .eq("id", checkInResult.id);
            }
          }
        } catch (uploadErr) {
          console.error("Story photo upload failed:", uploadErr);
        }

        if (isFirstSession && hasNoGymLocation) {
          saveGymLocation();
        }
      }

      setAiStatus(verified ? "success" : "error");
      setPhase("ai-result");
    } catch (err) {
      console.error("Verification error:", err);
      setAiStatus("error");
      setReason(t('photoVerify.verificationError'));
      setPhase("ai-result");
      toast.error(t('photoVerify.errorVerifying'));
    }
  };

  const handleRetry = () => {
    setPreview(null);
    setPhase("idle");
    setReason("");
    setAiStatus(null);
  };

  const handleContinueAfterSuccess = () => {
    // Check if this was the last session needed to complete the challenge
    // verifiedCount was calculated before this check-in, so +1 for the one we just created
    const newVerifiedCount = verifiedCount + 1;
    const totalSessions = challenge?.total_sessions ?? 0;
    
    if (totalSessions > 0 && newVerifiedCount >= totalSessions) {
      setPhase("victory");
      return;
    }
    
    if (isFirstSession && hasNoAvatar) {
      setPhase("avatar-prompt");
    } else {
      setPhase("congrats");
    }
  };

  if (hasCheckedInToday && phase === "idle") {
    return (
      <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-2">{t('photoVerify.title')}</h1>
        <p className="text-muted-foreground text-sm mb-8">
          {t('photoVerify.subtitle')}
        </p>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-lg font-display font-bold">{t('photoVerify.alreadyToday')}</h2>
            <p className="text-sm text-muted-foreground">{t('photoVerify.comeBack')}</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 rounded-xl">
              {t('photoVerify.backDashboard')}
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (phase === "avatar-prompt") {
    return (
      <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs text-center space-y-6">
            <h2 className="text-2xl font-display font-bold">{t('photoVerify.addPhoto')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('photoVerify.friendsRecognize')}
            </p>
            <AvatarUpload
              currentUrl={myProfile?.avatar_url}
              size="lg"
              showSkip
              onSkip={() => setPhase("congrats")}
              onUploaded={() => setPhase("congrats")}
            />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (phase === "congrats") {
    return (
      <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs text-center space-y-5">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <PartyPopper className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold">{t('photoVerify.bravo')}</h2>
            <p className="text-muted-foreground">
              {t('photoVerify.validatedDesc')}
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
            >
              {t('photoVerify.backDashboard')}
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (phase === "victory" && challenge) {
    const totalBet = challenge.bet_per_month;
    const promoMult = getPromoMultiplier(challenge.promo_code ?? undefined);
    const coinsToEarn = Math.round(calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week, currency) * promoMult);
    
    return (
      <ChallengeVictoryOverlay
        betAmount={totalBet}
        coinsEarned={coinsToEarn}
        challengeId={challenge.id}
        isBoosted={!!challenge.social_challenge_id}
        onClose={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-2">{t('photoVerify.title')}</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {t('photoVerify.subtitle')}
      </p>

      <div className="flex-1 flex flex-col items-center justify-center">
        {phase === "idle" && !preview && (
          <label className="w-full aspect-square max-w-xs rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{t('photoVerify.takePhoto')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('photoVerify.aiVerify')}</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="hidden"
            />
          </label>
        )}

        {preview && (phase === "loading" || phase === "ai-result") && (
          <div className="w-full max-w-xs space-y-6">
            <div className="relative rounded-2xl overflow-hidden aspect-square shadow-card">
              <img src={preview} alt="Vérification" className="w-full h-full object-cover" />
              {phase === "loading" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">{t('photoVerify.analyzing')}</p>
                </div>
              )}
              {phase === "ai-result" && aiStatus === "success" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                  <p className="text-lg font-display font-bold text-primary">{t('photoVerify.sessionValid')}</p>
                  {reason && <p className="text-xs text-muted-foreground text-center px-4">{reason}</p>}
                </div>
              )}
              {phase === "ai-result" && aiStatus === "error" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <XCircle className="w-16 h-16 text-destructive" />
                  <p className="text-lg font-display font-bold text-destructive">{t('photoVerify.notRecognized')}</p>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {reason || t('photoVerify.retryGym')}
                  </p>
                </div>
              )}
            </div>

            {phase === "ai-result" && aiStatus === "success" && (
              <Button
                onClick={handleContinueAfterSuccess}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display font-bold"
              >
                {t('common.continue')}
              </Button>
            )}
            {phase === "ai-result" && aiStatus === "error" && (
              <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl">
                {t('common.retry')}
              </Button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PhotoVerify;
