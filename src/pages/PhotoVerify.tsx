import { Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useActiveChallenge, useCheckIns, useCreateCheckIn } from "@/hooks/useChallenge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, isToday } from "date-fns";

const PhotoVerify = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const { data: challenge } = useActiveChallenge();
  const { data: checkIns } = useCheckIns(challenge?.id);
  const createCheckIn = useCreateCheckIn();
  const navigate = useNavigate();

  const hasCheckedInToday = checkIns?.some(
    (ci) => ci.verified && isToday(new Date(ci.checked_in_at))
  ) ?? false;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!challenge) {
      toast.error("Aucun défi actif");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus("loading");
    setReason("");

    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("verify-photo", {
        body: { imageBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const verified = data.verified === true;
      setReason(data.reason || "");

      await createCheckIn.mutateAsync({
        challenge_id: challenge.id,
        verified,
      });

      setStatus(verified ? "success" : "error");
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("error");
      setReason("Erreur lors de la vérification");
      toast.error("Erreur lors de la vérification de la photo");
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-2">Check-in salle</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Prends une photo pour prouver ta présence à la salle
      </p>

      {/* Camera Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {hasCheckedInToday ? (
          <div className="w-full max-w-xs text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-lg font-display font-bold">Déjà validé aujourd'hui !</h2>
            <p className="text-sm text-muted-foreground">Reviens demain pour ton prochain check-in 💪</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full h-12 rounded-xl">
              Retour au dashboard
            </Button>
          </div>
        ) : !preview ? (
          <label className="w-full aspect-square max-w-xs rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 transition-colors">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Prendre une photo</p>
              <p className="text-xs text-muted-foreground mt-1">L'IA vérifiera ta présence</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="hidden"
            />
          </label>
        ) : (
          <div className="w-full max-w-xs space-y-6">
            <div className="relative rounded-2xl overflow-hidden aspect-square shadow-card">
              <img src={preview} alt="Vérification" className="w-full h-full object-cover" />
              {status === "loading" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Analyse IA en cours...</p>
                </div>
              )}
              {status === "success" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                  <p className="text-lg font-display font-bold text-primary">Séance validée !</p>
                  {reason && <p className="text-xs text-muted-foreground text-center px-4">{reason}</p>}
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <XCircle className="w-16 h-16 text-destructive" />
                  <p className="text-lg font-display font-bold text-destructive">Non reconnue</p>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {reason || "Réessaie avec une photo de la salle"}
                  </p>
                </div>
              )}
            </div>

            {(status === "success" || status === "error") && (
              <Button
                onClick={() => { setPreview(null); setStatus("idle"); setReason(""); }}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                {status === "error" ? "Réessayer" : "Nouvelle photo"}
              </Button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PhotoVerify;
