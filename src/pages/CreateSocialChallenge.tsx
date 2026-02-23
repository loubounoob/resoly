import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Loader2, Coins, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import CoinIcon from "@/components/CoinIcon";
import MotivationSteps from "@/components/MotivationSteps";
import { useCreateSocialChallenge, useFriendsWithActiveChallenge } from "@/hooks/useSocialChallenges";
import { useFriendsList } from "@/hooks/useFriends";
import { calculateCoins } from "@/lib/coins";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];

const CreateSocialChallenge = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"motivation1" | "motivation2" | "motivation3" | "motivation4" | "motivation5" | "params" | "target" | "confirm">("motivation1");
  const [betAmount, setBetAmount] = useState(100);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [shopProducts, setShopProducts] = useState<ShopifyProduct[]>([]);

  const createSocial = useCreateSocialChallenge();
  const { data: friends } = useFriendsList();
  const friendIds = (friends ?? []).map((f: any) => f.user_id);
  const { data: busyFriendIds } = useFriendsWithActiveChallenge(friendIds);

  useEffect(() => {
    fetchShopifyProducts(20).then(setShopProducts).catch(console.error);
  }, []);

  const coinsPreview = calculateCoins(betAmount, duration, sessionsPerWeek);
  const totalSessions = sessionsPerWeek * duration * 4;

  const handleParamsNext = () => {
    setStep("target");
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const result = await createSocial.mutateAsync({
        type: "boost",
        target_user_id: selectedFriend ?? undefined,
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_amount: betAmount,
      });

      if (selectedFriend) {
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: selectedFriend,
            type: "social_challenge",
            title: "On t'offre un défi ! 🎁",
            body: `Tu as reçu un défi de ${betAmount}€ — ${sessionsPerWeek}x/sem pendant ${duration} mois`,
            data: { socialChallengeId: result.challenge.id },
          },
        });
      }

      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          socialChallengeId: result.challenge.id,
          memberId: result.member.id,
          amount: betAmount,
          description: `Mise Resoly — Offrir un défi ${betAmount}€ — ${sessionsPerWeek}x/sem pendant ${duration} mois`,
          promoCode: promoCode.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("Code promo appliqué ! Défi offert 🎉");
        navigate("/friends");
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast.error("Erreur lors de la création");
      setIsProcessing(false);
    }
  };

  const getInitials = (p: any) => (p?.username || p?.display_name || "?").charAt(0).toUpperCase();

  const goBack = () => {
    if (step === "motivation1") navigate("/friends");
    else if (step === "motivation2") setStep("motivation1");
    else if (step === "motivation3") setStep("motivation2");
    else if (step === "motivation4") setStep("motivation3");
    else if (step === "motivation5") setStep("motivation4");
    else if (step === "params") setStep("motivation5");
    else if (step === "target") setStep("params");
    else setStep("target");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Offrir un défi</h1>
      </div>

      {(step === "motivation1" || step === "motivation2" || step === "motivation3" || step === "motivation4" || step === "motivation5") && (
        <MotivationSteps
          step={step}
          onSelect={(s, _v) => {
            if (s === "motivation1") setStep("motivation2");
            else if (s === "motivation2") setStep("motivation3");
            else if (s === "motivation3") setStep("motivation4");
            else if (s === "motivation4") setStep("motivation5");
          }}
          onFinish={() => setStep("params")}
        />
      )}

      {step === "params" && (
        <div className="flex-1 space-y-8">
          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Ta mise</label>
            <div className="text-center mb-4">
              <span className="text-5xl font-display font-bold text-gradient-primary">{betAmount}€</span>
            </div>
            <Slider value={[betAmount]} onValueChange={(v) => setBetAmount(v[0])} min={10} max={1000} step={10} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>10€</span><span>1 000€</span></div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Séances par semaine</label>
            <div className="grid grid-cols-5 gap-2">
              {SESSIONS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSessionsPerWeek(s)} className={`h-12 rounded-lg font-display font-bold text-lg transition-all ${sessionsPerWeek === s ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{s}</button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Durée d'engagement</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDuration(d)} className={`h-12 rounded-lg font-display font-bold transition-all ${duration === d ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{d}<span className="text-xs font-normal ml-0.5">mois</span></button>
              ))}
            </div>
          </section>

          {/* Recap card */}
          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">Séances totales</span><span className="font-display font-bold text-lg">{totalSessions}</span></div>
              <div><span className="text-muted-foreground block">Durée</span><span className="font-display font-bold text-lg">{duration} mois</span></div>
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
              Ton ami gagne {coinsPreview} pièces s'il réussit le défi. Ta mise de {betAmount}€ lui est versée en cas de succès.
            </p>
          </div>

          {/* Shopify products carousel */}
          {shopProducts.length > 0 && (
            <section>
              <label className="text-sm text-muted-foreground mb-3 block">Ce qu'il pourra acheter</label>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {shopProducts.map((product) => {
                  const price = product.node.priceRange.minVariantPrice;
                  const coinsPrice = Math.ceil(parseFloat(price.amount) * 50);
                  const isAccessible = coinsPreview >= coinsPrice;
                  return (
                    <div key={product.node.id} className={`flex-shrink-0 w-[120px] rounded-xl border border-border bg-gradient-card overflow-hidden transition-opacity ${isAccessible ? "opacity-100" : "opacity-50"}`}>
                      <div className="w-full aspect-square bg-secondary">
                        <img src={product.node.images.edges[0]?.node?.url || "/placeholder.svg"} alt={product.node.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-medium truncate">{product.node.title}</p>
                        <div className="flex items-center gap-1 text-xs font-bold text-primary"><CoinIcon size={12} /> {coinsPrice}</div>
                        {isAccessible && <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">Accessible</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Promo Code */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Code promo (optionnel)</label>
            <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Entrer un code promo" className="w-full h-12 rounded-xl border border-border bg-secondary px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <Button onClick={handleParamsNext} className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl">
            Suivant
          </Button>
        </div>
      )}

      {step === "target" && (
        <div className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground mb-2">Sélectionne un ami</p>
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-4">
            <p className="text-xs text-accent flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0" />
              Un seul défi actif à la fois — reste concentré sur un objectif clair !
            </p>
          </div>
          {!friends || friends.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Aucun ami ajouté</p>
                <p className="text-sm text-muted-foreground mt-1">Ajoute des amis pour offrir un défi</p>
              </div>
              <Button onClick={() => navigate("/friends")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-glow">
                <UserPlus className="w-4 h-4 mr-2" /> Ajouter des amis
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f: any) => {
                const isBusy = busyFriendIds?.has(f.user_id);
                return (
                  <button
                    key={f.user_id}
                    onClick={() => { if (!isBusy) { setSelectedFriend(f.user_id); setStep("confirm"); } }}
                    disabled={isBusy}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      isBusy
                        ? "border-border bg-secondary/50 opacity-50 cursor-not-allowed"
                        : selectedFriend === f.user_id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-gradient-card"
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={f.avatar_url} />
                      <AvatarFallback className="bg-secondary text-xs">{getInitials(f)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <span className="font-medium">{f.username || "Ami"}</span>
                      {isBusy && (
                        <p className="text-[11px] text-destructive">⛔ A déjà un défi actif</p>
                      )}
                    </div>
                    {isBusy && (
                      <Badge variant="secondary" className="text-[10px]">Indisponible</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="flex-1 space-y-6">
          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
            <h3 className="font-display font-bold text-lg">Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">Type</span><span className="font-bold">🎁 Offrir un défi</span></div>
              <div><span className="text-muted-foreground block">Mise</span><span className="font-bold">{betAmount}€</span></div>
              <div><span className="text-muted-foreground block">Fréquence</span><span className="font-bold">{sessionsPerWeek}x/sem</span></div>
              <div><span className="text-muted-foreground block">Durée</span><span className="font-bold">{duration} mois</span></div>
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
              ✅ Ton ami est remboursé s'il réussit · ❌ Ta mise est perdue s'il échoue · 🪙 +{coinsPreview} pièces en bonus
            </p>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isProcessing || createSocial.isPending}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flame className="w-5 h-5 mr-2" />}
            Payer {betAmount}€ et offrir le défi
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreateSocialChallenge;
