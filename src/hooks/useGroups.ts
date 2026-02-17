import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useGroups = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups" as any)
        .select("*");
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useCreateGroup = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase
        .from("groups" as any)
        .insert({
          name: params.name,
          description: params.description ?? null,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const groupId = (data as any).id;
      // Add creator + selected friends
      const allMembers = [user!.id, ...params.memberIds];
      const inserts = allMembers.map((uid) => ({
        group_id: groupId,
        user_id: uid,
      }));
      await supabase.from("group_members" as any).insert(inserts as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useGroupMembers = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members" as any)
        .select("*")
        .eq("group_id", groupId!);
      if (error) throw error;
      const userIds = (data as any[]).map((m: any) => m.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, avatar_url")
        .in("user_id", userIds);
      return (data as any[]).map((m: any) => ({
        ...m,
        profile: (profiles ?? []).find((p: any) => p.user_id === m.user_id),
      }));
    },
  });
};
