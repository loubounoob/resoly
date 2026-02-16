import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag, Coins } from "lucide-react";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useUserCoins } from "@/hooks/useChallenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CartDrawer } from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COINS_PER_EURO = 50;

const ShopifyProductCard = ({ product, userCoins, onCoinsPurchase }: { product: ShopifyProduct; userCoins: number; onCoinsPurchase: (product: ShopifyProduct) => void }) => {
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const isLoading = useCartStore(state => state.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;
  const coinsPrice = Math.ceil(parseFloat(price.amount) * COINS_PER_EURO);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Ajouté au panier !");
  };

  const handleBuyWithCoins = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCoinsPurchase(product);
  };

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/shopify/${product.node.handle}`)}>
      <AspectRatio ratio={1}>
        <img src={product.node.images.edges[0]?.node?.url || "/placeholder.svg"} alt={product.node.images.edges[0]?.node?.altText || product.node.title} className="w-full h-full object-cover" />
      </AspectRatio>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm truncate">{product.node.title}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-primary text-sm">{parseFloat(price.amount).toFixed(2)} {price.currencyCode}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
          <span>🪙</span>
          <span>{coinsPrice} pièces</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleAdd} disabled={isLoading || !variant?.availableForSale}>
            {variant?.availableForSale ? "🛒 Ajouter" : "Indisponible"}
          </Button>
          <Button size="sm" className="w-full text-xs h-7" onClick={handleBuyWithCoins} disabled={userCoins < coinsPrice || !variant?.availableForSale}>
            🪙 {coinsPrice} pièces
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Shop = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { data: coins, isLoading: coinsLoading, refetch: refetchCoins } = useUserCoins();

  useEffect(() => {
    fetchShopifyProducts(20)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCoinsPurchase = async (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    const price = product.node.priceRange.minVariantPrice;
    if (!variant) return;

    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await supabase.functions.invoke("purchase-with-coins", {
        body: {
          variantId: variant.id,
          productTitle: product.node.title,
          priceAmount: price.amount,
          priceCurrency: price.currencyCode,
        },
      });

      if (res.error) throw new Error(res.error.message);
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      toast.success(`Acheté avec ${data.coinsSpent} pièces !`, {
        description: `Il vous reste ${data.remainingCoins} pièces.`,
      });
      refetchCoins();
    } catch (err: any) {
      toast.error(err.message === "Not enough coins" ? "Pas assez de pièces" : err.message || "Erreur lors de l'achat");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading || coinsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Shop</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gradient-card border border-border rounded-full px-3 py-1.5 shadow-card">
            <span className="text-base">🪙</span>
            <span className="font-bold text-sm">{coins ?? 0}</span>
          </div>
          <CartDrawer />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ShopifyProductCard key={product.node.id} product={product} userCoins={coins ?? 0} onCoinsPurchase={handleCoinsPurchase} />
          ))}
        </div>
      )}

      {purchasing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Achat en cours...</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Shop;
