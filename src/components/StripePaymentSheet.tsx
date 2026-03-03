import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, Tag, X, CheckCircle2 } from "lucide-react";
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
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
  /** For challenge payments: allow promo codes */
  showPromoCode?: boolean;
  /** Edge function name to call for applying promo */
  promoEndpoint?: string;
  /** Extra body params for promo endpoint */
  promoBody?: Record<string, unknown>;
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
}: Omit<StripePaymentSheetProps, "open" | "onOpenChange" | "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState<number | null>(null);
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
        if (data.newAmount) setDiscountedAmount(data.newAmount);
        toast({ title: data.message || "Code applied!" });
      } else {
        toast({ title: data?.message || t('createChallenge.promoInvalid'), variant: "destructive" });
      }
    } catch {
      toast({ title: t('createChallenge.promoInvalid'), variant: "destructive" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      onError?.(err.message || "Payment failed");
      toast({ title: err.message || "Payment failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {description && (
        <p className="text-sm text-muted-foreground text-center">{description}</p>
      )}

      <div className="text-center">
        <span className="text-3xl font-display font-bold text-gradient-primary">
          {formatCurrency(displayAmount)}
        </span>
        {discountedAmount && discountedAmount < amount && (
          <span className="text-sm text-muted-foreground line-through ml-2">{formatCurrency(amount)}</span>
        )}
      </div>

      {showPromoCode && !promoApplied && (
        <div className="flex gap-2">
          <Input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder={t('createChallenge.promoPlaceholder')}
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
            onClick={() => { setPromoApplied(null); setDiscountedAmount(null); }}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border p-4 bg-secondary/50">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-5 h-5 mr-2" />
        )}
        {isProcessing ? t('common.loading') : `${t('common.confirm')} — ${formatCurrency(displayAmount)}`}
      </Button>
    </form>
  );
}

const StripePaymentSheet = ({
  open,
  onOpenChange,
  clientSecret,
  paymentIntentId,
  amount,
  description,
  onSuccess,
  onError,
  showPromoCode,
  promoEndpoint,
  promoBody,
}: StripePaymentSheetProps) => {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (open && !stripeInstance) {
      getStripe().then((s) => setStripeInstance(s));
    }
  }, [open, stripeInstance]);

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
            {t('common.confirm')}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
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
              description={description}
              onSuccess={onSuccess}
              onError={onError}
              paymentIntentId={paymentIntentId}
              showPromoCode={showPromoCode}
              promoEndpoint={promoEndpoint}
              promoBody={promoBody}
            />
          </Elements>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default StripePaymentSheet;
