import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [visible, setVisible] = useState(false);

  const isSocial = !!searchParams.get("social_challenge_id");
  const isCoins = searchParams.get("type") === "coins";
  const isPersonalChallenge = !isCoins && !isSocial;

  useEffect(() => {
    const verify = async () => {
      const sessionId = searchParams.get("session_id");

      if (isCoins) {
        if (!sessionId) { setStatus("error"); return; }
        try {
          const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
            body: { sessionId },
          });
          if (error) throw error;
          if (data?.success) setStatus("success");
          else setStatus("error");
        } catch { setStatus("error"); }
        return;
      }

      const challengeId = searchParams.get("challenge_id");
      const socialChallengeId = searchParams.get("social_challenge_id");
      const memberId = searchParams.get("member_id");

      if (!sessionId || (!challengeId && !socialChallengeId)) {
        setStatus("error");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId, challengeId, socialChallengeId, memberId },
        });

        if (error) throw error;
        if (data?.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  // Fire confetti for personal challenge success
  useEffect(() => {
    if (status !== "success" || !isPersonalChallenge) return;

    requestAnimationFrame(() => setVisible(true));

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
  }, [status, isPersonalChallenge]);

  // For non-personal success, also trigger visible
  useEffect(() => {
    if (status === "success" && !isPersonalChallenge) {
      setVisible(true);
    }
  }, [status, isPersonalChallenge]);

  const handleGo = () => {
    navigate(isCoins ? "/dashboard" : isSocial ? "/friends" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground">Vérification du paiement...</p>
        </>
      )}

      {status === "success" && isPersonalChallenge && (
        <div
          className={`flex flex-col items-center gap-6 px-8 text-center transition-all duration-500 ${
            visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-8"
          }`}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse">
              <Flame className="w-12 h-12 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping" />
          </div>

          <div>
            <h1 className="text-3xl font-display font-bold text-gradient-primary mb-2">
              C'est parti !
            </h1>
            <p className="text-lg text-foreground/90 font-medium">
              Ton défi est maintenant actif 🔥
            </p>
          </div>

          <p className="text-muted-foreground text-sm max-w-[250px]">
            Montre ce que tu vaux. Chaque séance compte.
          </p>

          <Button
            onClick={handleGo}
            className="h-12 px-8 text-base font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            Go
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {status === "success" && !isPersonalChallenge && (
        <>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">
            {isCoins ? "Pièces ajoutées !" : "Paiement confirmé !"}
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            {isCoins
              ? "Tes pièces ont été créditées sur ton compte ! 🪙"
              : "Ta mise est enregistrée ! Le défi sera activé quand tous les participants auront payé. 🤝"}
          </p>
          <Button
            onClick={handleGo}
            className="h-14 px-8 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isCoins ? "Retour" : "Voir mes défis"}
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">Erreur de paiement</h1>
          <p className="text-muted-foreground text-center text-sm">
            Le paiement n'a pas pu être vérifié. Réessaie ou contacte le support.
          </p>
          <Button
            onClick={() => navigate(isSocial ? "/friends" : "/create")}
            variant="outline"
            className="rounded-xl"
          >
            Retour
          </Button>
        </>
      )}
    </div>
  );
};

export default PaymentSuccess;
