import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useLocale } from "@/contexts/LocaleContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [visible, setVisible] = useState(false);
  const { t } = useLocale();

  const isSocial = !!searchParams.get("social_challenge_id");
  const isCoins = searchParams.get("type") === "coins";
  const isPersonalChallenge = !isCoins && !isSocial;

  useEffect(() => {
    const verify = async () => {
      const sessionId = searchParams.get("session_id");

      if (isCoins) {
        if (!sessionId) { setStatus("error"); return; }
        try {
          const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
            body: { sessionId },
          });
          if (error) throw error;
          if (data?.success) setStatus("success");
          else setStatus("error");
        } catch { setStatus("error"); }
        return;
      }

      const challengeId = searchParams.get("challenge_id");
      const socialChallengeId = searchParams.get("social_challenge_id");
      const memberId = searchParams.get("member_id");

      if (!sessionId || (!challengeId && !socialChallengeId)) {
        setStatus("error");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId, challengeId, socialChallengeId, memberId },
        });

        if (error) throw error;
        if (data?.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    if (status !== "success" || !isPersonalChallenge) return;

    requestAnimationFrame(() => setVisible(true));

    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#a3e635", "#facc15", "#f97316", "#22d3ee"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [status, isPersonalChallenge]);

  useEffect(() => {
    if (status === "success" && !isPersonalChallenge) {
      setVisible(true);
    }
  }, [status, isPersonalChallenge]);

  const handleGo = () => {
    navigate(isCoins ? "/dashboard" : isSocial ? "/friends" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground">{t('paymentSuccess.verifying')}</p>
        </>
      )}

      {status === "success" && isPersonalChallenge && (
        <div
          className={`flex flex-col items-center gap-6 px-8 text-center transition-all duration-500 ${
            visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"
          }`}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse">
              <Flame className="w-12 h-12 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping" />
          </div>

          <div>
            <h1 className="text-3xl font-display font-bold text-gradient-primary mb-2">
              {t('paymentSuccess.letsGo')}
            </h1>
            <p className="text-lg text-foreground/90 font-medium">
              {t('paymentSuccess.challengeActive')}
            </p>
          </div>

          <p className="text-muted-foreground text-sm max-w-[250px]">
            {t('paymentSuccess.showWhatYouGot')}
          </p>

          <Button
            onClick={handleGo}
            className="h-12 px-8 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {t('common.go')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {status === "success" && !isPersonalChallenge && (
        <>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">
            {isCoins ? t('paymentSuccess.coinsAddedTitle') : t('paymentSuccess.paymentConfirmed')}
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            {isCoins
              ? t('paymentSuccess.coinsCredit')
              : t('paymentSuccess.socialConfirmed')}
          </p>
          <Button
            onClick={handleGo}
            className="h-14 px-8 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isCoins ? t('paymentSuccess.returnBtn') : t('paymentSuccess.viewChallenges')}
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">{t('paymentSuccess.errorTitle')}</h1>
          <p className="text-muted-foreground text-center text-sm">
            {t('paymentSuccess.errorDesc')}
          </p>
          <Button
            onClick={() => navigate(isSocial ? "/friends" : "/create")}
            variant="outline"
            className="rounded-xl"
          >
            {t('paymentSuccess.returnBtn')}
          </Button>
        </>
      )}
    </div>
  );
};

export default PaymentSuccess;
