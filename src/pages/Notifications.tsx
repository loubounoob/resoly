import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, UserCheck, Swords, Flame, Check, X, Gift, Loader2, Trophy, ThumbsDown, ShieldOff, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import { useRespondFriendRequestByUserId } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ChallengeAcceptedOverlay from "@/components/ChallengeAcceptedOverlay";
import CoinIcon from "@/components/CoinIcon";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/contexts/LocaleContext";

const typeConfig: Record<string, { icon: typeof UserPlus; color: string }> = {
  friend_request: { icon: UserPlus, color: "text-blue-400" },
  friend_accepted: { icon: UserCheck, color: "text-green-400" },
  challenge_invite: { icon: Swords, color: "text-purple-400" },
  social_challenge: { icon: Gift, color: "text-accent" },
  challenge_accepted: { icon: Trophy, color: "text-primary" },
  challenge_declined: { icon: ThumbsDown, color: "text-destructive" },
  challenge_failed: { icon: ShieldOff, color: "text-destructive" },
  challenge_peril: { icon: Flame, color: "text-orange-400" },
  challenge_completed: { icon: Trophy, color: "text-primary" },
  boost_completed: { icon: Gift, color: "text-green-400" },
  referral_reward: { icon: Coins, color: "text-accent" },
  cheer: { icon: Flame, color: "text-orange-400" },
};

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, dateLocale } = useLocale();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const respondMutation = useRespondFriendRequestByUserId();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showAcceptOverlay, setShowAcceptOverlay] = useState(false);
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [animatingOutType, setAnimatingOutType] = useState<"accept" | "decline" | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [coinBurst, setCoinBurst] = useState<number | null>(null);
  
  useEffect(() => {
    markRead.mutate();
  }, []);

  const handleRespond = (notifId: string, fromUserId: string, accept: boolean) => {
    setRespondedIds(prev => new Set(prev).add(notifId));
    respondMutation.mutate(
      { senderUserId: fromUserId, accept },
      {
        onSuccess: (result: any) => {
          if (result?.alreadyHandled) {
            toast.info(t('notifications.alreadyHandled'));
          } else {
            toast.success(accept ? t('notifications.acceptedChallenge') : t('notifications.declined'));
          }
        },
        onError: () => {
          setRespondedIds(prev => {
            const next = new Set(prev);
            next.delete(notifId);
            return next;
          });
          toast.error(t('notifications.errorRetry'));
        },
      }
    );
  };

  const animateOut = (notifId: string, type: "accept" | "decline", callback: () => void) => {
    setAnimatingOutId(notifId);
    setAnimatingOutType(type);
    setTimeout(() => {
      setAnimatingOutId(null);
      setAnimatingOutType(null);
      setRespondedIds(prev => new Set(prev).add(notifId));
      callback();
    }, 450);
  };

  const handleAcceptSocialChallenge = async (notifId: string, socialChallengeId: string) => {
    setAcceptingId(notifId);
    try {
      const { data, error } = await supabase.functions.invoke("accept-boost-challenge", {
        body: { socialChallengeId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      animateOut(notifId, "accept", () => {
        setShowAcceptOverlay(true);
      });
    } catch (err: any) {
      toast.error(err?.message || t('friends.acceptError'));
      setAcceptingId(null);
    }
  };

  const handleDeclineSocialChallenge = async (notifId: string, socialChallengeId: string) => {
    setDecliningId(notifId);
    try {
      const { data, error } = await supabase.functions.invoke("decline-boost-challenge", {
        body: { socialChallengeId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      animateOut(notifId, "decline", () => {
        toast.info(data.refunded ? t('notifications.declinedRefund') : t('notifications.declinedChallenge'));
        refetch();
      });
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    } finally {
      setDecliningId(null);
    }
  };

  const handleClaimReferralReward = async (notifId: string) => {
    setClaimingId(notifId);
    try {
      const { data, error } = await supabase.functions.invoke("claim-referral-reward", {
        body: { notificationId: notifId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la récupération");

      if (data.alreadyClaimed) {
        toast.info(t('notifications.alreadyClaimed'));
        setRespondedIds((prev) => new Set(prev).add(notifId));
      } else {
        animateOut(notifId, "accept", () => {
          const coinsAwarded = Number(data.coinsAwarded ?? 0);
          setCoinBurst(coinsAwarded);
          setTimeout(() => setCoinBurst(null), 1300);
          toast.success(t('notifications.coinsAdded', { coins: coinsAwarded }));
          queryClient.invalidateQueries({ queryKey: ["user-coins"] });
          queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        });
      }
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    } finally {
      setClaimingId(null);
      refetch();
    }
  };

  const getCardAnimationClass = (notifId: string) => {
    if (animatingOutId !== notifId) return "";
    if (animatingOutType === "accept") return "animate-scale-fade-out";
    if (animatingOutType === "decline") return "animate-slide-out-left";
    return "";
  };

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">{t('notifications.title')}</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !notifications?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">🔔</span>
          <p className="text-muted-foreground text-sm">{t('notifications.none')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const cfg = typeConfig[notif.type] ?? typeConfig.cheer;
            const Icon = cfg.icon;
            const isFriendRequest = notif.type === "friend_request";
            const isSocialChallenge = notif.type === "social_challenge";
            const isReferralReward = notif.type === "referral_reward";
            const referralCoins = Number(notif.data?.coins ?? 250);
            const fromUserId = notif.data?.from_user_id;
            const socialChallengeId = notif.data?.socialChallengeId;
            const alreadyResponded = respondedIds.has(notif.id);
            const cardAnim = getCardAnimationClass(notif.id);

            if (alreadyResponded && !cardAnim) return null;

            return (
              <div
                key={notif.id}
                className={`bg-gradient-card rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                  !notif.read ? "border-primary/30" : "border-border"
                } ${cardAnim}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  )}
                </div>

                {/* Friend request actions */}
                {isFriendRequest && fromUserId && !alreadyResponded && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleRespond(notif.id, fromUserId, true)}
                      disabled={respondMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {t('notifications.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleRespond(notif.id, fromUserId, false)}
                      disabled={respondMutation.isPending}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {t('notifications.decline')}
                    </Button>
                  </div>
                )}
                {isFriendRequest && alreadyResponded && (
                  <p className="text-xs text-muted-foreground italic">{t('notifications.responded')}</p>
                )}

                {/* Social challenge actions */}
                {isSocialChallenge && socialChallengeId && !alreadyResponded && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-9 text-xs font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
                      onClick={() => handleAcceptSocialChallenge(notif.id, socialChallengeId)}
                      disabled={acceptingId === notif.id}
                    >
                      {acceptingId === notif.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Flame className="w-3.5 h-3.5 mr-1" />
                      )}
                      {t('friends.acceptChallenge')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs"
                      onClick={() => handleDeclineSocialChallenge(notif.id, socialChallengeId)}
                      disabled={decliningId === notif.id}
                    >
                      {decliningId === notif.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <X className="w-3.5 h-3.5 mr-1" />
                      )}
                      {t('notifications.decline')}
                    </Button>
                  </div>
                )}
                {isReferralReward && !alreadyResponded && (
                  <Button
                    size="sm"
                    className="h-9 text-xs font-display font-bold bg-gradient-gold text-accent-foreground hover:opacity-90 shadow-gold"
                    onClick={() => handleClaimReferralReward(notif.id)}
                    disabled={claimingId === notif.id}
                  >
                    {claimingId === notif.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <CoinIcon size={14} className="mr-1" />
                    )}
                    {t('notifications.claimCoins', { coins: referralCoins })}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {coinBurst !== null && (
        <div className="fixed left-1/2 top-20 -translate-x-1/2 z-50 pointer-events-none">
          <div className="animate-coin-float px-4 py-2 rounded-full bg-gradient-gold text-accent-foreground shadow-gold font-display font-bold text-sm inline-flex items-center gap-2">
            <CoinIcon size={16} /> +{coinBurst} {t('common.coins')}
          </div>
        </div>
      )}

      {showAcceptOverlay && (
        <ChallengeAcceptedOverlay onClose={() => setShowAcceptOverlay(false)} />
      )}

      <BottomNav />
    </div>
  );
};

export default Notifications;
