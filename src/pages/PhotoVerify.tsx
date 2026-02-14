import { Camera, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const PhotoVerify = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus("loading");

    // Simulate AI verification
    setTimeout(() => {
      setStatus(Math.random() > 0.2 ? "success" : "error");
    }, 2500);
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-2">Check-in salle</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Prends une photo pour prouver ta présence à la salle
      </p>

      {/* Camera Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {!preview ? (
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
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <XCircle className="w-16 h-16 text-destructive" />
                  <p className="text-lg font-display font-bold text-destructive">Non reconnue</p>
                  <p className="text-xs text-muted-foreground">Réessaie avec une photo de la salle</p>
                </div>
              )}
            </div>

            {(status === "success" || status === "error") && (
              <Button
                onClick={() => { setPreview(null); setStatus("idle"); }}
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
