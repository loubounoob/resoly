import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Coins, Copy, Check, Loader2, Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CoinIcon from "@/components/CoinIcon";
import { useLocale } from "@/contexts/LocaleContext";
import StripePaymentSheet from "@/components/StripePaymentSheet";
import { useNavigate } from "react-router-dom";

const PACKS = [
  { amount: 10, coins: 500 },
  { amount: 20, coins: 1000 },
  { amount: 50, coins: 2500 },
  { amount: 100, coins: 5000 },
];

interface BuyCoinsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteCode?: string | null;
}

const BuyCoinsDrawer = ({ open, onOpenChange, inviteCode }: BuyCoinsDrawerProps) => {
  const [loadingPack, setLoadingPack] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t, formatCurrency, currencySymbol, locale, currency, country } = useLocale();
  const navigate = useNavigate();

  // Stripe PaymentSheet state
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [selectedPackAmount, setSelectedPackAmount] = useState(0);

  const handleBuy = async (amount: number) => {
    setLoadingPack(amount);
    try {
      const { data, error } = await supabase.functions.invoke("buy-coins", {
        body: { pack: amount, currency },
      });
      if (error) throw error;
      if (data?.clientSecret && data?.paymentIntentId) {
        setSelectedPackAmount(amount);
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        onOpenChange(false); // Close coins drawer
        setTimeout(() => setPaymentSheetOpen(true), 300); // Open payment sheet
      } else {
        throw new Error("No payment data returned");
      }
    } catch (err: any) {
      toast({
        title: t('common.error'),
        description: err.message || t('buyCoins.paymentError'),
        variant: "destructive",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  const handlePaymentSuccess = async (piId: string) => {
    setPaymentSheetOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
        body: { paymentIntentId: piId },
      });
      if (error) throw error;
      if (data?.success) {
        navigate("/payment-success?type=coins&verified=true");
      } else {
        toast({
          title: t('common.error'),
          description: t('buyCoins.paymentError'),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('buyCoins.paymentError'),
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast({ title: t('buyCoins.codeCopied') });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 justify-center font-display">
              <Coins className="w-5 h-5 text-accent" />
              {t('buyCoins.title')}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-3">
            {PACKS.map((pack) => (
              <button
                key={pack.amount}
                onClick={() => handleBuy(pack.amount)}
                disabled={loadingPack !== null}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <CoinIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-display font-bold text-foreground">
                      {t('buyCoins.coins', { count: pack.coins.toLocaleString() })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(pack.amount)}
                    </p>
                  </div>
                </div>
                {loadingPack === pack.amount ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="w-5 h-5 text-accent" />
                )}
              </button>
            ))}

            {/* Referral section */}
            {inviteCode && (
              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <p className="font-display font-bold text-sm">{t('buyCoins.referral')}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3" dangerouslySetInnerHTML={{ 
                  __html: t('buyCoins.referralDesc', { currency: currencySymbol }).replace('50', '<strong>50</strong>').replace('250', '<strong>250</strong>').replace('+50', '<strong>+50</strong>')
                }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="w-full rounded-xl gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t('buyCoins.codeCopied') : t('buyCoins.code', { code: inviteCode })}
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <StripePaymentSheet
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        amount={selectedPackAmount}
        description={t('buyCoins.title')}
        onSuccess={handlePaymentSuccess}
        stripeLocale={locale}
        userCountry={country}
      />
    </>
  );
};

export default BuyCoinsDrawer;
