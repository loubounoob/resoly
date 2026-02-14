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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
    },
  });
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
