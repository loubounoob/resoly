import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Flame, Coins, Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useCreateChallenge, useActiveChallenge } from "@/hooks/useChallenge";
import { calculateCoins } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDay } from "date-fns";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function computeFirstWeekGoal(sessionsPerWeek: number): { firstWeekGoal: number; daysLeft: number; dayName: string; needsAdjustment: boolean } {
  const today = new Date();
  const dayOfWeek = getDay(today); // 0=Sun, 1=Mon...
  // Days left in the week (Mon=1 to Sun=0): Mon→7, Tue→6, Wed→5, Thu→4, Fri→3, Sat→2, Sun→1
  const daysLeft = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const firstWeekGoal = Math.max(1, Math.floor(sessionsPerWeek * daysLeft / 7));
  const needsAdjustment = dayOfWeek !== 1; // not Monday
  return { firstWeekGoal, daysLeft, dayName: DAY_NAMES[dayOfWeek], needsAdjustment };
}

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { data: activeChallenge, isLoading: loadingActive } = useActiveChallenge();
  const [betAmount, setBetAmount] = useState(100);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showFirstWeekDialog, setShowFirstWeekDialog] = useState(false);
  const [shopProducts, setShopProducts] = useState<ShopifyProduct[]>([]);

  const createChallenge = useCreateChallenge();

  useEffect(() => {
    if (!loadingActive && activeChallenge) {
      navigate("/dashboard", { replace: true });
    }
  }, [loadingActive, activeChallenge, navigate]);

  useEffect(() => {
    fetchShopifyProducts(20)
      .then(setShopProducts)
      .catch(console.error);
  }, []);

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalSessions = sessionsPerWeek * duration * 4;
  const coinsPreview = calculateCoins(betAmount, duration, sessionsPerWeek);
  const { firstWeekGoal, dayName, needsAdjustment } = computeFirstWeekGoal(sessionsPerWeek);

  const handleSubmit = () => {
    if (needsAdjustment) {
      setShowFirstWeekDialog(true);
    } else {
      proceedWithChallenge(null);
    }
  };

  const proceedWithChallenge = async (firstWeekSessions: number | null) => {
    setShowFirstWeekDialog(false);
    setIsProcessing(true);
    try {
      const challenge = await createChallenge.mutateAsync({
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_per_month: betAmount,
        odds: 1,
      });

      // Update first_week_sessions if needed
      if (firstWeekSessions != null) {
        await supabase
          .from("challenges")
          .update({ first_week_sessions: firstWeekSessions } as any)
          .eq("id", challenge.id);
      }

      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          challengeId: challenge.id,
          amount: betAmount,
          description: `Mise Resoly — ${betAmount}€ — ${sessionsPerWeek}x/sem pendant ${duration} mois`,
          promoCode: promoCode.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("Code promo appliqué ! Défi lancé 🎉");
        navigate("/dashboard");
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du paiement");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Créer un défi</h1>
      </div>

      <div className="flex-1 space-y-8">
        {/* Bet Amount */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Ta mise</label>
          <div className="text-center mb-4">
            <span className="text-5xl font-display font-bold text-gradient-primary">{betAmount}€</span>
          </div>
          <Slider
            value={[betAmount]}
            onValueChange={(v) => setBetAmount(v[0])}
            min={10}
            max={1000}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>10€</span>
            <span>1 000€</span>
          </div>
        </section>

        {/* Sessions per week */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Séances par semaine</label>
          <div className="grid grid-cols-5 gap-2">
            {SESSIONS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSessionsPerWeek(s)}
                className={`h-12 rounded-lg font-display font-bold text-lg transition-all ${
                  sessionsPerWeek === s
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Duration */}
        <section>
          <label className="text-sm text-muted-foreground mb-3 block">Durée d'engagement</label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`h-12 rounded-lg font-display font-bold transition-all ${
                  duration === d
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {d}<span className="text-xs font-normal ml-0.5">mois</span>
              </button>
            ))}
          </div>
        </section>

        {/* Summary Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5 space-y-4 shadow-card">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block">Séances totales</span>
              <span className="font-bold text-lg">{totalSessions}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Durée</span>
              <span className="font-bold text-lg">{duration} mois</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Pièces à gagner</span>
            </div>
            <span className="font-display font-bold text-lg text-gradient-gold">
              <span className="inline-flex items-center gap-1"><CoinIcon size={18} /> {coinsPreview}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu gagnes {coinsPreview} pièces si tu réussis le défi
          </p>
        </div>
      </div>

      {/* Produits accessibles */}
      {shopProducts.length > 0 && (
        <section className="mt-2">
          <label className="text-sm text-muted-foreground mb-3 block">Ce que tu pourras acheter</label>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {shopProducts.map((product) => {
              const price = product.node.priceRange.minVariantPrice;
              const coinsPrice = Math.ceil(parseFloat(price.amount) * 50);
              const isAccessible = coinsPreview >= coinsPrice;
              return (
                <div
                  key={product.node.id}
                  className={`flex-shrink-0 w-[120px] rounded-xl border border-border bg-gradient-card overflow-hidden transition-opacity ${
                    isAccessible ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div className="w-full aspect-square bg-secondary">
                    <img
                      src={product.node.images.edges[0]?.node?.url || "/placeholder.svg"}
                      alt={product.node.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium truncate">{product.node.title}</p>
                    <div className="flex items-center gap-1 text-xs font-bold text-primary">
                      <CoinIcon size={12} /> {coinsPrice}
                    </div>
                    {isAccessible && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                        Accessible
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Promo Code */}
      <div className="mt-4">
        <label className="text-sm text-muted-foreground mb-2 block">Code promo (optionnel)</label>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Entrer un code promo"
          className="w-full h-12 rounded-xl border border-border bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* CTA */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || createChallenge.isPending}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow rounded-xl mt-6"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Flame className="w-5 h-5 mr-2" />
        )}
        Lancer le défi
      </Button>

      {/* First week adjustment dialog */}
      <Dialog open={showFirstWeekDialog} onOpenChange={setShowFirstWeekDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Première semaine ajustée</DialogTitle>
            <DialogDescription>
              Tu commences un <strong>{dayName}</strong>. Ton objectif pour cette première semaine sera de{" "}
              <strong>{firstWeekGoal} séance{firstWeekGoal > 1 ? "s" : ""}</strong> (au lieu de {sessionsPerWeek}).
              Les semaines suivantes : {sessionsPerWeek} séances.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFirstWeekDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => proceedWithChallenge(firstWeekGoal)}
              className="bg-gradient-primary text-primary-foreground"
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateChallenge;
