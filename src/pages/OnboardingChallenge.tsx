import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flame, Target, TrendingUp, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonial1 from "@/assets/testimonial-1.png";
import testimonial2 from "@/assets/testimonial-2.png";
import testimonial3 from "@/assets/testimonial-3.png";
import testimonial4 from "@/assets/testimonial-4.png";
import testimonial5 from "@/assets/testimonial-5.png";
import testimonial6 from "@/assets/testimonial-6.png";
import { useLocale } from "@/contexts/LocaleContext";

type SlideType = "single" | "multi" | "info" | "testimonials" | "final";

interface Testimonial {
  image: string;
  name: string;
  result: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  { image: testimonial1, name: "Clara, 26 ans", result: "-8 kg en 2 mois", quote: "J'ai jamais tenu aussi longtemps. Le fait de miser m'a tout changé." },
  { image: testimonial2, name: "Thomas, 31 ans", result: "-14 kg en 3 mois", quote: "Je pensais que c'était impossible. Resoly m'a prouvé le contraire." },
  { image: testimonial3, name: "Karim, 24 ans", result: "+6 kg de muscle", quote: "Le challenge avec un pote m'a donné une discipline de fou." },
  { image: testimonial4, name: "Philippe, 52 ans", result: "-11 kg en 3 mois", quote: "À mon âge, j'aurais jamais cru reprendre le sport. Merci Resoly." },
  { image: testimonial5, name: "Marc, 41 ans", result: "-9 kg en 2 mois", quote: "Simple, efficace. J'ai retrouvé la forme et la confiance." },
  { image: testimonial6, name: "Sophie, 35 ans", result: "-7 kg en 2 mois", quote: "Les résultats parlent d'eux-mêmes. Je recommande à 100%." },
];

interface Slide {
  type: SlideType;
  emoji?: string;
  titleKey: string;
  subtitleKey?: string;
  optionsKey?: string;
  emojisKey?: string;
  bodyKey?: string;
}

const slides: Slide[] = [
  {
    type: "single",
    emoji: "🎯",
    titleKey: "onboarding.slide1Title",
    optionsKey: "onboarding.slide1Opts",
    emojisKey: "onboarding.slide1Emojis",
  },
  {
    type: "multi",
    emoji: "🚧",
    titleKey: "onboarding.slide2Title",
    subtitleKey: "onboarding.slide2Sub",
    optionsKey: "onboarding.slide2Opts",
    emojisKey: "onboarding.slide2Emojis",
  },
  {
    type: "info",
    emoji: "💡",
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
  },
  {
    type: "info",
    emoji: "💰",
    titleKey: "onboarding.slide4Title",
    bodyKey: "onboarding.slide4Body",
  },
  {
    type: "testimonials",
    titleKey: "onboarding.slide5Title",
    subtitleKey: "onboarding.slide5Sub",
  },
  {
    type: "single",
    emoji: "⚡",
    titleKey: "onboarding.slide6Title",
    optionsKey: "onboarding.slide6Opts",
    emojisKey: "onboarding.slide6Emojis",
  },
  {
    type: "final",
    emoji: "🚀",
    titleKey: "",
  },
];

const TestimonialsSlide = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const pointerStart = useRef<{ x: number; id: number } | null>(null);
  const { t } = useLocale();

  const goNext = () => setActiveIdx((i) => (i + 1) % TESTIMONIALS.length);
  const goPrev = () => setActiveIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, id: e.pointerId };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const diff = e.clientX - pointerStart.current.x;
    if (Math.abs(diff) > 30) {
      diff < 0 ? goNext() : goPrev();
    }
    pointerStart.current = null;
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex items-center gap-1 mb-1">
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <div className="relative w-5 h-5">
          <Star className="w-5 h-5 text-muted-foreground/30" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "70%" }}>
            <Star className="w-5 h-5 text-accent fill-accent" />
          </div>
        </div>
        <span className="text-sm font-bold text-accent ml-1">4.7</span>
      </div>
      <h1 className="text-2xl font-display font-bold leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      <div className="flex gap-4 text-center">
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">94%</p>
          <p className="text-[10px] text-muted-foreground">{t('onboarding.statsSuccess')}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">7x</p>
          <p className="text-[10px] text-muted-foreground">{t('onboarding.statsRegular')}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">2 400+</p>
          <p className="text-[10px] text-muted-foreground">{t('onboarding.statsTransformed')}</p>
        </div>
      </div>

      <div
        className="w-full relative touch-pan-y select-none cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
      >
        <div className="flex" style={{ transform: `translateX(-${activeIdx * 100}%)`, transition: "transform 0.25s ease-out" }}>
          {TESTIMONIALS.map((item, i) => (
            <div key={i} className="w-full flex-shrink-0">
              <div className="rounded-2xl border border-border bg-secondary/30 overflow-hidden pointer-events-none">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full aspect-[4/3] object-contain bg-black/20"
                  draggable={false}
                />
                <div className="p-4 text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{item.name}</p>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.result}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">"{item.quote}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-3 pointer-events-auto">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === activeIdx ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const OnboardingChallenge = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const slide = slides[current];
  const selected = answers[current] || [];
  const isChoice = slide.type === "single" || slide.type === "multi";
  const canContinue = !isChoice || selected.length > 0;

  const goTo = useCallback(
    (next: number, dir: "next" | "prev") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrent(next);
        setAnimating(false);
      }, 250);
    },
    [animating]
  );

  const handleNext = () => {
    if (current < slides.length - 1) goTo(current + 1, "next");
  };
  const handleBack = () => {
    if (current > 0) goTo(current - 1, "prev");
  };

  const toggleOption = (label: string) => {
    setAnswers((prev) => {
      const cur = prev[current] || [];
      if (slide.type === "single") return { ...prev, [current]: [label] };
      return {
        ...prev,
        [current]: cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label],
      };
    });
  };

  // Get localized options and emojis
  // @ts-ignore
  const slideOptions = slide.optionsKey ? t(slide.optionsKey) as unknown as string[] : [];
  // @ts-ignore
  const slideEmojis = slide.emojisKey ? t(slide.emojisKey) as unknown as string[] : [];

  const determinationLevelIndex = slideOptions.indexOf(answers[5]?.[0] || "");
  let finalMessage = t('onboarding.finalMsgStart');
  let finalTitle = t('onboarding.finalStart');

  if (determinationLevelIndex === 2) { // Unstoppable
    finalMessage = t('onboarding.finalMsgUnstoppable');
    finalTitle = t('onboarding.finalUnstoppable');
  } else if (determinationLevelIndex === 1) { // Motivated
    finalMessage = t('onboarding.finalMsgMotivated');
    finalTitle = t('onboarding.finalMotivated');
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-[101] bg-background" style={{ height: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }} />
      <div className="px-6 pb-2 flex items-center gap-3" style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 1.5rem) + 1.5rem)' }}>
        {current > 0 && (
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i <= current ? "hsl(var(--primary))" : "hsl(var(--secondary))",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <div
          className="w-full max-w-sm flex flex-col items-center text-center transition-all duration-250"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? direction === "next"
                ? "translateX(-30px)"
                : "translateX(30px)"
              : "translateX(0)",
          }}
        >
          {slide.type !== "final" && slide.type !== "testimonials" && (
            <>
              <span className="text-5xl mb-5">{slide.emoji}</span>
              <h1 className="text-2xl font-display font-bold leading-tight whitespace-pre-line mb-2">
                {t(slide.titleKey)}
              </h1>
              {slide.subtitleKey && (
                <p className="text-sm text-muted-foreground mb-5">{t(slide.subtitleKey)}</p>
              )}
            </>
          )}

          {slide.type === "testimonials" && (
            <TestimonialsSlide title={t(slide.titleKey)} subtitle={slide.subtitleKey ? t(slide.subtitleKey) : undefined} />
          )}

          {isChoice && slideOptions.length > 0 && (
            <div className="w-full space-y-3 mt-4">
              {slideOptions.map((opt, idx) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-secondary/50 hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xl">{slideEmojis[idx]}</span>
                    <span className="font-medium text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {slide.type === "info" && slide.bodyKey && (
            <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line mt-4">
              {t(slide.bodyKey)}
            </p>
          )}

          {slide.type === "final" && (
            <>
              <span className="text-6xl mb-5">🏆</span>
              <h1 className="text-3xl font-display font-bold leading-tight mb-3">{finalTitle}</h1>
              <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line mb-8">
                {finalMessage}
              </p>
              <Button
                onClick={() => navigate("/create")}
                className="h-14 px-10 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
              >
                {t('onboarding.createMyChallenge')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>

      {slide.type !== "final" && (
        <div className="px-8 pb-8">
          <Button
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full h-14 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl disabled:opacity-40"
          >
            {t('common.continue')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingChallenge;
