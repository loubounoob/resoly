import { Target, Activity, Zap, Trophy, Rocket } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

type Step = "motivation1" | "motivation2" | "motivation3" | "motivation4" | "motivation5";

interface MotivationStepsProps {
  step: Step;
  onSelect: (step: Step, value: string) => void;
  onFinish: () => void;
}

type StepConfig = {
  icon: React.ReactNode;
  iconBg: string;
  titleKey: string;
  subtitleKey: string;
  optionsKey: string;
};

const STEPS: Record<Exclude<Step, "motivation5">, StepConfig> = {
  motivation1: {
    icon: <Target className="w-8 h-8 text-primary" />,
    iconBg: "bg-primary/10",
    titleKey: "motivation.step1Title",
    subtitleKey: "motivation.step1Sub",
    optionsKey: "motivation.step1Opts",
  },
  motivation2: {
    icon: <Activity className="w-8 h-8 text-accent" />,
    iconBg: "bg-accent/10",
    titleKey: "motivation.step2Title",
    subtitleKey: "motivation.step2Sub",
    optionsKey: "motivation.step2Opts",
  },
  motivation3: {
    icon: <Zap className="w-8 h-8 text-primary" />,
    iconBg: "bg-primary/10",
    titleKey: "motivation.step3Title",
    subtitleKey: "motivation.step3Sub",
    optionsKey: "motivation.step3Opts",
  },
  motivation4: {
    icon: <Trophy className="w-8 h-8 text-accent" />,
    iconBg: "bg-accent/10",
    titleKey: "motivation.step4Title",
    subtitleKey: "motivation.step4Sub",
    optionsKey: "motivation.step4Opts",
  },
};

const MotivationSteps = ({ step, onSelect, onFinish }: MotivationStepsProps) => {
  const { t } = useLocale();

  if (step === "motivation5") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{t('motivation.step5Title')}</h2>
          <p className="text-sm text-muted-foreground">{t('motivation.step5Sub')}</p>
        </div>
        <button
          onClick={onFinish}
          className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
        >
          <Rocket className="w-5 h-5" /> {t('motivation.step5Cta')}
        </button>
        <p className="text-xs text-muted-foreground italic">
          {t('motivation.step5Note')}
        </p>
      </div>
    );
  }

  const config = STEPS[step];
  // @ts-ignore - optionsKey returns array from i18n
  const options = t(config.optionsKey) as unknown as string[];

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-2 gap-6">
      <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center`}>
        {config.icon}
      </div>
      <div>
        <h2 className="text-xl font-bold">{t(config.titleKey)}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t(config.subtitleKey)}</p>
      </div>
      <div className="w-full space-y-2">
        {options.map((opt) => (
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
