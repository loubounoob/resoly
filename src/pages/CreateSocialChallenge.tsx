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
import { useLocale } from "@/contexts/LocaleContext";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];

const CreateSocialChallenge = () => {
  const navigate = useNavigate();
  const { t, formatCurrency, currency } = useLocale();
  const [step, setStep] = useState<"motivation1" | "motivation2" | "motivation3" | "motivation4" | "motivation5" | "params" | "target" | "confirm">("motivation1");
  const [betAmount, setBetAmount] = useState(100);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
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

      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          socialChallengeId: result.challenge.id,
          memberId: result.member.id,
          amount: betAmount,
          currency: currency,
          description: t('createSocial.betDescription', { amount: formatCurrency(betAmount), sessions: sessionsPerWeek, duration }),
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch {
      toast.error(t('createSocial.createError'));
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
        <h1 className="text-2xl font-bold">{t('createSocial.title')}</h1>
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
            <label className="text-sm text-muted-foreground mb-3 block">{t('createSocial.yourBet')}</label>
            <div className="text-center mb-4">
              <span className="text-5xl font-display font-bold text-gradient-primary">{formatCurrency(betAmount)}</span>
            </div>
            <Slider value={[betAmount]} onValueChange={(v) => setBetAmount(v[0])} min={10} max={1000} step={10} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{formatCurrency(10)}</span><span>{formatCurrency(1000)}</span></div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">{t('createSocial.sessionsPerWeek')}</label>
            <div className="grid grid-cols-5 gap-2">
              {SESSIONS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSessionsPerWeek(s)} className={`h-12 rounded-lg font-display font-bold text-lg transition-all ${sessionsPerWeek === s ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{s}</button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">{t('createSocial.duration')}</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDuration(d)} className={`h-12 rounded-lg font-display font-bold transition-all ${duration === d ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{d}<span className="text-xs font-normal ml-0.5">{t('common.months')}</span></button>
              ))}
            </div>
          </section>

          {/* Recap card */}
          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">{t('createSocial.totalSessions')}</span><span className="font-display font-bold text-lg">{totalSessions}</span></div>
              <div><span className="text-muted-foreground block">{t('createSocial.durationLabel')}</span><span className="font-display font-bold text-lg">{duration} {t('common.months')}</span></div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">{t('createSocial.coinsToEarn')}</span>
              </div>
              <span className="font-display font-bold text-lg text-gradient-gold">
                <span className="inline-flex items-center gap-1"><CoinIcon size={18} /> {coinsPreview}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('createSocial.friendCoins', { coins: coinsPreview, amount: formatCurrency(betAmount) })}
            </p>
          </div>

          {/* Shopify products carousel */}
          {shopProducts.length > 0 && (
            <section>
              <label className="text-sm text-muted-foreground mb-3 block">{t('createSocial.whatTheyCanBuy')}</label>
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
                        {isAccessible && <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">{t('createSocial.accessible')}</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}


          <Button onClick={handleParamsNext} className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl">
            {t('common.next')}
          </Button>
        </div>
      )}

      {step === "target" && (
        <div className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground mb-2">{t('createSocial.selectFriend')}</p>
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-4">
            <p className="text-xs text-accent flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0" />
              {t('friends.oneAtATime')}
            </p>
          </div>
          {!friends || friends.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('createSocial.noFriends')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('createSocial.noFriendsSub')}</p>
              </div>
              <Button onClick={() => navigate("/friends")} className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-glow">
                <UserPlus className="w-4 h-4 mr-2" /> {t('createSocial.addFriendsBtn')}
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
                      <span className="font-medium">{f.username || t('friends.friend')}</span>
                      {isBusy && (
                        <p className="text-[11px] text-destructive">{t('createSocial.alreadyActive')}</p>
                      )}
                    </div>
                    {isBusy && (
                      <Badge variant="secondary" className="text-[10px]">{t('createSocial.unavailable')}</Badge>
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
            <h3 className="font-display font-bold text-lg">{t('createSocial.summary')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">{t('createSocial.type')}</span><span className="font-bold">{t('createSocial.giftChallenge')}</span></div>
              <div><span className="text-muted-foreground block">{t('createSocial.bet')}</span><span className="font-bold">{formatCurrency(betAmount)}</span></div>
              <div><span className="text-muted-foreground block">{t('createSocial.frequency')}</span><span className="font-bold">{sessionsPerWeek}x/{t('common.week')}</span></div>
              <div><span className="text-muted-foreground block">{t('createSocial.durationLabel')}</span><span className="font-bold">{duration} {t('common.months')}</span></div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-accent" />
                <span className="text-sm text-muted-foreground">{t('createSocial.coinsToEarn')}</span>
              </div>
              <span className="font-display font-bold text-lg text-gradient-gold">
                <span className="inline-flex items-center gap-1"><CoinIcon size={18} /> {coinsPreview}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('createSocial.friendSuccess', { coins: coinsPreview })}
            </p>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={isProcessing || createSocial.isPending}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flame className="w-5 h-5 mr-2" />}
            {t('createSocial.pay', { amount: formatCurrency(betAmount) })}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreateSocialChallenge;
