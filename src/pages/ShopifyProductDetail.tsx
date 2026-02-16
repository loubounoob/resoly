import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/CartDrawer";
import { toast } from "sonner";

const ShopifyProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const isLoading = useCartStore(state => state.isLoading);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopifyProducts(50).then(products => {
      const found = products.find(p => p.node.handle === handle);
      setProduct(found || null);
    }).catch(console.error).finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
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

  return (
    <div className="min-h-screen flex flex-col pb-8">
      <div className="relative">
        <img src={image?.url || "/placeholder.svg"} alt={image?.altText || product.node.title} className="w-full aspect-square object-cover" />
        <button onClick={() => navigate("/shop")} className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4">
          <CartDrawer />
        </div>
      </div>
      <div className="px-5 pt-5 flex-1 flex flex-col">
        <h1 className="text-2xl font-bold">{product.node.title}</h1>
        <span className="text-2xl font-bold text-primary mt-2">{parseFloat(price.amount).toFixed(2)} {price.currencyCode}</span>
        <p className="text-muted-foreground text-sm mt-4 leading-relaxed">{product.node.description}</p>
        <div className="mt-auto pt-6">
          <Button className="w-full h-12 text-base" disabled={isLoading || !variant?.availableForSale} onClick={handleAdd}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : variant?.availableForSale ? `Ajouter au panier — ${parseFloat(price.amount).toFixed(2)} ${price.currencyCode}` : "Indisponible"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopifyProductDetail;
