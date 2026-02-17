import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSocialChallenges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["social-challenges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_challenges" as any)
        .select("*")
        .in("status", ["pending", "active"]);
      if (error) throw error;
      // Enrich with members
      const ids = (data as any[]).map((sc: any) => sc.id);
      if (ids.length === 0) return [];
      const { data: members } = await supabase
        .from("social_challenge_members" as any)
        .select("*")
        .in("social_challenge_id", ids);
      const memberUserIds = [...new Set((members as any[] ?? []).map((m: any) => m.user_id))];
      let profiles: any[] = [];
      if (memberUserIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, display_name, first_name, avatar_url")
          .in("user_id", memberUserIds);
        profiles = p ?? [];
      }
      return (data as any[]).map((sc: any) => ({
        ...sc,
        members: (members as any[] ?? [])
          .filter((m: any) => m.social_challenge_id === sc.id)
          .map((m: any) => ({
            ...m,
            profile: profiles.find((p: any) => p.user_id === m.user_id),
          })),
      }));
    },
  });
};

export const useCreateSocialChallenge = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      type: string;
      target_user_id?: string;
      group_id?: string;
      sessions_per_week: number;
      duration_months: number;
      bet_amount: number;
    }) => {
      const { data, error } = await supabase
        .from("social_challenges" as any)
        .insert({
          ...params,
          created_by: user!.id,
          status: "pending",
        } as any)
        .select()
        .single();
      if (error) throw error;
      // Also add creator as member
      await supabase.from("social_challenge_members" as any).insert({
        social_challenge_id: (data as any).id,
        user_id: user!.id,
        bet_amount: params.bet_amount,
        status: "joined",
      } as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-challenges"] });
    },
  });
};
