import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { startOfWeek, getDay } from "date-fns";

export interface Challenge {
  id: string;
  user_id: string;
  sessions_per_week: number;
  duration_months: number;
  bet_per_month: number;
  odds: number;
  total_sessions: number;
  status: string;
  started_at: string;
  created_at: string;
  updated_at: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  coins_awarded: number;
  social_challenge_id: string | null;
  promo_code: string | null;
}

export interface CheckIn {
  id: string;
  user_id: string;
  challenge_id: string;
  photo_url: string | null;
  verified: boolean;
  checked_in_at: string;
  created_at: string;
}

export const useActiveChallenge = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-challenge", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Challenge | null;
    },
    enabled: !!user,
  });
};

export const useCheckIns = (challengeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["check-ins", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!challengeId && !!user,
  });
};

export const useCreateChallenge = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      sessions_per_week: number;
      duration_months: number;
      bet_per_month: number;
      odds: number;
      promo_code?: string;
    }) => {
      // Cancel any zombie challenges (created but never paid)
      await supabase
        .from("challenges")
        .update({ status: "failed" })
        .eq("user_id", user!.id)
        .eq("status", "active")
        .eq("payment_status", "pending");

      const total_sessions = params.sessions_per_week * params.duration_months * 4;
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          user_id: user!.id,
          sessions_per_week: params.sessions_per_week,
          duration_months: params.duration_months,
          bet_per_month: params.bet_per_month,
          odds: params.odds,
          total_sessions,
          ...(params.promo_code ? { promo_code: params.promo_code } : {}),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
};

export const useUserCoins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-coins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("coins")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data?.coins ?? 0;
    },
    enabled: !!user,
  });
};

export const useRewards = (challengeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rewards", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .order("tier", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!challengeId && !!user,
  });
};

export interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_coins: number;
  category: string;
  stock: number;
  active: boolean;
  created_at: string;
}

export const useShopProducts = (category?: string) => {
  return useQuery({
    queryKey: ["shop-products", category],
    queryFn: async () => {
      let query = supabase
        .from("shop_products")
        .select("*")
        .eq("active", true)
        .order("price_coins", { ascending: true });
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ShopProduct[];
    },
  });
};

export const useShopProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["shop-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data as ShopProduct;
    },
    enabled: !!productId,
  });
};

export const usePurchaseProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.functions.invoke("purchase-product", {
        body: { productId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-coins"] });
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
};

export const useRecentlyFailedChallenge = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recently-failed-challenge", user?.id],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "failed")
        .eq("payment_status", "paid")
        .gte("updated_at", twentyFourHoursAgo)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Challenge | null;
    },
    enabled: !!user,
  });
};

export const useAutoFailCheck = (challenge: Challenge | null | undefined, checkIns: CheckIn[] | undefined) => {
  const queryClient = useQueryClient();
  const failTriggered = useRef(false);

  useEffect(() => {
    if (!challenge || failTriggered.current) return;

    const now = new Date();
    const dayOfWeek = getDay(now); // 0=Sun
    const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;

    // Calculate weekly goal (first week adjustment)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const challengeWeekStart = startOfWeek(new Date(challenge.started_at), { weekStartsOn: 1 });
    const isFirstWeek = weekStart.getTime() === challengeWeekStart.getTime();
    const firstWeekSessions = (challenge as any).first_week_sessions as number | null;
    const weeklyGoal = isFirstWeek && firstWeekSessions != null
      ? firstWeekSessions
      : challenge.sessions_per_week;

    // Count verified check-ins this week (unique days)
    const verifiedThisWeek = (checkIns ?? []).filter(ci => {
      if (!ci.verified) return false;
      const ciDate = new Date(ci.checked_in_at);
      return ciDate >= weekStart;
    });
    const uniqueDays = new Set(verifiedThisWeek.map(ci => new Date(ci.checked_in_at).getDay()));
    const weeklyDone = uniqueDays.size;
    const sessionsRemaining = weeklyGoal - weeklyDone;

    // If mathematically impossible → trigger server-side failure
    if (sessionsRemaining > 0 && sessionsRemaining > daysLeftInWeek) {
      failTriggered.current = true;
      supabase.functions.invoke("fail-challenge", {
        body: { challenge_id: challenge.id },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
        queryClient.invalidateQueries({ queryKey: ["recently-failed-challenge"] });
        queryClient.invalidateQueries({ queryKey: ["friends-activity"] });
      });
    }
  }, [challenge, checkIns, queryClient]);
};

export const useCreateCheckIn = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { challenge_id: string; verified: boolean }) => {
      const { data, error } = await supabase
        .from("check_ins")
        .insert({
          user_id: user!.id,
          challenge_id: params.challenge_id,
          verified: params.verified,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
    },
  });
};
