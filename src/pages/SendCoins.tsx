import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Gift, ChevronDown, Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useSendCoinGift } from "@/hooks/usePool";
import { useUserCoins } from "@/hooks/useChallenge";
import { useFriendsList } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CoinIcon from "@/components/CoinIcon";
import { toast } from "sonner";

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];
const MIN_AMOUNT = 5;

const SendCoins = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const { user } = useAuth();
  const { data: myCoins = 0 } = useUserCoins();
  const { data: friends = [] } = useFriendsList();
  const sendGift = useSendCoinGift();
  const navState = (location.state as any) ?? {};
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string; avatar_url?: string | null } | null>(
    navState.recipientId
      ? { id: navState.recipientId, username: navState.recipientUsername ?? "", avatar_url: navState.recipientAvatar ?? null }
      : null
  );
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [done, setDone] = useState(false);
  const canSend = !!selectedFriend && amount >= MIN_AMOUNT && amount <= (myCoins ?? 0);

  const handleSend = async () => {
    if (!canSend || !user || !selectedFriend) return;
    try {
      await sendGift.mutateAsync({
        senderId: user.id,
        recipientId: selectedFriend.id,
        amount,
        message: message.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => navigate(-1), 1800);
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  };

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-accent" />
          <h1 className="font-display font-bold text-xl">{t("coinGift.title")}</h1>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {done ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-6xl">🎁</div>
            <p className="font-display font-bold text-xl text-center">{t("coinGift.sent")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("coinGift.balance", { coins: myCoins ?? 0 })}
            </p>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("coinGift.selectFriend")}
              </label>
              <button
                type="button"
                onClick={() => setShowFriendPicker((v) => !v)}
                className="w-full flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3"
              >
                <span className="flex items-center gap-2">
                  {selectedFriend ? (
                    <>
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={selectedFriend.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(selectedFriend.username || "?")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>@{selectedFriend.username || selectedFriend.id.slice(0, 8)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{t("coinGift.selectFriend")}</span>
                  )}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {showFriendPicker && (
                <div className="mt-2 bg-secondary border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {(friends as any[]).length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                      {t("friends.noActivity")}
                    </p>
                  ) : (
                    (friends as any[]).map((f) => (
                      <button
                        key={f.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedFriend({ id: f.user_id, username: f.username ?? "", avatar_url: f.avatar_url });
                          setShowFriendPicker(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/10 text-left border-b border-border last:border-b-0"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={f.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {(f.username ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{f.username ?? f.user_id.slice(0, 8)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("coinGift.amount")}
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a)}
                    disabled={a > (myCoins ?? 0)}
                    className={`px-3 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                      amount === a
                        ? "bg-accent text-accent-foreground"
                        : a > (myCoins ?? 0)
                        ? "bg-secondary text-muted-foreground/30 cursor-not-allowed"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                    style={{ fontSize: "16px" }}
                  >
                    {a} <CoinIcon size={14} />
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={MIN_AMOUNT}
                max={myCoins ?? 0}
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(MIN_AMOUNT, Math.min(myCoins ?? 0, parseInt(e.target.value) || MIN_AMOUNT)))
                }
                className="mt-2 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50"
                style={{ fontSize: "16px" }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("coinGift.addMessage")}
              </label>
              <input
                type="text"
                maxLength={120}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("coinGift.messagePlaceholder")}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                style={{ fontSize: "16px" }}
              />
            </div>
          </>
        )}
      </div>

      {!done && (
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || sendGift.isPending}
            className="w-full h-14 rounded-xl bg-gradient-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-40 disabled:shadow-none"
          >
            {sendGift.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {sendGift.isPending ? t("common.loading") : t("coinGift.send", { coins: amount })}
          </button>
          {amount > (myCoins ?? 0) && (
            <p className="text-sm text-destructive text-center">
              {t("coinGift.insufficientBalance", { current: myCoins ?? 0 })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SendCoins;
