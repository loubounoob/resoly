import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopProduct, usePurchaseProduct, useUserCoins } from "@/hooks/useChallenge";
import { useToast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: product, isLoading } = useShopProduct(productId);
  const { data: coins } = useUserCoins();
  const purchase = usePurchaseProduct();

  const canAfford = (coins ?? 0) >= (product?.price_coins ?? Infinity);

  const handlePurchase = async () => {
    if (!product) return;
    try {
      await purchase.mutateAsync(product.id);
      toast({ title: "Achat réussi ! 🎉", description: `Tu as acheté ${product.name}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message || "Achat échoué", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">Produit introuvable</p>
        <Button variant="outline" onClick={() => navigate("/rewards")}>Retour à la boutique</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-8">
      {/* Image */}
      <div className="relative">
        <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full aspect-square object-cover" />
        <button onClick={() => navigate("/rewards")} className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-background/80 backdrop-blur rounded-full px-3 py-1.5">
          <span>🪙</span>
          <span className="font-bold text-sm">{coins ?? 0}</span>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 pt-5 flex-1 flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</span>
        <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xl">🪙</span>
          <span className="text-2xl font-bold text-primary">{product.price_coins}</span>
          <span className="text-muted-foreground text-sm">pièces</span>
        </div>
        <p className="text-muted-foreground text-sm mt-4 leading-relaxed">{product.description}</p>

        <div className="mt-auto pt-6">
          <Button
            className="w-full h-12 text-base"
            disabled={!canAfford || purchase.isPending}
            onClick={handlePurchase}
          >
            {purchase.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : canAfford ? (
              `Acheter pour ${product.price_coins} 🪙`
            ) : (
              "Pas assez de pièces"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
