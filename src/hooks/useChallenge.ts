import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessions_per_week: number;
      duration_months: number;
      bet_per_month: number;
      odds: number;
    }) => {
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
        })
        .select()
        .single();
      if (error) throw error;

      // Seed rewards for this challenge
      const rewardValue = Math.round(params.bet_per_month * params.odds);
      const targetTier = getTargetTier(rewardValue);
      const rewards = REWARD_TIERS.map((r) => ({
        user_id: user!.id,
        challenge_id: data.id,
        name: r.name,
        description: r.description,
        value: r.value,
        emoji: r.emoji,
        tier: r.tier,
        unlocked: false,
      }));
      await supabase.from("rewards").insert(rewards);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    },
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

const REWARD_TIERS = [
  { tier: 1, name: "Accessoire sport", description: "Casquette ou serre-poignet", value: "~30€", emoji: "🧢" },
  { tier: 2, name: "T-shirt premium", description: "T-shirt d'une marque sportive", value: "~80€", emoji: "👕" },
  { tier: 3, name: "Ensemble sportif", description: "Short + haut de qualité", value: "~150€", emoji: "🎽" },
  { tier: 4, name: "Chaussures de sport", description: "Paire de chaussures running ou training", value: "~300€", emoji: "👟" },
  { tier: 5, name: "Tenue complète", description: "Équipement complet d'une marque premium", value: "~500€+", emoji: "🏆" },
];

const getTargetTier = (rewardValue: number) => {
  if (rewardValue >= 500) return 5;
  if (rewardValue >= 300) return 4;
  if (rewardValue >= 150) return 3;
  if (rewardValue >= 80) return 2;
  return 1;
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
