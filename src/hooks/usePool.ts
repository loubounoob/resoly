import { useMutation, useQueryClient } from "@tanstack/react-query";
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
          fr: { title: "Tu as reçu des coins ! 🎁", body: message ? `@${senderName} t'a envoyé ${amount} pièces : "${message}"` : `@${senderName} t'a envoyé ${amount} pièces. Bonne chance !` },
          en: { title: "You received coins! 🎁", body: message ? `@${senderName} sent you ${amount} coins: "${message}"` : `@${senderName} sent you ${amount} coins. Keep it up!` },
          de: { title: "Du hast Coins erhalten! 🎁", body: message ? `@${senderName} hat dir ${amount} Münzen geschickt: "${message}"` : `@${senderName} hat dir ${amount} Münzen geschickt. Weiter so!` },
        };
        const { title: notifTitle, body: notifBody } = notifTexts[locale];
        await supabase.functions.invoke("send-notification", {
          body: { user_id: recipientId, type: "coin_gift", title: notifTitle, body: notifBody, data: { sender_id: senderId, amount: String(amount) } },
        });
      } catch { /* non-blocking */ }

      return giftId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-coins"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
};
