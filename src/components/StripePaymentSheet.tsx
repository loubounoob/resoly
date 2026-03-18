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
  /** User locale for Stripe Elements (e.g. 'en', 'fr', 'de') */
  stripeLocale?: string;
  /** User country code for pre-filling billing (e.g. 'US', 'FR') */
  userCountry?: string;
}

function PaymentForm({
  amount,
  description,
  onSuccess,
  onError,
  paymentIntentId,
  showPromoCode,
  promoEndpoint,
  promoBody,
  userCountry,
}: Omit<StripePaymentSheetProps, "open" | "onOpenChange" | "clientSecret" | "stripeLocale">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const { toast } = useToast();
  const { t, formatCurrency } = useLocale();

  const displayAmount = discountedAmount ?? amount;

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
        confirmParams: {
          return_url: window.location.origin + "/dashboard",
        },
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="rounded-xl border border-border p-4 bg-secondary/50">
          <PaymentElement
            options={{
              layout: "tabs",
              wallets: {
                applePay: "auto" as const,
                googlePay: "auto" as const,
              },
              defaultValues: {
                billingDetails: {
                  address: {
                    country: userCountry || undefined,
                  },
                },
              },
            }}
          />
        </div>
      )}

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
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 justify-center font-display">
            <CreditCard className="w-5 h-5 text-primary" />
            {t("common.confirm")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <Elements
            stripe={stripeInstance}
            options={{
              clientSecret,
              // ✅ FIX APPLE PAY GUIDELINE 4.9 : nom du marchand affiché sur la feuille Apple Pay
              merchantDisplayName: "Resoly",
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
