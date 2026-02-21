import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CoinIcon from "@/components/CoinIcon";
import BottomNav from "@/components/BottomNav";
import { Progress } from "@/components/ui/progress";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/shopify";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusSteps = [
  { key: "pending", label: "En attente", progress: 10 },
  { key: "preparing", label: "Préparation", progress: 30 },
  { key: "shipping", label: "Livraison", progress: 55 },
  { key: "arriving", label: "Arrive bientôt", progress: 80 },
  { key: "delivered", label: "Arrivé", progress: 100 },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  preparing: "bg-orange-500/20 text-orange-400",
  shipping: "bg-blue-500/20 text-blue-400",
  arriving: "bg-primary/20 text-primary",
  delivered: "bg-primary/20 text-primary",
  cancelled: "bg-destructive/20 text-destructive",
};

const getComputedStatus = (createdAt: string, dbStatus: string): string => {
  if (dbStatus === "cancelled") return "cancelled";
  const now = new Date();
  const created = new Date(createdAt);
  const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  const daysElapsed = hoursElapsed / 24;

  if (hoursElapsed < 2) return "pending";
  if (daysElapsed < 2) return "preparing";
  if (daysElapsed < 7) return "shipping";
  if (daysElapsed < 10) return "arriving";
  return "delivered";
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [productMap, setProductMap] = useState<Map<string, ShopifyProduct>>(new Map());

  useEffect(() => {
    fetchShopifyProducts(50)
      .then((products) => {
        const map = new Map<string, ShopifyProduct>();
        products.forEach((p) => map.set(p.node.title, p));
        setProductMap(map);
      })
      .catch(console.error);
  }, []);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["coin-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">Mes commandes</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !orders?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Package className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Aucune commande pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const computedKey = getComputedStatus(order.created_at, order.status);
            const isCancelled = computedKey === "cancelled";
            const step = statusSteps.find((s) => s.key === computedKey);
            const progressValue = isCancelled ? 0 : (step?.progress ?? 0);
            const statusLabel = isCancelled ? "Annulée" : (step?.label ?? "En attente");
            const statusColor = statusColors[computedKey] ?? statusColors.pending;

            const shopifyProduct = productMap.get(order.product_title);
            const imageUrl = shopifyProduct?.node.images.edges[0]?.node?.url;
            const handle = shopifyProduct?.node.handle;

            return (
              <div
                key={order.id}
                className={`bg-gradient-card rounded-2xl border border-border p-4 shadow-card ${handle ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
                onClick={() => handle && navigate(`/shopify/${handle}`)}
              >
                <div className="flex gap-3">
                  {/* Product image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt={order.product_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm truncate flex-1 mr-2">{order.product_title}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {order.variant_title && (
                      <p className="text-xs text-muted-foreground mb-1">{order.variant_title}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <CoinIcon size={14} />
                        <span className="text-sm font-bold">{order.coins_spent} pièces</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {!isCancelled && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                      {statusSteps.map((s) => (
                        <span
                          key={s.key}
                          className={computedKey === s.key ? "text-primary font-semibold" : ""}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Orders;
