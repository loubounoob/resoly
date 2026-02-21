import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp, Shield } from "lucide-react";
import heroGym from "@/assets/hero-gym.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Content */}
      <div className="flex flex-col flex-1 px-6 pt-10 pb-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-8 h-8 text-primary" />
          <span className="text-2xl font-display font-bold">Resoly</span>
        </div>

        {/* Hero Image */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <img src={heroGym} alt="Fitness transformation" className="w-full h-64 object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Hero Text */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Mise sur
            <br />
            <span className="text-gradient-primary">ta discipline.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Engage ton argent, tiens ton défi sportif, et récupère ta mise + des récompenses exclusives.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: TrendingUp, text: "Objectif ajusté intelligemment à ton rythme" },
            { icon: Shield, text: "Photo vérifiée par IA à chaque séance" },
            { icon: Flame, text: "Récompenses crescendo si tu gagnes" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-border/50">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-secondary-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3 mt-auto">
          <Button
            onClick={() => navigate("/auth")}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow animate-pulse-glow rounded-xl"
          >
            Lancer un défi 🔥
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="w-full h-12 font-medium border-border/50 text-foreground hover:bg-secondary rounded-xl"
          >
            J'ai déjà un compte
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
