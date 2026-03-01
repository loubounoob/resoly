import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CoinIcon from "@/components/CoinIcon";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import { fetchShopifyProducts } from "@/lib/shopify";
import { useEffect, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

const statusSteps = [
  { key: "pending", labelKey: "orders.stepPending" },
  { key: "preparing", labelKey: "orders.stepPrep" },
  { key: "shipping", labelKey: "orders.stepShipping" },
  { key: "arriving", labelKey: "orders.stepArriving" },
  { key: "delivered", labelKey: "orders.stepDelivered" },
] as const;

const statusColors: Record<string, { labelKey: string; color: string }> = {
  pending: { labelKey: "orders.statusPending", color: "bg-yellow-500/20 text-yellow-400" },
  preparing: { labelKey: "orders.statusPreparing", color: "bg-orange-500/20 text-orange-400" },
  shipping: { labelKey: "orders.statusShipping", color: "bg-blue-500/20 text-blue-400" },
  arriving: { labelKey: "orders.statusArriving", color: "bg-primary/20 text-primary" },
  delivered: { labelKey: "orders.statusDelivered", color: "bg-green-500/20 text-green-400" },
  cancelled: { labelKey: "orders.statusCancelled", color: "bg-destructive/20 text-destructive" },
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

const getStatusIndex = (status: string): number => {
  const idx = statusSteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, dateLocale } = useLocale();

  const [shopifyMap, setShopifyMap] = useState<
    Record<string, { imageUrl: string; handle: string }>
  >({});

  useEffect(() => {
    fetchShopifyProducts(50).then((products) => {
      const map: Record<string, { imageUrl: string; handle: string }> = {};
      for (const p of products) {
        const img = p.node.images.edges[0]?.node.url ?? "";
        const handle = p.node.handle;
        for (const v of p.node.variants.edges) {
          map[v.node.id] = { imageUrl: img, handle };
        }
      }
      setShopifyMap(map);
    });
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
    <div className="min-h-full flex flex-col px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">{t('orders.title')}</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !orders?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Package className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">{t('orders.noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const computedKey = getComputedStatus(order.created_at, order.status);
            const status = statusColors[computedKey] ?? statusColors.pending;
            const stepIdx = getStatusIndex(computedKey);
            const info = shopifyMap[order.variant_id];
            const isCancelled = computedKey === "cancelled";

            return (
              <div
                key={order.id}
                onClick={() => info?.handle && navigate(`/shopify/${info.handle}`)}
                className="bg-gradient-card rounded-2xl border border-border p-3 shadow-card cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Top row: image + info */}
                <div className="flex gap-3">
                  {/* Product image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {info?.imageUrl ? (
                      <img src={info.imageUrl} alt={order.product_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate flex-1">{order.product_title}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                        {t(status.labelKey)}
                      </span>
                    </div>
                    {order.variant_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">{order.variant_title}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        <CoinIcon size={14} />
                        <span className="text-sm font-bold">{order.coins_spent}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(order.created_at), "d MMM yyyy", { locale: dateLocale })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {!isCancelled && (
                  <div className="mt-3">
                    <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-green-400 transition-all duration-700"
                        style={{ width: `${((stepIdx + 1) / statusSteps.length) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {statusSteps.map((s, i) => (
                        <span
                          key={s.key}
                          className={`text-[9px] ${
                            i <= stepIdx ? "text-primary font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          {t(s.labelKey)}
                        </span>
                      ))}
                    </div>
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
