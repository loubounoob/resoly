import { Coins, Loader2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useUserCoins, useShopProducts, type ShopProduct } from "@/hooks/useChallenge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const categories = [
  { value: "all", label: "Tout" },
  { value: "equipement", label: "Équipement" },
  { value: "accessoires", label: "Accessoires" },
  { value: "vetements", label: "Vêtements" },
];

const ProductCard = ({ product }: { product: ShopProduct }) => {
  const navigate = useNavigate();
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/shop/${product.id}`)}>
      <AspectRatio ratio={1}>
        <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
      </AspectRatio>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-base">🪙</span>
          <span className="font-bold text-primary">{product.price_coins}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const Rewards = () => {
  const { data: coins, isLoading: coinsLoading } = useUserCoins();
  const { data: products, isLoading: productsLoading } = useShopProducts();

  if (coinsLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Boutique</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-gradient-card border border-border rounded-full px-3 py-1.5 shadow-card">
          <span className="text-base">🪙</span>
          <span className="font-bold text-sm">{coins ?? 0}</span>
        </div>
      </div>

      {/* Categories + Products */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="w-full">
          {categories.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="flex-1 text-xs">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((c) => (
          <TabsContent key={c.value} value={c.value}>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {(products || [])
                .filter((p) => c.value === "all" || p.category === c.value)
                .map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Rewards;
