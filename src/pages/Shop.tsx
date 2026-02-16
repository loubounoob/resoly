import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CartDrawer } from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const ShopifyProductCard = ({ product }: { product: ShopifyProduct }) => {
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const isLoading = useCartStore(state => state.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

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

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/shopify/${product.node.handle}`)}>
      <AspectRatio ratio={1}>
        <img src={image?.url || "/placeholder.svg"} alt={image?.altText || product.node.title} className="w-full h-full object-cover" />
      </AspectRatio>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm truncate">{product.node.title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-primary">{parseFloat(price.amount).toFixed(2)} {price.currencyCode}</span>
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={isLoading || !variant?.availableForSale}>
            {variant?.availableForSale ? "Ajouter" : "Indisponible"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Shop = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopifyProducts(20)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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
        <CartDrawer />
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
