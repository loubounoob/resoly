import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChallengeFailedOverlayProps {
  betLost: number;
  onClose?: () => void;
}

const ChallengeFailedOverlay = ({ betLost, onClose }: ChallengeFailedOverlayProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    // Falling particles animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const colors = ["#ef4444", "#6b7280", "#f97316", "#991b1b"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 2 + 1,
        size: Math.random() * 4 + 1,
        alpha: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height) {
          p.y = Math.random() * -100;
          p.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    // Auto-dismiss after 6s
    const timer = setTimeout(() => handleGo(), 6000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGo = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
      navigate("/onboarding-challenge");
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-400 ${
        visible ? "bg-black/90 backdrop-blur-md" : "bg-transparent"
      }`}
      onClick={handleGo}
    >
      {/* Falling particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div
        className={`relative z-10 flex flex-col items-center gap-6 px-8 text-center transition-all duration-700 ease-out ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"
        }`}
      >
        {/* Broken shield icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive/40 to-destructive/20 flex items-center justify-center border-2 border-destructive/30">
            <ShieldOff className="w-12 h-12 text-destructive" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-destructive/10 animate-ping" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-display font-bold text-destructive mb-2">
            Défi terminé...
          </h1>
          <p className="text-lg text-foreground/80 font-medium">
            Tu n'as pas atteint ton objectif 😔
          </p>
        </div>

        {/* Bet lost */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl px-6 py-3">
          <p className="text-sm text-muted-foreground">Mise perdue</p>
          <p className="text-2xl font-display font-bold text-destructive">{betLost}€</p>
        </div>

        {/* Encouraging message */}
        <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
          Chaque échec rapproche du succès. La régularité s'apprend — reviens plus fort ! 💪
        </p>

        {/* CTA button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleGo();
          }}
          className="h-12 px-8 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
        >
          Relever le défi
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ChallengeFailedOverlay;
