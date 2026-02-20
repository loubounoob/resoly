import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Story {
  checkInId: string;
  photoUrl: string;
  checkedInAt: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface StoryGroup {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  stories: Story[];
}

export const useStories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get friend IDs
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);

      const friendIds = (friendships || []).map((f) =>
        f.user_id === user!.id ? f.friend_id : f.user_id
      );

      const userIds = [user!.id, ...friendIds];

      // Get recent check-ins with photos
      const { data: checkIns, error } = await supabase
        .from("check_ins")
        .select("id, user_id, photo_url, checked_in_at")
        .in("user_id", userIds)
        .eq("verified", true)
        .not("photo_url", "is", null)
        .gte("checked_in_at", since)
        .order("checked_in_at", { ascending: false });

      if (error) throw error;
      if (!checkIns || checkIns.length === 0) return [] as StoryGroup[];

      // Get profiles for these users
      const uniqueUserIds = [...new Set(checkIns.map((ci) => ci.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", uniqueUserIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Group by user
      const groupMap = new Map<string, StoryGroup>();
      for (const ci of checkIns) {
        const profile = profileMap.get(ci.user_id);
        if (!groupMap.has(ci.user_id)) {
          groupMap.set(ci.user_id, {
            userId: ci.user_id,
            username: profile?.username ?? null,
            displayName: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            stories: [],
          });
        }
        groupMap.get(ci.user_id)!.stories.push({
          checkInId: ci.id,
          photoUrl: ci.photo_url!,
          checkedInAt: ci.checked_in_at,
          userId: ci.user_id,
          username: profile?.username ?? null,
          displayName: profile?.display_name ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        });
      }

      // Put current user first
      const groups = Array.from(groupMap.values());
      groups.sort((a, b) => {
        if (a.userId === user!.id) return -1;
        if (b.userId === user!.id) return 1;
        return 0;
      });

      return groups;
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
};
