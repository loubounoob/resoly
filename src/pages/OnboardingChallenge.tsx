import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flame, Target, TrendingUp, Zap, Star, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import testimonial1 from "@/assets/testimonial-1.png";
import testimonial2 from "@/assets/testimonial-2.png";
import testimonial3 from "@/assets/testimonial-3.png";
import testimonial4 from "@/assets/testimonial-4.png";
import testimonial5 from "@/assets/testimonial-5.png";
import testimonial6 from "@/assets/testimonial-6.png";

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
  title: string;
  subtitle?: string;
  options?: { label: string; emoji: string }[];
  body?: string;
}

const slides: Slide[] = [
  {
    type: "single",
    emoji: "🎯",
    title: "Quel est ton objectif ?",
    options: [
      { label: "Perdre du poids", emoji: "🔥" },
      { label: "Prendre du muscle", emoji: "💪" },
      { label: "Être plus régulier", emoji: "📅" },
      { label: "Me sentir mieux", emoji: "✨" },
    ],
  },
  {
    type: "multi",
    emoji: "🚧",
    title: "Qu'est-ce qui t'a freiné\njusqu'ici ?",
    subtitle: "Plusieurs réponses possibles",
    options: [
      { label: "Manque de motivation", emoji: "😴" },
      { label: "Pas de régularité", emoji: "📉" },
      { label: "Personne pour me pousser", emoji: "👤" },
      { label: "Trop de flemme", emoji: "🛋️" },
    ],
  },
  {
    type: "info",
    emoji: "💡",
    title: "Le seul secret,\nc'est la régularité.",
    body: "90% des gens abandonnent avant 3 mois.\nPas toi.",
  },
  {
    type: "info",
    emoji: "💰",
    title: "Mise sur toi-même.",
    body: "Tu mets de l'argent en jeu.\nSi tu tiens, tu récupères tout\n+ des récompenses.\n\nCe système provoque 7x plus de régularité.",
  },
  {
    type: "testimonials",
    title: "Ils ont relevé le défi.",
    subtitle: "+2 400 utilisateurs transformés",
  },
  {
    type: "single",
    emoji: "⚡",
    title: "À quel point\nes-tu déterminé ?",
    options: [
      { label: "Je vais essayer", emoji: "🤔" },
      { label: "Je suis motivé", emoji: "💪" },
      { label: "Rien ne m'arrêtera", emoji: "🔥" },
    ],
  },
  {
    type: "final",
    emoji: "🚀",
    title: "",
    body: "",
  },
];

const TestimonialsSlide = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const t = TESTIMONIALS[activeIdx];

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
        <Star className="w-5 h-5 text-accent fill-accent" />
      </div>
      <h1 className="text-2xl font-display font-bold leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      {/* Stats row */}
      <div className="flex gap-4 text-center">
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">94%</p>
          <p className="text-[10px] text-muted-foreground">de réussite</p>
        </div>
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">-8 kg</p>
          <p className="text-[10px] text-muted-foreground">en moyenne</p>
        </div>
        <div className="bg-secondary/60 rounded-xl px-4 py-2">
          <p className="text-lg font-bold text-primary">2 400+</p>
          <p className="text-[10px] text-muted-foreground">transformés</p>
        </div>
      </div>

      {/* Card carousel */}
      <div className="w-full relative">
        <div className="rounded-2xl border border-border bg-secondary/30 overflow-hidden">
          <img
            src={t.image}
            alt={t.name}
            className="w-full h-48 object-cover object-top"
          />
          <div className="p-4 text-left space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{t.name}</p>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t.result}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">"{t.quote}"</p>
          </div>
        </div>
        {/* Nav dots */}
        <div className="flex justify-center gap-1.5 mt-3">
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

  // Final slide personalised message
  const determinationLevel = answers[5]?.[0];
  const finalMessage =
    determinationLevel === "Rien ne m'arrêtera"
      ? "On aime cette énergie.\nCrée ton défi et prouve-le."
      : determinationLevel === "Je suis motivé"
      ? "Parfait, t'as tout ce qu'il faut.\nPassons à l'action."
      : "Chaque grand changement\ncommence par un premier pas.";

  const finalTitle =
    determinationLevel === "Rien ne m'arrêtera"
      ? "Inarrêtable. 🔥"
      : determinationLevel === "Je suis motivé"
      ? "Parfait. 💪"
      : "C'est parti. 🚀";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-5 pb-2 flex items-center gap-3">
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

      {/* Slide content */}
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
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-sm text-muted-foreground mb-5">{slide.subtitle}</p>
              )}
            </>
          )}

          {/* Testimonials slide */}
          {slide.type === "testimonials" && (
            <TestimonialsSlide title={slide.title} subtitle={slide.subtitle} />
          )}

          {/* Choice slides */}
          {isChoice && slide.options && (
            <div className="w-full space-y-3 mt-4">
              {slide.options.map((opt) => {
                const isSelected = selected.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => toggleOption(opt.label)}
                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-secondary/50 hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="font-medium text-sm">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Info slides */}
          {slide.type === "info" && (
            <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line mt-4">
              {slide.body}
            </p>
          )}

          {/* Final slide */}
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
                Créer mon défi
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bottom button */}
      {slide.type !== "final" && (
        <div className="px-8 pb-8">
          <Button
            onClick={handleNext}
            disabled={!canContinue}
            className="w-full h-14 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl disabled:opacity-40"
          >
            Continuer
          </Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingChallenge;
