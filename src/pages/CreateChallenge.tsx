import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Flame, TrendingUp, Coins, Loader2 } from "lucide-react";
import { useCreateChallenge, useActiveChallenge } from "@/hooks/useChallenge";
import { calculateCoins } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6, 7];

const calculateOdds = (sessionsPerWeek: number, months: number): number => {
  const base = 1.0;
  const sessionMultiplier = sessionsPerWeek <= 2 ? 0.3 : sessionsPerWeek <= 4 ? 0.6 : 1.0;
  const durationMultiplier = months <= 1 ? 0.2 : months <= 3 ? 0.5 : months <= 6 ? 0.8 : 1.2;
  return Math.round((base + sessionMultiplier + durationMultiplier) * 100) / 100;
};

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { data: activeChallenge, isLoading: loadingActive } = useActiveChallenge();
  const [betAmount, setBetAmount] = useState(50);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const createChallenge = useCreateChallenge();

  useEffect(() => {
    if (!loadingActive && activeChallenge) {
      navigate("/dashboard", { replace: true });
    }
  }, [loadingActive, activeChallenge, navigate]);

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const odds = calculateOdds(sessionsPerWeek, duration);
  const totalBet = betAmount * duration;
  const totalSessions = sessionsPerWeek * duration * 4;
  const coinsPreview = calculateCoins(totalBet, duration, sessionsPerWeek);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      // 1. Create challenge in DB (pending payment)
      const challenge = await createChallenge.mutateAsync({
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_per_month: betAmount,
        odds,
      });

      // 2. Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          challengeId: challenge.id,
          amount: totalBet,
          description: `Mise FitBet — ${sessionsPerWeek}x/sem pendant ${duration} mois`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du paiement");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Créer un défi</h1>
      </div>

      <div className="flex-1 space-y-8">
        {/* Bet Amount */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Mise mensuelle</label>
          <div className="text-center mb-4">
            <span className="text-5xl font-display font-bold text-gradient-primary">{betAmount}€</span>
            <span className="text-muted-foreground text-sm block mt-1">/mois</span>
          </div>
          <Slider
            value={[betAmount]}
            onValueChange={(v) => setBetAmount(v[0])}
            min={10}
            max={200}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>10€</span>
            <span>200€</span>
          </div>
        </section>

        {/* Sessions per week */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Séances par semaine</label>
          <div className="grid grid-cols-6 gap-2">
            {SESSIONS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSessionsPerWeek(s)}
                className={`h-12 rounded-lg font-display font-bold text-lg transition-all ${
                  sessionsPerWeek === s
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Duration */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Durée d'engagement</label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`h-12 rounded-lg font-display font-bold transition-all ${
                  duration === d
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {d}<span className="text-xs font-normal ml-0.5">mois</span>
              </button>
            ))}
          </div>
        </section>

        {/* Summary Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Ta cote</span>
            </div>
            <span className="text-2xl font-display font-bold text-gradient-gold">x{odds}</span>
          </div>

          <div className="h-px bg-border" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">Mise totale</span>
              <span className="font-bold text-lg">{totalBet}€</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Séances totales</span>
              <span className="font-bold text-lg">{totalSessions}</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Pièces à gagner</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">
              🪙 {coinsPreview}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu récupères ta mise de {totalBet}€ + {coinsPreview} pièces si tu réussis le défi
          </p>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || createChallenge.isPending}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow rounded-xl mt-6"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Flame className="w-5 h-5 mr-2" />
        )}
        Payer {totalBet}€ et lancer le défi
      </Button>
    </div>
  );
};

export default CreateChallenge;
