import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SendCoinGiftParams {
  senderId: string;
  recipientId: string;
  amount: number;
  message?: string;
}

export const useSendCoinGift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ senderId, recipientId, amount, message }: SendCoinGiftParams) => {
      // 1-3. Atomic transfer + record gift via secure RPC
      const { data: giftId, error } = await supabase.rpc("send_coin_gift" as any, {
        _recipient_id: recipientId,
        _amount: amount,
        _message: message ?? null,
      });
      if (error) throw error;

      // 4. Notify recipient (best-effort, non-blocking)
      try {
        const [senderRes, recipientRes] = await Promise.all([
          supabase.from("profiles").select("username").eq("user_id", senderId).single(),
          supabase.from("profiles").select("country").eq("user_id", recipientId).single(),
        ]);
        const senderName = (senderRes.data as any)?.username ?? "Someone";
        const country: string = (recipientRes.data as any)?.country ?? "";
        let locale: "fr" | "en" | "de" = "fr";
        const c = country.toUpperCase();
        if (c === "DE" || c === "CH") locale = "de";
        else if (c !== "FR" && c !== "") locale = "en";
        const notifTexts: Record<"fr" | "en" | "de", { title: string; body: string }> = {
          fr: {
            title: "Tu as reçu des coins ! 🎁",
            body: message
              ? `@${senderName} t'a envoyé ${amount} pièces : "${message}"`
              : `@${senderName} t'a envoyé ${amount} pièces. Bonne chance !`,
          },
          en: {
            title: "You received coins! 🎁",
            body: message
              ? `@${senderName} sent you ${amount} coins: "${message}"`
              : `@${senderName} sent you ${amount} coins. Keep it up!`,
          },
          de: {
            title: "Du hast Coins erhalten! 🎁",
            body: message
              ? `@${senderName} hat dir ${amount} Münzen geschickt: "${message}"`
              : `@${senderName} hat dir ${amount} Münzen geschickt. Weiter so!`,
          },
        };
        const { title: notifTitle, body: notifBody } = notifTexts[locale];
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: recipientId,
            type: "coin_gift",
            title: notifTitle,
            body: notifBody,
            data: { sender_id: senderId, amount: String(amount) },
          },
        });
      } catch {
        /* non-blocking */
      }

      return giftId;
    },
    onSuccess: () => {
      // ─── Types ───────────────────────────────────────────────────────────────────

      export interface ChallengePool {
        id: string;
        week_start: string;
        week_end: string;
        status: "open" | "closed" | "paying_out" | "done";
        total_staked: number;
        total_members: number;
        winners_count: number;
        reward_per_winner: number | null;
        success_rate: number | null;
        created_at: string;
      }

      export interface PoolParticipant {
        id: string;
        pool_id: string;
        user_id: string;
        challenge_id: string | null;
        bet_amount: number;
        sessions_done: number;
        sessions_goal: number;
        is_winner: boolean;
        joined_at: string;
        username?: string;
        avatar_url?: string;
      }

      // ─── Helpers ─────────────────────────────────────────────────────────────────

      export const currentWeekStart = (): string => {
        const d = new Date();
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);
        return monday.toISOString().slice(0, 10);
      };

      export const estimateBonusCoins = (bet: number, successRate = 0.62): number => {
        if (bet <= 0 || successRate <= 0) return 0;
        const failRate = 1 - successRate;
        return Math.round(bet * (failRate / successRate) * 50);
      };

      export const estimateBonusProductValue = (bet: number, successRate = 0.62): number => {
        return Math.round(estimateBonusCoins(bet, successRate) / 50);
      };

      // ─── Pool Hooks ───────────────────────────────────────────────────────────────

      export const useCurrentPool = () => {
        return useQuery({
    queryKey: ["current_pool"],
          queryFn: async (): Promise<ChallengePool | null> => {
            const weekStart = currentWeekStart();
            const { data, error } = await (supabase as any)
              .from("challenge_pools")
              .select("*")
              .eq("week_start", weekStart)
              .maybeSingle();
            if (error) throw error;
            return data as ChallengePool | null;
          },
          staleTime: 60_000,
        });
      };

      export const usePoolParticipants = (poolId: string | null | undefined) => {
        return useQuery({
          queryKey: ["pool_participants", poolId],
          enabled: !!poolId,
          queryFn: async (): Promise<PoolParticipant[]> => {
            const { data, error } = await (supabase as any)
              .from("pool_participants")
              .select(`*, profiles:user_id (username, avatar_url)`)
              .eq("pool_id", poolId!)
              .order("sessions_done", { ascending: false });
            if (error) throw error;
            return (data ?? []).map((row: any) => ({
              ...row,
              username: row.profiles?.username ?? null,
              avatar_url: row.profiles?.avatar_url ?? null,
            }));
          },
          staleTime: 30_000,
        });
      };

      export const useMyPoolEntry = (poolId: string | null | undefined, userId: string | null | undefined) => {
        return useQuery({
          queryKey: ["my_pool_entry", poolId, userId],
          enabled: !!poolId && !!userId,
          queryFn: async (): Promise<PoolParticipant | null> => {
            const { data, error } = await (supabase as any)
              .from("pool_participants")
              .select("*")
              .eq("pool_id", poolId!)
              .eq("user_id", userId!)
              .maybeSingle();
            if (error) throw error;
            return data as PoolParticipant | null;
          },
        });
      };

      export const useJoinPool = () => {
        const queryClient = useQueryClient();
        return useMutation({
          mutationFn: async ({
            userId,
            challengeId,
            betAmount,
            sessionsGoal,
          }: {
            userId: string;
            challengeId: string;
            betAmount: number;
            sessionsGoal: number;
          }) => {
            const { data, error } = await (supabase as any).rpc("join_pool", {
              _user_id: userId,
              _challenge_id: challengeId,
              _bet_amount: betAmount,
              _sessions_goal: sessionsGoal,
            });
            if (error) throw error;
            return data as string;
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current_pool"] });
            queryClient.invalidateQueries({ queryKey: ["pool_participants"] });
            queryClient.invalidateQueries({ queryKey: ["my_pool_entry"] });
          },
        });
      };

      // ─── Check-in Reactions ──────────────────────────────────────────────────────

      export const useCheckInReactions = (checkInId: string | null | undefined) => {
        return useQuery({
          queryKey: ["check_in_reactions", checkInId],
          enabled: !!checkInId,
          queryFn: async () => {
            const { data, error } = await (supabase as any)
              .from("check_in_reactions")
              .select(`*, profiles:reactor_id (username, avatar_url)`)
              .eq("check_in_id", checkInId!);
            if (error) throw error;
            return data ?? [];
          },
          staleTime: 15_000,
        });
      };

      export const useAddReaction = () => {
        const queryClient = useQueryClient();
        return useMutation({
          mutationFn: async ({
            checkInId,
            reactorId,
            targetUser,
            emoji,
          }: {
            checkInId: string;
            reactorId: string;
            targetUser: string;
            emoji: "🔥" | "👏" | "💪" | "❤️";
          }) => {
            const { error } = await (supabase as any)
              .from("check_in_reactions")
              .upsert(
                { check_in_id: checkInId, reactor_id: reactorId, target_user: targetUser, emoji },
                { onConflict: "check_in_id,reactor_id" },
              );
            if (error) throw error;
          },
          onSuccess: (_data: any, variables: any) => {
            queryClient.invalidateQueries({ queryKey: ["check_in_reactions", variables.checkInId] });
          },
        });
      };