import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const isSocial = !!searchParams.get("social_challenge_id");

  useEffect(() => {
    const verify = async () => {
      const sessionId = searchParams.get("session_id");
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground">Vérification du paiement...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-center">Paiement confirmé !</h1>
          <p className="text-muted-foreground text-center text-sm">
            {isSocial
              ? "Ta mise est enregistrée ! Le défi sera activé quand tous les participants auront payé. 🤝"
              : "Ton défi est maintenant actif. C'est parti ! 💪"}
          </p>
          <Button
            onClick={() => navigate(isSocial ? "/friends" : "/dashboard")}
            className="h-14 px-8 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isSocial ? "Voir mes défis" : "Voir mon défi"}
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
