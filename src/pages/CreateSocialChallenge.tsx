import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Loader2, Coins, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import CoinIcon from "@/components/CoinIcon";
import { useCreateSocialChallenge } from "@/hooks/useSocialChallenges";
import { useFriendsList } from "@/hooks/useFriends";
import { useGroups } from "@/hooks/useGroups";
import { calculateCoins } from "@/lib/coins";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ChallengeType = "duel" | "boost" | "group";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];

const TYPE_CARDS: { type: ChallengeType; emoji: string; title: string; desc: string }[] = [
  { type: "duel", emoji: "🥊", title: "Duel", desc: "Chacun crée son propre défi, validation indépendante" },
  { type: "boost", emoji: "🤝", title: "Défi Boost", desc: "Tu configures et finances un défi pour un ami" },
  { type: "group", emoji: "👥", title: "Groupe", desc: "Paramètres communs, chacun rejoint avec sa mise" },
];

const CreateSocialChallenge = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"type" | "params" | "target" | "confirm">("type");
  const [betAmount, setBetAmount] = useState(100);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [shopProducts, setShopProducts] = useState<ShopifyProduct[]>([]);

  const createSocial = useCreateSocialChallenge();
  const { data: friends } = useFriendsList();
  const { data: groups } = useGroups();

  useEffect(() => {
    fetchShopifyProducts(20).then(setShopProducts).catch(console.error);
  }, []);

  const coinsPreview = calculateCoins(betAmount, duration, sessionsPerWeek);
  const totalSessions = sessionsPerWeek * duration * 4;

  const handleSelectType = (type: ChallengeType) => {
    setChallengeType(type);
    setStep("params");
  };

  const handleParamsNext = () => {
    if (!challengeType) return;
    if (challengeType === "group" && groups && groups.length === 0) {
      toast.info("Crée d'abord un groupe !");
      navigate("/friends/create-group");
      return;
    }
    setStep("target");
  };

  const handleConfirm = async () => {
    if (!challengeType) return;
    setIsProcessing(true);
    try {
      const result = await createSocial.mutateAsync({
        type: challengeType,
        target_user_id: selectedFriend ?? undefined,
        group_id: selectedGroup ?? undefined,
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_amount: betAmount,
      });

      if (selectedFriend) {
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: selectedFriend,
            type: "social_challenge",
            title: "Nouveau défi reçu ! 🥊",
            body: `Tu as reçu un défi ${challengeType} de ${betAmount}€ — ${sessionsPerWeek}x/sem pendant ${duration} mois`,
            data: { socialChallengeId: result.challenge.id },
          },
        });
      }

      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          socialChallengeId: result.challenge.id,
          memberId: result.member.id,
          amount: betAmount,
          description: `Mise Resoly Social — ${betAmount}€ — ${challengeType} ${sessionsPerWeek}x/sem pendant ${duration} mois`,
          promoCode: promoCode.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("Code promo appliqué ! Défi lancé 🎉");
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

  const getInitials = (p: any) => (p?.display_name || p?.first_name || "?").charAt(0).toUpperCase();

  const goBack = () => {
    if (step === "type") navigate(-1);
    else if (step === "params") setStep("type");
    else if (step === "target") setStep("params");
    else setStep("target");
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Défi social</h1>
      </div>

      {step === "type" && (
        <div className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground mb-2">Choisis le type de défi</p>
          {TYPE_CARDS.map((card) => (
            <button
              key={card.type}
              onClick={() => handleSelectType(card.type)}
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                challengeType === card.type
                  ? "border-primary bg-primary/10"
                  : "border-border bg-gradient-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{card.emoji}</span>
                <span className="font-display font-bold text-lg">{card.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </button>
          ))}
        </div>
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
              Tu gagnes {coinsPreview} pièces si tu réussis le défi. Ta mise de {betAmount}€ est remboursée en cas de succès, perdue en cas d'échec.
            </p>
          </div>

          {/* Shopify products carousel */}
          {shopProducts.length > 0 && (
            <section>
              <label className="text-sm text-muted-foreground mb-3 block">Ce que tu pourras acheter</label>
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
          {challengeType !== "group" ? (
            <>
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
                    <p className="text-sm text-muted-foreground mt-1">Ajoute des amis pour lancer un défi social</p>
                  </div>
                  <Button onClick={() => navigate("/friends")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-glow">
                    <UserPlus className="w-4 h-4 mr-2" /> Ajouter des amis
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f: any) => (
                    <button
                      key={f.user_id}
                      onClick={() => { setSelectedFriend(f.user_id); setStep("confirm"); }}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        selectedFriend === f.user_id ? "border-primary bg-primary/10" : "border-border bg-gradient-card"
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={f.avatar_url} />
                        <AvatarFallback className="bg-secondary text-xs">{getInitials(f)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{f.display_name || f.first_name || "Ami"}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">Sélectionne un groupe</p>
              <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/friends/create-group")}>
                + Créer un groupe
              </Button>
              {!groups || groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun groupe</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g: any) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGroup(g.id); setStep("confirm"); }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedGroup === g.id ? "border-primary bg-primary/10" : "border-border bg-gradient-card"
                      }`}
                    >
                      <span className="font-medium">{g.name}</span>
                      {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="flex-1 space-y-6">
          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
            <h3 className="font-display font-bold text-lg">Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">Type</span><span className="font-bold">{challengeType === "duel" ? "🥊 Duel" : challengeType === "boost" ? "🤝 Boost" : "👥 Groupe"}</span></div>
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
              ✅ Remboursé si tu réussis · ❌ Perdu si tu échoues · 🪙 +{coinsPreview} pièces en bonus
            </p>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isProcessing || createSocial.isPending}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flame className="w-5 h-5 mr-2" />}
            Payer {betAmount}€ et lancer le défi
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreateSocialChallenge;
