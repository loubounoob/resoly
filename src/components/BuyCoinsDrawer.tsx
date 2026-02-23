import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Coins, Copy, Check, Loader2, Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CoinIcon from "@/components/CoinIcon";

const PACKS = [
  { euros: 10, coins: 500 },
  { euros: 20, coins: 1000 },
  { euros: 50, coins: 2500 },
  { euros: 100, coins: 5000 },
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

  const handleBuy = async (euros: number) => {
    setLoadingPack(euros);
    try {
      const { data, error } = await supabase.functions.invoke("buy-coins", {
        body: { pack: euros },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de lancer le paiement",
        variant: "destructive",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast({ title: "Code copié !" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 justify-center font-display">
            <Coins className="w-5 h-5 text-accent" />
            Acheter des pièces
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-3">
          {PACKS.map((pack) => (
            <button
              key={pack.euros}
              onClick={() => handleBuy(pack.euros)}
              disabled={loadingPack !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <CoinIcon size={20} />
                </div>
                <div className="text-left">
                  <p className="font-display font-bold text-foreground">
                    {pack.coins.toLocaleString()} pièces
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pack.euros}€
                  </p>
                </div>
              </div>
              {loadingPack === pack.euros ? (
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
                <p className="font-display font-bold text-sm">Parrainage</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Partage ton code et gagne <strong>50 pièces</strong> par filleul + <strong>250 pièces</strong> s'il crée un défi de +50€ !
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="w-full rounded-xl gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copié !" : `Code : ${inviteCode}`}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BuyCoinsDrawer;
