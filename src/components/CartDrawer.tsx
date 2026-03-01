import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useCartStore } from "@/stores/cartStore";
import { useUserCoins } from "@/hooks/useChallenge";
import { ShippingFormDrawer, ShippingInfo } from "@/components/ShippingFormDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";

const COINS_PER_EURO = 50;

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { t } = useLocale();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const { data: coins, refetch: refetchCoins } = useUserCoins();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCoins = items.reduce((sum, item) => sum + Math.ceil(parseFloat(item.price.amount) * COINS_PER_EURO) * item.quantity, 0);

  const handleCheckout = async (shipping: ShippingInfo) => {
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('shop.notConnected'));

      for (const item of items) {
        const res = await supabase.functions.invoke("purchase-with-coins", {
          body: {
            variantId: item.variantId,
            productTitle: item.product.node.title,
            variantTitle: item.variantTitle,
            priceAmount: item.price.amount,
            priceCurrency: item.price.currencyCode,
            selectedOptions: item.selectedOptions,
            quantity: item.quantity,
            shipping,
          },
        });

        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
      }

      clearCart();
      setShippingOpen(false);
      setIsOpen(false);
      toast.success(t('cart.orderSuccess'));
      refetchCoins();
    } catch (err: any) {
      toast.error(err.message === "Not enough coins" ? t('shop.notEnoughCoins') : err.message || t('cart.orderError'));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {totalItems}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
          <SheetHeader className="flex-shrink-0 mt-2">
            <SheetTitle>{t('cart.title')}</SheetTitle>
            <SheetDescription>
              {totalItems === 0 ? t('cart.empty') : t('cart.articles', { count: totalItems })}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col flex-1 pt-6 min-h-0">
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('cart.empty')}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="space-y-4">
                    {items.map((item) => {
                      const itemCoins = Math.ceil(parseFloat(item.price.amount) * COINS_PER_EURO);
                      return (
                        <div key={item.variantId} className="flex gap-4 p-2">
                          <div className="w-16 h-16 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                            {item.product.node.images?.edges?.[0]?.node && (
                              <img src={item.product.node.images.edges[0].node.url} alt={item.product.node.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.product.node.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.selectedOptions.map(o => o.value).join(' • ')}</p>
                            <p className="font-semibold flex items-center gap-1"><CoinIcon size={14} /> {itemCoins * item.quantity} {t('common.coins')}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.variantId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-shrink-0 space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">{t('cart.total')}</span>
                    <span className="text-xl font-bold flex items-center gap-1"><CoinIcon size={16} /> {totalCoins} {t('common.coins')}</span>
                  </div>
                  {(coins ?? 0) < totalCoins && (
                    <p className="text-xs text-destructive text-center">{t('cart.insufficientBalance', { current: coins ?? 0, needed: totalCoins })}</p>
                  )}
                  <Button onClick={() => setShippingOpen(true)} className="w-full" size="lg" disabled={items.length === 0 || (coins ?? 0) < totalCoins}>
                    <CoinIcon size={16} /> {t('cart.order', { coins: totalCoins })}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <ShippingFormDrawer
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        coinsPrice={totalCoins}
        onConfirm={handleCheckout}
        isPurchasing={purchasing}
      />
    </>
  );
};
