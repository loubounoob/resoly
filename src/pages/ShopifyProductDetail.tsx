import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useUserCoins } from "@/hooks/useChallenge";
import { CartDrawer } from "@/components/CartDrawer";
import { ShippingFormDrawer, ShippingInfo } from "@/components/ShippingFormDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COINS_PER_EURO = 50;

const ShopifyProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = useRef(0);
  const { data: coins, isLoading: coinsLoading, refetch: refetchCoins } = useUserCoins();

  useEffect(() => {
    fetchShopifyProducts(50).then(products => {
      const found = products.find(p => p.node.handle === handle);
      setProduct(found || null);
      if (found) {
        const firstVariant = found.node.variants.edges[0]?.node;
        if (firstVariant?.selectedOptions) {
          const initial: Record<string, string> = {};
          firstVariant.selectedOptions.forEach(opt => { initial[opt.name] = opt.value; });
          setSelectedOptions(initial);
        }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [handle]);

  const selectedVariant = product?.node.variants.edges.find(v =>
    v.node.selectedOptions.every(opt => selectedOptions[opt.name] === opt.value)
  )?.node ?? product?.node.variants.edges[0]?.node;

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

  const images = product.node.images.edges;
  const variantPrice = selectedVariant?.price ?? product.node.priceRange.minVariantPrice;
  const coinsPrice = Math.ceil(parseFloat(variantPrice.amount) * COINS_PER_EURO);
  const options = product.node.options.filter(o => !(o.values.length === 1 && o.values[0] === "Default Title"));

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
  };

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
    });
    toast.success("Ajouté au panier !");
  };

  const handleBuyWithCoins = async (shipping: ShippingInfo) => {
    if (!selectedVariant) return;
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await supabase.functions.invoke("purchase-with-coins", {
        body: {
          variantId: selectedVariant.id,
          productTitle: product.node.title,
          variantTitle: selectedVariant.title,
          priceAmount: variantPrice.amount,
          priceCurrency: variantPrice.currencyCode,
          selectedOptions: selectedVariant.selectedOptions,
          quantity: 1,
          shipping,
        },
      });

      if (res.error) throw new Error(res.error.message);
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setShippingOpen(false);
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
      <div className="relative"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            if (diff > 0 && currentImageIndex < images.length - 1) setCurrentImageIndex(i => i + 1);
            if (diff < 0 && currentImageIndex > 0) setCurrentImageIndex(i => i - 1);
          }
        }}
      >
        <img
          src={images[currentImageIndex]?.node.url || "/placeholder.svg"}
          alt={images[currentImageIndex]?.node.altText || product.node.title}
          className="w-full aspect-square object-cover"
        />
        {images.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button onClick={() => setCurrentImageIndex(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button onClick={() => setCurrentImageIndex(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur rounded-full p-1.5">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? "bg-primary scale-125" : "bg-background/60"}`} />
              ))}
            </div>
          </>
        )}
        <button onClick={() => navigate("/shop")} className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur rounded-full px-2.5 py-1">
            <CoinIcon size={14} />
            <span className="font-bold text-xs">{coins ?? 0}</span>
          </div>
          <CartDrawer />
        </div>
      </div>
      <div className="px-5 pt-5 flex-1 flex flex-col">
        <h1 className="text-2xl font-bold">{product.node.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-2xl font-bold text-primary flex items-center gap-1"><CoinIcon size={20} /> {coinsPrice} pièces</span>
          <span className="text-muted-foreground text-sm">{parseFloat(variantPrice.amount).toFixed(2)} {variantPrice.currencyCode}</span>
        </div>

        {options.length > 0 && (
          <div className="mt-4 space-y-3">
            {options.map(option => (
              <div key={option.name}>
                <p className="text-sm font-medium mb-2">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map(value => {
                    const isSelected = selectedOptions[option.name] === value;
                    const isAvailable = product.node.variants.edges.some(v =>
                      v.node.availableForSale &&
                      v.node.selectedOptions.some(o => o.name === option.name && o.value === value)
                    );
                    return (
                      <button
                        key={value}
                        onClick={() => handleOptionSelect(option.name, value)}
                        disabled={!isAvailable}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : isAvailable
                              ? "bg-background border-border hover:border-primary"
                              : "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed line-through"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-muted-foreground text-sm mt-4 leading-relaxed prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_br]:block [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4" dangerouslySetInnerHTML={{ __html: product.node.descriptionHtml }} />
        <div className="mt-auto pt-6 flex flex-col gap-3">
          <Button className="w-full h-12 text-base" disabled={!selectedVariant?.availableForSale} onClick={handleAdd}>
            {selectedVariant?.availableForSale ? "🛒 Ajouter au panier" : "Indisponible"}
          </Button>
          <Button variant="secondary" className="w-full h-12 text-base" disabled={purchasing || (coins ?? 0) < coinsPrice || !selectedVariant?.availableForSale} onClick={() => setShippingOpen(true)}>
            {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CoinIcon size={16} /> Acheter — {coinsPrice} pièces</>}
          </Button>
          {(coins ?? 0) < coinsPrice && (
            <p className="text-xs text-destructive text-center">Solde insuffisant ({coins ?? 0}/{coinsPrice} pièces)</p>
          )}
        </div>
      </div>
      <ShippingFormDrawer
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        coinsPrice={coinsPrice}
        onConfirm={handleBuyWithCoins}
        isPurchasing={purchasing}
      />
    </div>
  );
};

export default ShopifyProductDetail;
