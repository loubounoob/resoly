import { Camera, CheckCircle2, XCircle, Loader2, PartyPopper } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import AvatarUpload from "@/components/AvatarUpload";
import { useActiveChallenge, useCheckIns, useCreateCheckIn } from "@/hooks/useChallenge";
import { useMyProfile } from "@/hooks/useFriends";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isToday } from "date-fns";
import confetti from "canvas-confetti";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useAuth } from "@/contexts/AuthContext";

type SessionPhase = "idle" | "loading" | "ai-result" | "congrats" | "avatar-prompt";

const PhotoVerify = () => {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [aiStatus, setAiStatus] = useState<"success" | "error" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const didValidateThisSession = useRef(false);
  const { user } = useAuth();

  const { data: challenge } = useActiveChallenge();
  const { data: checkIns } = useCheckIns(challenge?.id);
  const { data: myProfile } = useMyProfile();
  const createCheckIn = useCreateCheckIn();
  const navigate = useNavigate();

  const isFirstSession = checkIns ? checkIns.filter(ci => ci.verified).length === 0 : true;
  const hasNoAvatar = !myProfile?.avatar_url;
  const hasNoGymLocation = !myProfile?.gym_latitude || !myProfile?.gym_longitude;

  // Save current GPS as gym location on first verified check-in
  const saveGymLocation = async () => {
    if (!user || !hasNoGymLocation) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") return;
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      const { latitude, longitude } = position.coords;
      await supabase
        .from("profiles")
        .update({
          gym_latitude: latitude,
          gym_longitude: longitude,
          gym_name: "Ma salle",
        } as any)
        .eq("user_id", user.id);
      console.log("Gym location saved automatically:", latitude, longitude);
    } catch (err) {
      console.error("Could not save gym location:", err);
    }
  };

  // Only used on initial load — not during active session
  const hasCheckedInToday =
    !didValidateThisSession.current &&
    (checkIns?.some((ci) => ci.verified && isToday(new Date(ci.checked_in_at))) ?? false);

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
    setPhase("loading");
    setReason("");
    setAiStatus(null);

    try {
      const imageBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("verify-photo", {
        body: { imageBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const verified = data.verified === true;
      setReason(data.reason || "");

      const checkInResult = await createCheckIn.mutateAsync({
        challenge_id: challenge.id,
        verified,
      });

      if (verified) {
        didValidateThisSession.current = true;
        // 🎉 Confetti burst
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 300);

        // Upload photo to storage for stories
        try {
          const ext = file.name.split(".").pop() || "jpg";
          const filePath = `${user!.id}/${checkInResult.id}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("check-in-photos")
            .upload(filePath, file, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("check-in-photos")
              .getPublicUrl(filePath);
            if (urlData?.publicUrl) {
              await supabase
                .from("check_ins")
                .update({ photo_url: urlData.publicUrl })
                .eq("id", checkInResult.id);
            }
          }
        } catch (uploadErr) {
          console.error("Story photo upload failed:", uploadErr);
        }

        // Auto-save gym location on first ever verified check-in
        if (isFirstSession && hasNoGymLocation) {
          saveGymLocation();
        }
      }

      setAiStatus(verified ? "success" : "error");
      setPhase("ai-result");
    } catch (err) {
      console.error("Verification error:", err);
      setAiStatus("error");
      setReason("Erreur lors de la vérification");
      setPhase("ai-result");
      toast.error("Erreur lors de la vérification de la photo");
    }
  };

  const handleRetry = () => {
    setPreview(null);
    setPhase("idle");
    setReason("");
    setAiStatus(null);
  };

  const handleContinueAfterSuccess = () => {
    // If first session and no avatar, prompt for avatar
    if (isFirstSession && hasNoAvatar) {
      setPhase("avatar-prompt");
    } else {
      setPhase("congrats");
    }
  };

  // --- Already validated today (initial load only) ---
  if (hasCheckedInToday && phase === "idle") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
        <h1 className="text-2xl font-bold mb-2">Check-in salle</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Prends une photo pour prouver ta présence à la salle
        </p>
        <div className="flex-1 flex flex-col items-center justify-center">
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
        </div>
        <BottomNav />
      </div>
    );
  }

  // --- Avatar prompt after first session ---
  if (phase === "avatar-prompt") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs text-center space-y-6">
            <h2 className="text-2xl font-display font-bold">📸 Ajoute ta photo !</h2>
            <p className="text-muted-foreground text-sm">
              Tes amis pourront te reconnaître plus facilement. Prends un selfie rapide !
            </p>
            <AvatarUpload
              currentUrl={myProfile?.avatar_url}
              size="lg"
              showSkip
              onSkip={() => setPhase("congrats")}
              onUploaded={() => setPhase("congrats")}
            />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // --- Congrats screen ---
  if (phase === "congrats") {
    return (
      <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs text-center space-y-5">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <PartyPopper className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold">Bravo ! 🎉</h2>
            <p className="text-muted-foreground">
              Ta séance a été validée avec succès. Continue comme ça, tu es sur la bonne voie !
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
            >
              Retour au dashboard
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-2">Check-in salle</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Prends une photo pour prouver ta présence à la salle
      </p>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Camera */}
        {phase === "idle" && !preview && (
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
        )}

        {/* Loading / AI Result */}
        {preview && (phase === "loading" || phase === "ai-result") && (
          <div className="w-full max-w-xs space-y-6">
            <div className="relative rounded-2xl overflow-hidden aspect-square shadow-card">
              <img src={preview} alt="Vérification" className="w-full h-full object-cover" />
              {phase === "loading" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Analyse IA en cours...</p>
                </div>
              )}
              {phase === "ai-result" && aiStatus === "success" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                  <p className="text-lg font-display font-bold text-primary">Séance validée !</p>
                  {reason && <p className="text-xs text-muted-foreground text-center px-4">{reason}</p>}
                </div>
              )}
              {phase === "ai-result" && aiStatus === "error" && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-count-up">
                  <XCircle className="w-16 h-16 text-destructive" />
                  <p className="text-lg font-display font-bold text-destructive">Non reconnue</p>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {reason || "Réessaie avec une photo de la salle"}
                  </p>
                </div>
              )}
            </div>

            {phase === "ai-result" && aiStatus === "success" && (
              <Button
                onClick={handleContinueAfterSuccess}
                className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display font-bold"
              >
                Continuer
              </Button>
            )}
            {phase === "ai-result" && aiStatus === "error" && (
              <Button onClick={handleRetry} variant="outline" className="w-full h-12 rounded-xl">
                Réessayer
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
