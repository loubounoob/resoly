import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFriendsWithActiveChallenge = (friendIds: string[]) => {
  return useQuery({
    queryKey: ["friends-active-challenges", friendIds],
    enabled: friendIds.length > 0,
    queryFn: async () => {
      const { data: personalChallenges } = await supabase
        .from("challenges")
        .select("user_id")
        .in("user_id", friendIds)
        .eq("status", "active")
        .eq("payment_status", "paid");

      const { data: socialMembers } = await supabase
        .from("social_challenge_members" as any)
        .select("user_id, social_challenge_id")
        .in("user_id", friendIds)
        .eq("status", "joined");

      const socialMembersList = (socialMembers as any[] ?? []);
      let activeSocialUserIds: string[] = [];
      if (socialMembersList.length > 0) {
        const scIds = [...new Set(socialMembersList.map((m: any) => m.social_challenge_id))];
        const { data: activeSocials } = await supabase
          .from("social_challenges" as any)
          .select("id")
          .in("id", scIds)
          .eq("status", "active");
        const activeScIds = new Set((activeSocials as any[] ?? []).map((s: any) => s.id));
        activeSocialUserIds = socialMembersList
          .filter((m: any) => activeScIds.has(m.social_challenge_id))
          .map((m: any) => m.user_id);
      }

      const busyIds = new Set([
        ...(personalChallenges ?? []).map((c: any) => c.user_id),
        ...activeSocialUserIds,
      ]);
      return busyIds;
    },
  });
};

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
          .select("user_id, display_name, first_name, avatar_url, username")
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

export const useReceivedSocialChallenges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["received-social-challenges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_challenges" as any)
        .select("*")
        .eq("target_user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      if (!data || (data as any[]).length === 0) return [];

      const ids = (data as any[]).map((sc: any) => sc.id);
      const { data: members } = await supabase
        .from("social_challenge_members" as any)
        .select("*")
        .in("social_challenge_id", ids);

      const creatorIds = [...new Set((data as any[]).map((sc: any) => sc.created_by))];
      let profiles: any[] = [];
      if (creatorIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, display_name, first_name, avatar_url, username")
          .in("user_id", creatorIds);
        profiles = p ?? [];
      }

      return (data as any[]).map((sc: any) => {
        const scMembers = (members as any[] ?? []).filter((m: any) => m.social_challenge_id === sc.id);
        const userAlreadyJoined = scMembers.some((m: any) => m.user_id === user!.id);
        return {
          ...sc,
          members: scMembers,
          creatorProfile: profiles.find((p: any) => p.user_id === sc.created_by),
          userAlreadyJoined,
        };
      }).filter((sc: any) => !sc.userAlreadyJoined);
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
      const { data: memberData, error: memberError } = await supabase
        .from("social_challenge_members" as any)
        .insert({
          social_challenge_id: (data as any).id,
          user_id: user!.id,
          bet_amount: params.bet_amount,
          status: "joined",
          payment_status: "pending",
        } as any)
        .select()
        .single();
      if (memberError) throw memberError;
      return { challenge: data as any, member: memberData as any };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-challenges"] });
    },
  });
};

export const useAcceptSocialChallenge = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { socialChallengeId: string; betAmount: number; iban?: string }) => {
      const insertData: any = {
        social_challenge_id: params.socialChallengeId,
        user_id: user!.id,
        bet_amount: params.betAmount,
        status: "joined",
        payment_status: "pending",
      };
      if (params.iban) insertData.iban = params.iban;
      const { data, error } = await supabase
        .from("social_challenge_members" as any)
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-challenges"] });
      qc.invalidateQueries({ queryKey: ["received-social-challenges"] });
    },
  });
};
