import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Shield } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-col flex-1 px-6 pt-10 pb-10">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-8 h-8 text-primary" />
          <span className="text-2xl font-display font-bold">Resoly</span>
        </div>

        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {t('landing.heroTitle1')}
            <br />
            <span className="text-gradient-primary">{t('landing.heroTitleHighlight')}</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>
        </div>

        <div className="space-y-3 mb-8" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: TrendingUp, text: t('landing.feature1') },
            { icon: Shield, text: t('landing.feature2') },
            { icon: Flame, text: t('landing.feature3') },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-border/50">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-secondary-foreground">{text}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mt-auto">
          <Button
            onClick={() => navigate("/auth?mode=signup")}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow animate-pulse-glow rounded-xl"
          >
            {t('landing.cta')}
          </Button>
          <Button
            onClick={() => navigate("/auth?mode=login")}
            variant="outline"
            className="w-full h-12 font-medium border-border/50 text-foreground hover:bg-secondary rounded-xl"
          >
            {t('landing.login')}
          </Button>
          <button
            onClick={() => navigate("/privacy")}
            className="w-full text-xs text-muted-foreground hover:underline text-center pt-2"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
