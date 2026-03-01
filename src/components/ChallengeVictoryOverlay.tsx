import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, Loader2, Plus, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoinIcon from "@/components/CoinIcon";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { useLocale } from "@/contexts/LocaleContext";

interface ChallengeVictoryOverlayProps {
  betAmount: number;
  coinsEarned: number;
  challengeId: string;
  isBoosted?: boolean;
  onClose: () => void;
}

const ChallengeVictoryOverlay = ({
  betAmount,
  coinsEarned,
  challengeId,
  isBoosted = false,
  onClose,
}: ChallengeVictoryOverlayProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, formatCurrency } = useLocale();
  const [phase, setPhase] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [refundStatus, setRefundStatus] = useState<"loading" | "success" | "slow" | "error">("loading");
  const animFrameRef = useRef<number>();

  const fireConfetti = useCallback(() => {
    const gold = ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520"];
    const green = ["#7CFC00", "#ADFF2F", "#9ACD32"];
    const colors = [...gold, ...green];

    confetti({ particleCount: 80, spread: 70, origin: { x: 0.1, y: 0.6 }, colors, gravity: 0.8 });
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.9, y: 0.6 }, colors, gravity: 0.8 });

    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.4 }, colors, scalar: 1.2 });
    }, 300);

    setTimeout(() => {
      confetti({ particleCount: 40, spread: 120, origin: { x: 0.3, y: 0.3 }, colors });
      confetti({ particleCount: 40, spread: 120, origin: { x: 0.7, y: 0.3 }, colors });
    }, 700);
  }, []);

  const animateCoins = useCallback(() => {
    const duration = 2000;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCoinCount(Math.round(eased * coinsEarned));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [coinsEarned]);

  useEffect(() => {
    const slowTimer = setTimeout(() => {
      setRefundStatus((s) => (s === "loading" ? "slow" : s));
    }, 3000);

    supabase.functions
      .invoke("complete-challenge", { body: { challengeId } })
      .then(({ data, error }) => {
        clearTimeout(slowTimer);
        if (error || !data?.success) {
          setRefundStatus("error");
        } else {
          setRefundStatus("success");
        }
      })
      .catch(() => {
        clearTimeout(slowTimer);
        setRefundStatus("error");
      });

    return () => clearTimeout(slowTimer);
  }, [challengeId, queryClient]);

  useEffect(() => {
    fireConfetti();
    setPhase(1);

    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => {
      setPhase(3);
      animateCoins();
    }, 2500);
    const t4 = setTimeout(() => setPhase(4), 5000);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fireConfetti, animateCoins]);

  const handleNewChallenge = () => {
    queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
    queryClient.invalidateQueries({ queryKey: ["user-coins"] });
    onClose();
    navigate("/onboarding-challenge");
  };

  const handleGiftChallenge = () => {
    queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
    queryClient.invalidateQueries({ queryKey: ["user-coins"] });
    onClose();
    navigate("/friends/create-social");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/40 animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {phase >= 2 && (
        <div className="flex flex-col items-center animate-scale-in">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-gold animate-victory-pulse">
              <Trophy className="w-12 h-12 text-amber-900" />
            </div>
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          </div>

          <h1 className="text-3xl font-display font-bold text-gradient-gold mb-2 tracking-tight">
            {t('victory.challengeSuccess')}
          </h1>

          <div className="flex flex-col items-center mt-2 mb-4">
            <span className="text-2xl font-display font-bold text-gradient-gold">
              {isBoosted ? t('victory.boostedSuccess') : t('victory.refunded', { amount: formatCurrency(betAmount) })}
            </span>
            {!isBoosted && (refundStatus === "loading" || refundStatus === "slow") && (
              <div className="flex items-center gap-2 mt-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-xs text-amber-200/60">
                  {refundStatus === "slow"
                    ? t('victory.slow')
                    : t('victory.processing')}
                </span>
              </div>
            )}
            {isBoosted && (refundStatus === "loading" || refundStatus === "slow") && (
              <div className="flex items-center gap-2 mt-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-xs text-amber-200/60">{t('victory.finalization')}</span>
              </div>
            )}
            {refundStatus === "error" && (
              <span className="text-xs text-destructive mt-1.5">
                {t('victory.errorContact')}
              </span>
            )}
          </div>
        </div>
      )}

      {phase >= 3 && (
        <div className="flex flex-col items-center animate-fade-in mt-2">
          <div className="flex items-center gap-3 bg-secondary/50 border border-amber-500/30 rounded-2xl px-6 py-4">
            <CoinIcon size={28} />
            <span className="text-4xl font-display font-bold tabular-nums text-gradient-gold">
              +{coinCount}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-2">{t('victory.coinsEarned')}</span>
        </div>
      )}

      {phase >= 4 && (
        <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in w-full max-w-xs px-6">
          <p className="text-sm text-muted-foreground mb-2 font-medium">{t('victory.whatsNext')}</p>
          <Button
            onClick={handleNewChallenge}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('victory.newChallenge')}
          </Button>
          <Button
            onClick={handleGiftChallenge}
            variant="outline"
            className="w-full h-12 font-display font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-xl"
          >
            <Gift className="w-4 h-4 mr-2" />
            {t('victory.giftChallenge')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChallengeVictoryOverlay;
