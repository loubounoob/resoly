import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CoinIcon from "@/components/CoinIcon";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  preparing: { label: "Préparation", color: "bg-orange-500/20 text-orange-400" },
  shipping: { label: "Livraison en cours", color: "bg-blue-500/20 text-blue-400" },
  arriving: { label: "Arrive bientôt", color: "bg-primary/20 text-primary" },
  delivered: { label: "Arrivé", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Annulée", color: "bg-destructive/20 text-destructive" },
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
        <div className="space-y-3">
          {orders.map((order) => {
            const computedKey = getComputedStatus(order.created_at, order.status);
            const status = statusLabels[computedKey] ?? statusLabels.pending;
            return (
              <div key={order.id} className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm truncate flex-1 mr-2">{order.product_title}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                {order.variant_title && (
                  <p className="text-xs text-muted-foreground mb-1">{order.variant_title}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <CoinIcon size={14} />
                    <span className="text-sm font-bold">{order.coins_spent} pièces</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
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
