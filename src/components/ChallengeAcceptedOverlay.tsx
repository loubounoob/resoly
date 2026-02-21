import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface ChallengeAcceptedOverlayProps {
  onClose?: () => void;
}

const ChallengeAcceptedOverlay = ({ onClose }: ChallengeAcceptedOverlayProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    // Fire confetti
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#a3e635", "#facc15", "#f97316", "#22d3ee"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Auto-dismiss after 4s
    const timer = setTimeout(() => handleGo(), 4000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGo = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
      navigate("/dashboard");
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        visible ? "bg-black/80 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleGo}
    >
      <div
        className={`flex flex-col items-center gap-6 px-8 text-center transition-all duration-500 ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"
        }`}
      >
        {/* Animated flame icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Flame className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient-primary mb-2">
            C'est parti !
          </h1>
          <p className="text-lg text-foreground/90 font-medium">
            Le défi est lancé 🔥
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground text-sm max-w-[250px]">
          Montre ce que tu vaux. Chaque séance compte.
        </p>

        {/* Go button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleGo();
          }}
          className="h-12 px-8 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
        >
          Go
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ChallengeAcceptedOverlay;
