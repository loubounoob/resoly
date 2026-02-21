import { Heart, Gift, Star } from "lucide-react";

type Step = "motivation1" | "motivation2" | "motivation3";

interface MotivationStepsProps {
  step: Step;
  onSelect: (step: Step, value: string) => void;
  onFinish: () => void;
}

const STEP1_OPTIONS = ["Mon père", "Ma mère", "Un(e) ami(e)", "Mon frère / ma sœur", "Autre"];
const STEP2_OPTIONS = [
  "Il/elle en a besoin",
  "Pour qu'on se motive ensemble",
  "Pour lui montrer que j'y crois",
  "Juste pour lui faire plaisir",
];

const MotivationSteps = ({ step, onSelect, onFinish }: MotivationStepsProps) => {
  if (step === "motivation1") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Tu fais ça pour quelqu'un de spécial.</h2>
          <p className="text-sm text-muted-foreground mt-1">C'est qui ?</p>
        </div>
        <div className="w-full space-y-2">
          {STEP1_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect("motivation1", opt)}
              className="w-full p-4 rounded-xl border border-border bg-gradient-card text-left font-medium transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "motivation2") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-6">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Heart className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Chaque geste compte.</h2>
          <p className="text-sm text-muted-foreground mt-1">Pourquoi tu veux l'aider ?</p>
        </div>
        <div className="w-full space-y-2">
          {STEP2_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect("motivation2", opt)}
              className="w-full p-4 rounded-xl border border-border bg-gradient-card text-left font-medium transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // motivation3
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Star className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Prendre soin de ses proches, c'est rare.</h2>
        <p className="text-sm text-muted-foreground">Peu de gens le font. Toi, tu le fais.</p>
      </div>
      <button
        onClick={onFinish}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl transition-all active:scale-[0.98]"
      >
        Créer le défi 🎁
      </button>
      <p className="text-xs text-muted-foreground italic">
        La santé de ceux qu'on aime, ça n'a pas de prix.
      </p>
    </div>
  );
};

export default MotivationSteps;
