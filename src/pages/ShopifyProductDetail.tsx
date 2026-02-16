import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useUserCoins } from "@/hooks/useChallenge";
import { CartDrawer } from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COINS_PER_EURO = 50;

const ShopifyProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const isLoading = useCartStore(state => state.isLoading);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { data: coins, isLoading: coinsLoading, refetch: refetchCoins } = useUserCoins();

  useEffect(() => {
    fetchShopifyProducts(50).then(products => {
      const found = products.find(p => p.node.handle === handle);
      setProduct(found || null);
    }).catch(console.error).finally(() => setLoading(false));
  }, [handle]);

  if (loading || coinsLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">Produit introuvable</p>
        <Button variant="outline" onClick={() => navigate("/shop")}>Retour au shop</Button>
      </div>
    );
  }

  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;
  const coinsPrice = Math.ceil(parseFloat(price.amount) * COINS_PER_EURO);

  const handleAdd = async () => {
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

  const handleBuyWithCoins = async () => {
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

  return (
    <div className="min-h-screen flex flex-col pb-8">
      <div className="relative">
        <img src={image?.url || "/placeholder.svg"} alt={image?.altText || product.node.title} className="w-full aspect-square object-cover" />
        <button onClick={() => navigate("/shop")} className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur rounded-full px-2.5 py-1">
            <span className="text-sm">🪙</span>
            <span className="font-bold text-xs">{coins ?? 0}</span>
          </div>
          <CartDrawer />
        </div>
      </div>
      <div className="px-5 pt-5 flex-1 flex flex-col">
        <h1 className="text-2xl font-bold">{product.node.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-2xl font-bold text-primary">{parseFloat(price.amount).toFixed(2)} {price.currencyCode}</span>
          <span className="text-muted-foreground text-sm">ou 🪙 {coinsPrice} pièces</span>
        </div>
        <p className="text-muted-foreground text-sm mt-4 leading-relaxed">{product.node.description}</p>
        <div className="mt-auto pt-6 flex flex-col gap-3">
          <Button className="w-full h-12 text-base" disabled={isLoading || !variant?.availableForSale} onClick={handleAdd}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : variant?.availableForSale ? `🛒 Ajouter au panier — ${parseFloat(price.amount).toFixed(2)} ${price.currencyCode}` : "Indisponible"}
          </Button>
          <Button variant="secondary" className="w-full h-12 text-base" disabled={purchasing || (coins ?? 0) < coinsPrice || !variant?.availableForSale} onClick={handleBuyWithCoins}>
            {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : `🪙 Acheter avec ${coinsPrice} pièces`}
          </Button>
          {(coins ?? 0) < coinsPrice && (
            <p className="text-xs text-destructive text-center">Solde insuffisant ({coins ?? 0}/{coinsPrice} pièces)</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopifyProductDetail;
