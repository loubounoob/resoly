import { Target, Activity, Zap, Trophy, Rocket } from "lucide-react";

type Step = "motivation1" | "motivation2" | "motivation3" | "motivation4" | "motivation5";

interface MotivationStepsProps {
  step: Step;
  onSelect: (step: Step, value: string) => void;
  onFinish: () => void;
}

const STEP1_OPTIONS = ["Mon père", "Ma mère", "Un(e) pote", "Mon frère / ma sœur", "Autre"];
const STEP2_OPTIONS = [
  "Pas du tout",
  "De temps en temps",
  "Régulièrement mais peut mieux faire",
  "Il/elle a lâché depuis un moment",
];
const STEP3_OPTIONS = [
  "Je veux qu'on s'y mette ensemble",
  "Il/elle a besoin d'un coup de boost",
  "Je veux lui prouver que j'y crois",
  "C'est un cadeau qui change vraiment quelque chose",
];
const STEP4_OPTIONS = [
  "Qu'il/elle reprenne une routine",
  "Qu'il/elle se sente mieux",
  "Qu'on se challenge à deux",
  "Qu'il/elle se dépasse",
];

type StepConfig = {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  options: string[];
};

const STEPS: Record<Exclude<Step, "motivation5">, StepConfig> = {
  motivation1: {
    icon: <Target className="w-8 h-8 text-primary" />,
    iconBg: "bg-primary/10",
    title: "Tu veux remettre qui sur les rails ?",
    subtitle: "Choisis ta cible.",
    options: STEP1_OPTIONS,
  },
  motivation2: {
    icon: <Activity className="w-8 h-8 text-accent" />,
    iconBg: "bg-accent/10",
    title: "Niveau sport, il/elle en est où ?",
    subtitle: "Ça nous aide à calibrer le défi.",
    options: STEP2_OPTIONS,
  },
  motivation3: {
    icon: <Zap className="w-8 h-8 text-primary" />,
    iconBg: "bg-primary/10",
    title: "Qu'est-ce qui t'a décidé ?",
    subtitle: "Pourquoi maintenant ?",
    options: STEP3_OPTIONS,
  },
  motivation4: {
    icon: <Trophy className="w-8 h-8 text-accent" />,
    iconBg: "bg-accent/10",
    title: "L'objectif, c'est quoi ?",
    subtitle: "Tu vises quoi pour lui/elle ?",
    options: STEP4_OPTIONS,
  },
};

const MotivationSteps = ({ step, onSelect, onFinish }: MotivationStepsProps) => {
  if (step === "motivation5") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Les vrais passent à l'action.</h2>
          <p className="text-sm text-muted-foreground">Offrir un défi, c'est parier sur quelqu'un. Et ça, c'est fort.</p>
        </div>
        <button
          onClick={onFinish}
          className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
        >
          <Rocket className="w-5 h-5" /> C'est parti
        </button>
        <p className="text-xs text-muted-foreground italic">
          Un défi offert, c'est un game changer.
        </p>
      </div>
    );
  }

  const config = STEPS[step];

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-6">
      <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center`}>
        {config.icon}
      </div>
      <div>
        <h2 className="text-xl font-bold">{config.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>
      </div>
      <div className="w-full space-y-2">
        {config.options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(step, opt)}
            className="w-full p-4 rounded-xl border border-border bg-gradient-card text-left font-medium transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MotivationSteps;
