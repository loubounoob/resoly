import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const REWARDS = [
  { tier: 1, name: "Accessoire sport", description: "Casquette ou serre-poignet", value: "~30€", emoji: "🧢", unlocked: true },
  { tier: 2, name: "T-shirt premium", description: "T-shirt d'une marque sportive", value: "~80€", emoji: "👕", unlocked: true },
  { tier: 3, name: "Ensemble sportif", description: "Short + haut de qualité", value: "~150€", emoji: "🎽", unlocked: false, current: true },
  { tier: 4, name: "Chaussures de sport", description: "Paire de chaussures running ou training", value: "~300€", emoji: "👟", unlocked: false },
  { tier: 5, name: "Tenue complète", description: "Équipement complet d'une marque premium", value: "~500€+", emoji: "🏆", unlocked: false },
];

const Rewards = () => {
  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Récompenses</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        Plus ta cote est élevée, plus le cadeau est beau
      </p>

      <div className="space-y-4">
        {REWARDS.map((r) => (
          <div
            key={r.tier}
            className={`relative rounded-2xl border p-5 transition-all ${
              r.current
                ? "border-primary/50 bg-primary/5 shadow-glow"
                : r.unlocked
                ? "border-border bg-card"
                : "border-border/50 bg-secondary/30 opacity-60"
            }`}
          >
            {r.current && (
              <span className="absolute -top-2.5 right-4 bg-gradient-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Objectif actuel
              </span>
            )}
            <div className="flex items-start gap-4">
              <div className="text-3xl">{r.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg">{r.name}</h3>
                  {r.unlocked && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {!r.unlocked && !r.current && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                <p className="text-sm font-display font-bold text-gradient-gold mt-2">{r.value}</p>
              </div>
              <div className="text-muted-foreground font-display text-sm">
                Tier {r.tier}
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
