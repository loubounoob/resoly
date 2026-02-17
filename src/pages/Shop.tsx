import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useUserCoins } from "@/hooks/useChallenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CartDrawer } from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const COINS_PER_EURO = 50;

const ShopifyProductCard = ({ product }: { product: ShopifyProduct }) => {
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const variant = product.node.variants.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;
  const coinsPrice = Math.ceil(parseFloat(price.amount) * COINS_PER_EURO);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!variant) return;
    addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Ajouté au panier !");
  };

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/shopify/${product.node.handle}`)}>
      <AspectRatio ratio={1}>
        <img src={product.node.images.edges[0]?.node?.url || "/placeholder.svg"} alt={product.node.images.edges[0]?.node?.altText || product.node.title} className="w-full h-full object-cover" />
      </AspectRatio>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm truncate">{product.node.title}</h3>
        <div className="flex items-center gap-1 mt-1">
          <span className="font-bold text-primary text-sm flex items-center gap-1"><CoinIcon size={14} /> {coinsPrice} pièces</span>
        </div>
        
        <Button size="sm" className="w-full text-xs h-7 mt-2" onClick={handleAdd} disabled={!variant?.availableForSale}>
          {variant?.availableForSale ? "🛒 Ajouter au panier" : "Indisponible"}
        </Button>
      </CardContent>
    </Card>
  );
};

const Shop = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: coins, isLoading: coinsLoading } = useUserCoins();

  useEffect(() => {
    fetchShopifyProducts(20)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
            <CoinIcon size={16} />
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
            <ShopifyProductCard key={product.node.id} product={product} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Shop;
