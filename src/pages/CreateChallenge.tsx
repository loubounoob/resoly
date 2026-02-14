import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Flame, TrendingUp, Gift, Loader2 } from "lucide-react";
import { useCreateChallenge } from "@/hooks/useChallenge";
import { toast } from "sonner";

const DURATION_OPTIONS = [1, 2, 3, 6, 12];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6, 7];

const calculateOdds = (sessionsPerWeek: number, months: number): number => {
  const base = 1.0;
  const sessionMultiplier = sessionsPerWeek <= 2 ? 0.3 : sessionsPerWeek <= 4 ? 0.6 : 1.0;
  const durationMultiplier = months <= 1 ? 0.2 : months <= 3 ? 0.5 : months <= 6 ? 0.8 : 1.2;
  return Math.round((base + sessionMultiplier + durationMultiplier) * 100) / 100;
};

const getRewardTier = (value: number) => {
  if (value >= 500) return { label: "Tenue complète", emoji: "🏆", color: "text-gradient-gold" };
  if (value >= 300) return { label: "Chaussures de sport", emoji: "👟", color: "text-gradient-gold" };
  if (value >= 150) return { label: "Ensemble sportif", emoji: "🎽", color: "text-primary" };
  if (value >= 80) return { label: "T-shirt premium", emoji: "👕", color: "text-primary" };
  return { label: "Accessoire sport", emoji: "🧢", color: "text-muted-foreground" };
};

const CreateChallenge = () => {
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState(50);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const createChallenge = useCreateChallenge();

  const odds = calculateOdds(sessionsPerWeek, duration);
  const rewardValue = Math.round(betAmount * odds);
  const reward = getRewardTier(rewardValue);
  const totalSessions = sessionsPerWeek * duration * 4;

  const handleSubmit = async () => {
    try {
      await createChallenge.mutateAsync({
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_per_month: betAmount,
        odds,
      });
      toast.success("Défi créé avec succès !");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Erreur lors de la création du défi");
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
          <div className="grid grid-cols-5 gap-2">
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
                {d}<span className="text-xs font-normal ml-0.5">m</span>
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
              <span className="font-bold text-lg">{betAmount * duration}€</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Séances totales</span>
              <span className="font-bold text-lg">{totalSessions}</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Récompense</span>
            </div>
            <span className={`font-display font-bold text-lg ${reward.color}`}>
              {reward.emoji} {reward.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Valeur estimée du cadeau : ~{rewardValue}€
          </p>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handleSubmit}
        disabled={createChallenge.isPending}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow rounded-xl mt-6"
      >
        {createChallenge.isPending ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Flame className="w-5 h-5 mr-2" />
        )}
        Valider le défi
      </Button>
    </div>
  );
};

export default CreateChallenge;
