import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Flame, Coins, Loader2, Users, User, Timer } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useCreateChallenge, useActiveChallenge } from "@/hooks/useChallenge";
import { calculateCoins, calculateBaseCoinsAtPayment, VALID_PROMO_CODES } from "@/lib/coins";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDay } from "date-fns";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import StripePaymentSheet from "@/components/StripePaymentSheet";
import { trackStartTrial } from "@/services/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ChallengeMode = "solo" | "social";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];
const PROMO_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function computeFirstWeekGoal(
  sessionsPerWeek: number,
  dayNames: string[],
): { firstWeekGoal: number; daysLeft: number; dayName: string; needsAdjustment: boolean } {
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysLeft = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { firstWeekGoal: 0, daysLeft, dayName: dayNames[dayOfWeek], needsAdjustment: true };
  }

  const firstWeekGoal = Math.max(1, Math.floor((sessionsPerWeek * daysLeft) / 7));
  const needsAdjustment = dayOfWeek !== 1;
  return { firstWeekGoal, daysLeft, dayName: dayNames[dayOfWeek], needsAdjustment };
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const CreateChallenge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isUpgradeFromFree = !!(location.state as any)?.upgradeFromFree;
  const { t, formatCurrency, currency, locale, country } = useLocale();
  const { data: activeChallenge, isLoading: loadingActive } = useActiveChallenge();
  const [mode] = useState<ChallengeMode>("solo");
  const [betAmount, setBetAmount] = useState(isUpgradeFromFree ? 20 : 100);
  const isFreeChallenge = betAmount === 0;
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showFirstWeekDialog, setShowFirstWeekDialog] = useState(false);
  const [shopProducts, setShopProducts] = useState<ShopifyProduct[]>([]);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoAnimating, setPromoAnimating] = useState(false);
  const [animatedCoins, setAnimatedCoins] = useState<number | null>(null);

  // Promo countdown
  const [promoExpiresAt, setPromoExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Stripe PaymentSheet state
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);

  const createChallenge = useCreateChallenge();

  // ── Ensure promo animation state is cleared when betAmount changes ──────
  useEffect(() => {
    setPromoAnimating(false);
    setAnimatedCoins(null);
  }, [betAmount]);

  useEffect(() => {
    // Skip redirect when coming from free challenge upgrade — the free challenge was already cancelled
    if (!loadingActive && activeChallenge && !isUpgradeFromFree) {
      navigate("/dashboard", { replace: true });
    }
  }, [loadingActive, activeChallenge, navigate, isUpgradeFromFree]);

  useEffect(() => {
    if (mode === "social") {
      navigate("/friends/create-social", { replace: true });
    }
  }, [mode, navigate]);

  useEffect(() => {
    fetchShopifyProducts(20).then(setShopProducts).catch(console.error);
  }, []);

  // Promo countdown timer
  useEffect(() => {
    if (!promoExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((promoExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setPromoApplied(null);
        setPromoExpiresAt(null);
        setPromoInput("");
        toast.error(t("createChallenge.promoExpired"));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [promoExpiresAt, t]);

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalSessions = sessionsPerWeek * duration * 4;
  const baseCoins = calculateCoins(betAmount, duration, sessionsPerWeek, currency);
  const coinsPreview = promoApplied ? Math.round(baseCoins * 1.5) : baseCoins;
  const baseCoinsAtPayment = calculateBaseCoinsAtPayment(coinsPreview);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (VALID_PROMO_CODES.includes(code)) {
      setPromoApplied(code);
      setPromoExpiresAt(Date.now() + PROMO_DURATION_MS);
      setPromoAnimating(true);
      setAnimatedCoins(baseCoins);
      toast.success(t("createChallenge.promoApplied"));

      // Animate coin counter from base → boosted over 2s
      const target = Math.round(baseCoins * 1.5);
      const steps = 40;
      const stepTime = 2000 / steps;
      let current = baseCoins;
      const increment = (target - baseCoins) / steps;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          clearInterval(timer);
          setAnimatedCoins(null);
        }
        setAnimatedCoins(Math.round(current));
      }, stepTime);

      setTimeout(() => setPromoAnimating(false), 2500);
    } else {
      toast.error(t("createChallenge.promoInvalid"));
    }
  };
  const dayNames = t("createChallenge.dayNames") as unknown as string[];
  const { firstWeekGoal, dayName, needsAdjustment } = computeFirstWeekGoal(sessionsPerWeek, dayNames);

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
      // Free challenge: use edge function that atomically fails old free challenges
      // and creates the new one already marked as paid (bypasses RLS + DB constraints)
      if (betAmount === 0) {
        const { data, error } = await supabase.functions.invoke("launch-free-challenge", {
          body: {
            sessions_per_week: sessionsPerWeek,
            duration_months: duration,
            ...(promoApplied ? { promo_code: promoApplied } : {}),
            ...(firstWeekSessions != null ? { first_week_sessions: firstWeekSessions } : {}),
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error("launch-free-challenge failed");
        queryClient.removeQueries({ queryKey: ["active-challenge"] });
        trackStartTrial();
        navigate("/payment-success?type=challenge&verified=true");
        return;
      }

      // Paid challenge: createChallenge hook automatically cleans up free challenges + zombies
      const challenge = await createChallenge.mutateAsync({
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_per_month: betAmount,
        odds: 1,
        ...(promoApplied ? { promo_code: promoApplied } : {}),
      });

      if (firstWeekSessions != null) {
        await supabase
          .from("challenges")
          .update({ first_week_sessions: firstWeekSessions } as any)
          .eq("id", challenge.id);
      }

      // Paid challenge: proceed with Stripe
      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          challengeId: challenge.id,
          amount: betAmount,
          currency: currency,
          locale: locale,
          description: t("createChallenge.betDescription", {
            amount: formatCurrency(betAmount),
            sessions: sessionsPerWeek,
            duration,
          }),
        },
      });

      if (error) throw error;
      if (data?.clientSecret && data?.paymentIntentId) {
        setPendingChallengeId(challenge.id);
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setPaymentSheetOpen(true);
        setIsProcessing(false);
      } else {
        throw new Error("No payment data returned");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("createChallenge.paymentError"));
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (piId: string, isFreePromo?: boolean) => {
    setPaymentSheetOpen(false);
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: {
          paymentIntentId: piId,
          challengeId: pendingChallengeId,
          ...(isFreePromo ? { promoFree: true } : {}),
        },
      });
      if (error) throw error;
      if (data?.success) {
        queryClient.removeQueries({ queryKey: ["active-challenge"] });
        trackStartTrial();
        navigate("/payment-success?type=challenge&verified=true");
      } else {
        toast.error(t("createChallenge.paymentError"));
      }
    } catch {
      toast.error(t("createChallenge.paymentError"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">{t("createChallenge.title")}</h1>
      </div>

      {mode === "solo" && (
        <>
          <div className="flex-1 space-y-8">
            <section>
              <label className="text-sm text-muted-foreground mb-3 block">{t("createChallenge.yourBet")}</label>
              <div className="text-center mb-4">
                <span className="text-5xl font-display font-bold text-gradient-primary">
                  {formatCurrency(betAmount)}
                </span>
              </div>
              <Slider
                value={[betAmount]}
                onValueChange={(v) => {
                  const val = v[0];
                  // Snap: 0 → skip 10 → jump to 20
                  if (val > 0 && val < 20) {
                    setBetAmount(val <= 10 ? 0 : 20);
                  } else {
                    setBetAmount(val);
                  }
                }}
                min={0}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatCurrency(0)}</span>
                <span>{formatCurrency(1000)}</span>
              </div>
              {isFreeChallenge ? (
                <p className="text-xs text-center mt-2 text-amber-400 font-medium">
                  {t("createChallenge.freeWarning")}
                </p>
              ) : (
                <div className="flex items-center justify-center mt-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 text-xs font-bold">
                      {t("createChallenge.refundBadge", { amount: formatCurrency(betAmount) })}
                    </span>
                  </div>
                </div>
              )}
            </section>

            <section>
              <label className="text-sm text-muted-foreground mb-3 block">{t("createChallenge.sessionsPerWeek")}</label>
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

            <section>
              <label className="text-sm text-muted-foreground mb-3 block">{t("createChallenge.duration")}</label>
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
                    {d}
                    <span className="text-xs font-normal ml-0.5">{t("common.months")}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="text-sm text-muted-foreground mb-3 block">
                {t("createChallenge.promoPlaceholder")}
              </label>
              <div className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t("createChallenge.promoPlaceholder")}
                  className={`flex-1 font-mono tracking-wider uppercase ${promoApplied ? "border-green-500 bg-green-500/10 text-green-400" : ""}`}
                  disabled={!!promoApplied}
                />
                {promoApplied ? (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm tabular-nums ${timeLeft < 300 ? "bg-destructive/15 text-destructive animate-pulse border border-destructive/30" : "bg-accent/15 text-accent border border-accent/30"}`}
                  >
                    <Timer className="w-4 h-4" />
                    {formatCountdown(timeLeft)}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim()}
                    className="whitespace-nowrap"
                  >
                    {t("createChallenge.promoApply")}
                  </Button>
                )}
              </div>
            </section>

            <div
              key={isFreeChallenge ? "summary-free" : "summary-paid"}
              className="bg-gradient-card rounded-2xl border border-border p-5 space-y-4 shadow-card"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">{t("createChallenge.totalSessions")}</span>
                  <span className="font-bold text-lg">{totalSessions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t("createChallenge.durationLabel")}</span>
                  <span className="font-bold text-lg">
                    {duration} {t("common.months")}
                  </span>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Refund row — only for paid challenges */}
              {!isFreeChallenge && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      <span className="text-sm text-muted-foreground">{t("createChallenge.refundRow")}</span>
                    </div>
                    <span className="font-bold text-green-400 text-lg">{formatCurrency(betAmount)}</span>
                  </div>
                  <div className="h-px bg-border" />
                </>
              )}

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-accent" />
                  <span className="text-sm text-muted-foreground">{t("createChallenge.coinsToEarn")}</span>
                </div>
                <div className="relative flex items-center gap-2">
                  {/* Floating +50% badge during animation */}
                  {promoAnimating && (
                    <span className="absolute -top-6 right-0 text-xs font-display font-bold text-accent animate-float-up pointer-events-none whitespace-nowrap">
                      +50% 🔥
                    </span>
                  )}
                  {/* Coins total + per-session on two lines */}
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-display font-bold text-lg text-gradient-gold ${promoAnimating ? "animate-coin-glow-burst" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <CoinIcon size={18} />
                          {promoAnimating && animatedCoins !== null ? (
                            <>
                              <span className="line-through text-muted-foreground text-sm mr-1">{baseCoins}</span>
                              {animatedCoins}
                            </>
                          ) : (
                            coinsPreview
                          )}
                        </span>
                      </span>
                      {/* Static +50% badge next to coins when promo is active */}
                      {promoApplied && !promoAnimating && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-xs font-bold whitespace-nowrap border border-green-500/30">
                          ✅ +50%
                        </span>
                      )}
                    </div>
                    {totalSessions > 0 && Math.ceil((coinsPreview / totalSessions) * 0.5) > 0 && (
                      <span className="text-[11px] text-accent/70 font-medium">
                        + {Math.ceil((coinsPreview / totalSessions) * 0.5)} {t("createChallenge.perSession")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Base coins at payment row — only for paid challenges */}
              {!isFreeChallenge && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{t("createChallenge.baseCoinsLabel")}</span>
                        <span className="text-[11px] text-muted-foreground/70">
                          {t("createChallenge.baseCoinsDesc")}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 font-display font-bold text-lg text-gradient-gold">
                      <CoinIcon size={16} />
                      {baseCoinsAtPayment}
                    </span>
                  </div>
                </>
              )}
              {isFreeChallenge ? (
                <p className="text-xs text-muted-foreground">
                  {t("createChallenge.coinsIfWin", { coins: coinsPreview })}
                </p>
              ) : (
                <div className="rounded-xl bg-green-500/8 border border-green-500/20 px-3 py-2">
                  <p className="text-xs text-green-400 font-medium text-center">
                    {t("createChallenge.successFormula", { amount: formatCurrency(betAmount), coins: coinsPreview })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {shopProducts.length > 0 && (
            <section className="mt-2">
              <label className="text-sm text-muted-foreground mb-3 block">{t("createChallenge.whatYouCanBuy")}</label>
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
                            {t("createChallenge.accessible")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isProcessing || createChallenge.isPending}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow rounded-xl mt-6"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Flame className="w-5 h-5 mr-2" />}
            {isFreeChallenge ? t("createChallenge.launchFree") : t("createChallenge.launch")}
          </Button>

          <Dialog open={showFirstWeekDialog} onOpenChange={setShowFirstWeekDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createChallenge.firstWeekTitle")}</DialogTitle>
                <DialogDescription>
                  {firstWeekGoal === 0 ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: t("createChallenge.firstWeekDesc0", { day: dayName, sessions: sessionsPerWeek })
                          .replace(dayName, `<strong>${dayName}</strong>`)
                          .replace("0", "<strong>0</strong>"),
                      }}
                    />
                  ) : (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: t("createChallenge.firstWeekDesc", {
                          day: dayName,
                          goal: firstWeekGoal,
                          sessions: sessionsPerWeek,
                          count: firstWeekGoal,
                        })
                          .replace(dayName, `<strong>${dayName}</strong>`)
                          .replace(String(firstWeekGoal), `<strong>${firstWeekGoal}</strong>`),
                      }}
                    />
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowFirstWeekDialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => proceedWithChallenge(firstWeekGoal)}
                  className="bg-gradient-primary text-primary-foreground"
                >
                  {t("common.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <StripePaymentSheet
            open={paymentSheetOpen}
            onOpenChange={setPaymentSheetOpen}
            clientSecret={clientSecret}
            paymentIntentId={paymentIntentId}
            amount={betAmount}
            description={t("createChallenge.betDescription", {
              amount: formatCurrency(betAmount),
              sessions: sessionsPerWeek,
              duration,
            })}
            onSuccess={handlePaymentSuccess}
            showPromoCode={true}
            promoEndpoint="apply-promo-code"
            stripeLocale={locale}
            userCountry={country}
            currency={currency}
          />
        </>
      )}
    </div>
  );
};

export default CreateChallenge;
