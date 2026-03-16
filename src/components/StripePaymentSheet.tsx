import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, Tag, X, CheckCircle2, Gift } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/LocaleContext";
import { Capacitor } from "@capacitor/core";

// Inline types — évite le static import de @capacitor-community/stripe
// qui fait planter le build Lovable (résolution TypeScript web-only)
interface ICapacitorStripe {
  initialize(opts: { publishableKey: string }): Promise<void>;
  isApplePayAvailable(): Promise<{ isAvailable: boolean }>;
  createApplePay(opts: {
    paymentIntentClientSecret: string;
    paymentSummaryItems: Array<{ label: string; amount: number }>;
    merchantIdentifier: string;
    countryCode: string;
    currency: string;
  }): Promise<void>;
  presentApplePay(): Promise<{ paymentResult: string }>;
}

// new Function() contourne l'analyse statique de TypeScript —
// le module n'est résolu qu'au runtime sur iOS, jamais au build
const loadCapStripe = async (): Promise<ICapacitorStripe | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await new Function("m", "return import(m)")("@capacitor-community/stripe");
    return ((mod.Stripe ?? mod.default?.Stripe) as ICapacitorStripe) ?? null;
  } catch {
    return null;
  }
};

interface StripePaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentIntentId: string, isFreePromo?: boolean) => void;
  onError?: (error: string) => void;
  showPromoCode?: boolean;
  promoEndpoint?: string;
  promoBody?: Record<string, unknown>;
  stripeLocale?: string;
  userCountry?: string;
}
interface PaymentFormProps extends Omit<StripePaymentSheetProps, "open" | "onOpenChange" | "stripeLocale"> {
  clientSecret: string;
}
function PaymentForm({
  amount,
  description,
  onSuccess,
  onError,
  paymentIntentId,
  clientSecret,
  currency,
  showPromoCode,
  promoEndpoint,
  promoBody,
  userCountry,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const { toast } = useToast();
  const { t, formatCurrency } = useLocale();
  const displayAmount = discountedAmount ?? amount;

  // Check Apple Pay availability via native Capacitor plugin
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    loadCapStripe()
      .then((plugin) => plugin?.initialize({ publishableKey: key }))
      .then(() => loadCapStripe())
      .then((plugin) => plugin?.isApplePayAvailable())
      .then(() => setApplePayAvailable(true))
      .catch(() => setApplePayAvailable(false));
  }, []);

  const handleApplePay = async () => {
    if (!clientSecret) return;
    setIsProcessing(true);
    try {
      const plugin = await loadCapStripe();
      if (!plugin) return;
      await plugin.createApplePay({
        paymentIntentClientSecret: clientSecret,
        paymentSummaryItems: [{ label: description || "Resoly", amount: displayAmount }],
        merchantIdentifier: "merchant.com.resoly.app.pay",
        countryCode: userCountry || "FR",
        currency: currency || "EUR",
      });
      const result = await plugin.presentApplePay();
      if (result.paymentResult === "completed") {
        onSuccess(paymentIntentId);
      } else if (result.paymentResult !== "Canceled" && result.paymentResult !== "canceled") {
        toast({ title: "Apple Pay failed", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.toLowerCase().includes("cancel")) {
        toast({ title: msg || "Apple Pay failed", variant: "destructive" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !promoEndpoint) return;
    setPromoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(promoEndpoint, {
        body: {
          promoCode: promoInput.trim().toUpperCase(),
          paymentIntentId,
          ...promoBody,
        },
      });
      if (error) throw error;
      if (data?.valid) {
        setPromoApplied(promoInput.trim().toUpperCase());
        if (data.type === "free") {
          setDiscountedAmount(0);
          setIsFree(true);
        } else if (data.newAmount != null) {
          setDiscountedAmount(data.newAmount);
        }
        toast({ title: data.message || "Code applied!" });
      } else {
        toast({ title: data?.message || t("createChallenge.promoInvalid"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("createChallenge.promoInvalid"), variant: "destructive" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleFreeConfirm = () => {
    onSuccess(paymentIntentId, true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFree) {
      handleFreeConfirm();
      return;
    }
    if (!stripe || !elements) return;
    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + "/dashboard" },
        redirect: "if_required",
      });
      if (error) {
        onError?.(error.message || "Payment failed");
        toast({ title: error.message || "Payment failed", variant: "destructive" });
      } else if (paymentIntent?.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError?.("Payment not completed");
        toast({ title: "Payment not completed", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      onError?.(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[calc(90vh-5rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 px-4 pb-2">
        {description && <p className="text-sm text-muted-foreground text-center">{description}</p>}
        <div className="text-center">
          <span className="text-3xl font-display font-bold text-gradient-primary">
            {isFree ? t("common.free") || "Free" : formatCurrency(displayAmount)}
          </span>
          {discountedAmount != null && discountedAmount < amount && (
            <span className="text-sm text-muted-foreground line-through ml-2">{formatCurrency(amount)}</span>
          )}
        </div>
        {showPromoCode && !promoApplied && (
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={t("createChallenge.promoPlaceholder")}
              className="flex-1 font-mono tracking-wider uppercase"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || promoLoading}
              size="sm"
            >
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            </Button>
          </div>
        )}
        {promoApplied && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-mono font-bold">{promoApplied}</span>
            <button
              type="button"
              onClick={() => {
                setPromoApplied(null);
                setDiscountedAmount(null);
                setIsFree(false);
              }}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!isFree && (
          <>
            {applePayAvailable && (
              <>
                <Button
                  type="button"
                  onClick={handleApplePay}
                  disabled={isProcessing}
                  className="w-full h-14 rounded-xl bg-black text-white font-bold text-base flex items-center justify-center gap-2 border border-white/10"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.05 10.27c-.03-2.55 2.08-3.78 2.17-3.84-1.18-1.73-3.02-1.97-3.68-2-1.56-.16-3.06.93-3.85.93-.79 0-2-.91-3.3-.88-1.69.03-3.26.99-4.13 2.5-1.77 3.06-.45 7.58 1.26 10.07.84 1.22 1.84 2.59 3.15 2.54 1.27-.05 1.75-.82 3.28-.82 1.53 0 1.97.82 3.3.8 1.36-.03 2.22-1.24 3.05-2.47.97-1.41 1.36-2.79 1.38-2.86-.03-.01-2.64-1.02-2.63-4.03zM14.52 3.5c.7-.85 1.17-2.03 1.04-3.21-1.01.04-2.23.67-2.95 1.52-.65.75-1.22 1.96-1.07 3.11 1.13.09 2.28-.57 2.98-1.42z" />
                      </svg>
                      Pay
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">ou payer par carte</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}
            <div className="rounded-xl border border-border p-4 bg-secondary/50">
              <PaymentElement
                options={{
                  layout: "tabs",
                  wallets: { applePay: "never", googlePay: "never" },
                  defaultValues: {
                    billingDetails: {
                      address: { country: userCountry || undefined },
                    },
                  },
                }}
              />
            </div>
          </>
        )}
      </div>
      <div className="sticky bottom-0 px-4 pt-3 pb-4 bg-background border-t border-border">
        {isFree ? (
          <Button
            type="submit"
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Gift className="w-5 h-5 mr-2" />
            {t("common.confirm")} — {t("common.free") || "Free"}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isProcessing || !stripe || !elements}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />}
            {isProcessing ? t("common.loading") : `${t("common.confirm")} — ${formatCurrency(displayAmount)}`}
          </Button>
        )}
      </div>
    </form>
  );
}

const StripePaymentSheet = ({
  open,
  onOpenChange,
  clientSecret,
  paymentIntentId,
  amount,
  currency,
  description,
  onSuccess,
  onError,
  showPromoCode,
  promoEndpoint,
  promoBody,
  stripeLocale,
  userCountry,
}: StripePaymentSheetProps) => {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const { t } = useLocale();
  useEffect(() => {
    if (open && !stripeInstance) {
      getStripe(stripeLocale).then((s) => setStripeInstance(s));
    }
  }, [open, stripeInstance, stripeLocale]);
  if (!stripeInstance || !clientSecret) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 justify-center font-display">
            <CreditCard className="w-5 h-5 text-primary" />
            {t("common.confirm")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-hidden">
          <Elements
            stripe={stripeInstance}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "#a3e635",
                  colorBackground: "#1a1a2e",
                  colorText: "#e2e8f0",
                  colorDanger: "#ef4444",
                  borderRadius: "12px",
                  fontFamily: "system-ui, sans-serif",
                },
              },
            }}
          >
            <PaymentForm
              amount={amount}
              currency={currency}
              description={description}
              onSuccess={onSuccess}
              onError={onError}
              paymentIntentId={paymentIntentId}
              clientSecret={clientSecret}
              showPromoCode={showPromoCode}
              promoEndpoint={promoEndpoint}
              promoBody={promoBody}
              userCountry={userCountry}
            />
          </Elements>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
export default StripePaymentSheet;
