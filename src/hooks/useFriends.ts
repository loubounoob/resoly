import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { startOfWeek } from "date-fns";

// i18n helpers for friend notifications (mirrors edge function logic)
function countryToLocale(country: string | null | undefined): 'fr' | 'en' | 'de' {
  if (!country) return 'fr';
  const c = country.toUpperCase();
  if (c === 'FR') return 'fr';
  if (c === 'DE' || c === 'CH') return 'de';
  return 'en';
}

const notifTexts: Record<string, Record<string, { title: string; body: (name: string) => string }>> = {
  friend_request: {
    fr: { title: "Nouvelle demande d'ami", body: (n) => `${n} veut devenir ton ami ! 🤝` },
    en: { title: "New friend request", body: (n) => `${n} wants to be your friend! 🤝` },
    de: { title: "Neue Freundschaftsanfrage", body: (n) => `${n} möchte dein Freund werden! 🤝` },
  },
  friend_accepted: {
    fr: { title: "Demande acceptée !", body: (n) => `${n} a accepté ta demande d'ami ! 🎉` },
    en: { title: "Request accepted!", body: (n) => `${n} accepted your friend request! 🎉` },
    de: { title: "Anfrage akzeptiert!", body: (n) => `${n} hat deine Freundschaftsanfrage akzeptiert! 🎉` },
  },
};

function getNotifTexts(locale: 'fr' | 'en' | 'de', type: string, name: string) {
  const entry = notifTexts[type]?.[locale] || notifTexts[type]?.['fr'];
  if (!entry) return { title: type, body: '' };
  return { title: entry.title, body: entry.body(name) };
}

// Realtime hook for friendships changes
export const useFriendshipsRealtime = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("friendships-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          qc.invalidateQueries({ queryKey: ["friends-list"] });
          qc.invalidateQueries({ queryKey: ["friend-requests"] });
          qc.invalidateQueries({ queryKey: ["friends-activity"] });
          qc.invalidateQueries({ queryKey: ["leaderboard"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);
};

export const useFriendsList = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships" as any)
        .select("*")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      const friendIds = (data as any[]).map((f: any) =>
        f.user_id === user!.id ? f.friend_id : f.user_id
      );
      if (friendIds.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", friendIds);
      if (pErr) throw pErr;
      return profiles;
    },
  });
};

export const useFriendRequests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships" as any)
        .select("*")
        .eq("friend_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      const senderIds = (data as any[]).map((f: any) => f.user_id);
      if (senderIds.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", senderIds);
      if (pErr) throw pErr;
      return (data as any[]).map((f: any) => ({
        ...f,
        profile: (profiles as any[]).find((p: any) => p.user_id === f.user_id),
      }));
    },
  });
};

export const useSendFriendRequest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendUserId: string) => {
      const { error } = await supabase
        .from("friendships" as any)
        .insert({ user_id: user!.id, friend_id: friendUserId } as any);
      if (error) throw error;

      // Get sender profile and recipient profile for i18n
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", user!.id)
        .single();
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("country")
        .eq("user_id", friendUserId)
        .single();

      const senderName = myProfile?.username ? `@${myProfile.username}` : (myProfile?.display_name ?? "Someone");
      const locale = countryToLocale(recipientProfile?.country);
      const notif = getNotifTexts(locale, 'friend_request', senderName);
      await supabase.functions.invoke("send-notification", {
        body: {
          user_id: friendUserId,
          type: "friend_request",
          title: notif.title,
          body: notif.body,
          data: { from_user_id: user!.id },
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
      qc.invalidateQueries({ queryKey: ["friends-activity"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

export const useRespondFriendRequest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept, senderUserId }: { id: string; accept: boolean; senderUserId?: string }) => {
      const { error } = await supabase
        .from("friendships" as any)
        .update({ status: accept ? "accepted" : "rejected" } as any)
        .eq("id", id);
      if (error) throw error;

      // Notify the requester that their request was accepted
      if (accept && senderUserId) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", user!.id)
          .single();
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", senderUserId)
          .single();

        const name = myProfile?.username ? `@${myProfile.username}` : (myProfile?.display_name ?? "Someone");
        const locale = countryToLocale(senderProfile?.country);
        const notif = getNotifTexts(locale, 'friend_accepted', name);
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: senderUserId,
            type: "friend_accepted",
            title: notif.title,
            body: notif.body,
            data: { from_user_id: user!.id },
          },
        });
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
      qc.invalidateQueries({ queryKey: ["friends-activity"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      // Remove the friend_request notification from this sender
      if (variables.senderUserId) {
        supabase
          .from("notifications" as any)
          .delete()
          .eq("user_id", user!.id)
          .eq("type", "friend_request")
          .contains("data" as any, { from_user_id: variables.senderUserId } as any)
          .then(() => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
            qc.invalidateQueries({ queryKey: ["unread-count"] });
          });
      }
    },
  });
};

export const useFriendsActivity = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get accepted friends
      const { data: friendships, error } = await supabase
        .from("friendships" as any)
        .select("*")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      const friendIds = (friendships as any[]).map((f: any) =>
        f.user_id === user!.id ? f.friend_id : f.user_id
      );
      if (friendIds.length === 0) return [];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", friendIds);

      // Get active challenges for friends
      const { data: challenges } = await supabase
        .from("challenges")
        .select("*")
        .in("user_id", friendIds)
        .eq("status", "active");

      // Get check-ins for this week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const challengeIds = (challenges ?? []).map((c: any) => c.id);
      let checkIns: any[] = [];
      if (challengeIds.length > 0) {
        const { data: ci } = await supabase
          .from("check_ins")
          .select("*")
          .in("challenge_id", challengeIds)
          .eq("verified", true)
          .gte("checked_in_at", weekStart.toISOString());
        checkIns = ci ?? [];
      }

      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

      return friendIds.map((fid) => {
        const profile = (profiles ?? []).find((p: any) => p.user_id === fid);
        const challenge = (challenges ?? []).find((c: any) => c.user_id === fid);
        const weeklyCheckIns = challenge
          ? checkIns.filter((ci: any) => ci.challenge_id === challenge.id)
          : [];
        const uniqueDays = new Set(weeklyCheckIns.map((ci: any) => new Date(ci.checked_in_at).getDay()));
        const weeklyDone = uniqueDays.size;

        // First week adjustment
        let isFirstWeek = false;
        if (challenge) {
          const challengeWeekStart = startOfWeek(new Date(challenge.started_at), { weekStartsOn: 1 });
          isFirstWeek = currentWeekStart.getTime() === challengeWeekStart.getTime();
        }
        const weeklyGoal = isFirstWeek && challenge?.first_week_sessions != null
          ? challenge.first_week_sessions
          : (challenge?.sessions_per_week ?? 0);

        // Urgency logic
        const sessionsRemaining = weeklyGoal - weeklyDone;
        const currentDay = now.getDay();
        const daysLeft = currentDay === 0 ? 1 : 7 - currentDay + 1;
        const isGoalMet = weeklyDone >= weeklyGoal;
        // If mathematically impossible, mark as no challenge (don't show as active)
        const isMathematicallyImpossible = !isGoalMet && sessionsRemaining > daysLeft;
        const isUrgent = !isGoalMet && sessionsRemaining >= daysLeft && !isMathematicallyImpossible;

        // Build week status array (Mon-Sun) for the week tracker
        const checkedDaySet = new Set(weeklyCheckIns.map((ci: any) => new Date(ci.checked_in_at).getDay()));
        const weekStatus = Array.from({ length: 7 }, (_, i) => {
          const dayIndex = i === 6 ? 0 : i + 1; // Mon=1..Sat=6, Sun=0
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + i);
          if (dayDate > now) return null; // future
          return checkedDaySet.has(dayIndex) ? true : false;
        });

        // Weeks remaining
        let weeksRemaining = 0;
        if (challenge) {
          const challengeEnd = new Date(challenge.started_at);
          challengeEnd.setMonth(challengeEnd.getMonth() + challenge.duration_months);
          const msLeft = challengeEnd.getTime() - now.getTime();
          weeksRemaining = Math.max(0, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)));
        }

        // Total verified check-ins for challenge
        const totalVerified = challenge
          ? checkIns.filter((ci: any) => ci.challenge_id === challenge.id).length
          : 0;

        return {
          userId: fid,
          profile,
          challenge,
          weeklyDone,
          weeklyGoal,
          isGoalMet,
          isUrgent,
          isFirstWeek,
          hasChallenge: !!challenge && !isMathematicallyImpossible,
          weekStatus,
          weeksRemaining,
          totalVerified,
        };
      });
    },
  });
};

export const useLeaderboard = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaderboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: friendships } = await supabase
        .from("friendships" as any)
        .select("*")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`)
        .eq("status", "accepted");
      const friendIds = [
        user!.id,
        ...((friendships as any[]) ?? []).map((f: any) =>
          f.user_id === user!.id ? f.friend_id : f.user_id
        ),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", friendIds);

      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("*")
        .in("user_id", friendIds)
        .eq("verified", true);

      return friendIds.map((uid) => {
        const profile = (profiles ?? []).find((p: any) => p.user_id === uid);
        const userCheckIns = (checkIns ?? []).filter((ci: any) => ci.user_id === uid);
        const weeks = new Set(
          userCheckIns.map((ci: any) => {
            const d = new Date(ci.checked_in_at);
            const yearWeek = `${d.getFullYear()}-${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`;
            return yearWeek;
          })
        );
        return {
          userId: uid,
          profile,
          totalSessions: userCheckIns.length,
          activeWeeks: weeks.size,
          isMe: uid === user!.id,
        };
      }).sort((a, b) => b.totalSessions - a.totalSessions);
    },
  });
};

export const useRespondFriendRequestByUserId = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ senderUserId, accept }: { senderUserId: string; accept: boolean }) => {
      // Find the pending friendship from this sender
      const { data: friendship, error: findErr } = await supabase
        .from("friendships" as any)
        .select("id")
        .eq("user_id", senderUserId)
        .eq("friend_id", user!.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!friendship) return { alreadyHandled: true };

      const { error } = await supabase
        .from("friendships" as any)
        .update({ status: accept ? "accepted" : "rejected" } as any)
        .eq("id", (friendship as any).id);
      if (error) throw error;

      if (accept) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", user!.id)
          .single();
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("country")
          .eq("user_id", senderUserId)
          .single();
        const name = myProfile?.username ? `@${myProfile.username}` : (myProfile?.display_name ?? "Someone");
        const locale = countryToLocale(senderProfile?.country);
        const notif = getNotifTexts(locale, 'friend_accepted', name);
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: senderUserId,
            type: "friend_accepted",
            title: notif.title,
            body: notif.body,
            data: { from_user_id: user!.id },
          },
        });
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["friends-list"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
      // Delete the friend_request notification from this sender
      supabase
        .from("notifications" as any)
        .delete()
        .eq("user_id", user!.id)
        .eq("type", "friend_request")
        .contains("data" as any, { from_user_id: variables.senderUserId } as any)
        .then(() => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["unread-count"] });
        });
    },
  });
};

export const useSearchUsers = (query: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["search-users", query],
    enabled: !!user && query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, first_name, avatar_url")
        .ilike("username", `%${query}%`)
        .neq("user_id", user!.id)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
};

export const useMyProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
};
