import { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, UserCheck, Swords, Flame, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import { useRespondFriendRequestByUserId } from "@/hooks/useFriends";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const typeConfig: Record<string, { icon: typeof UserPlus; color: string }> = {
  friend_request: { icon: UserPlus, color: "text-blue-400" },
  friend_accepted: { icon: UserCheck, color: "text-green-400" },
  challenge_invite: { icon: Swords, color: "text-purple-400" },
  cheer: { icon: Flame, color: "text-orange-400" },
};

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const respondMutation = useRespondFriendRequestByUserId();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    markRead.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRespond = (notifId: string, fromUserId: string, accept: boolean) => {
    setRespondedIds(prev => new Set(prev).add(notifId));
    respondMutation.mutate(
      { senderUserId: fromUserId, accept },
      {
        onSuccess: (result: any) => {
          if (result?.alreadyHandled) {
            toast.info("Cette demande a déjà été traitée");
          } else {
            toast.success(accept ? "Demande acceptée ! 🎉" : "Demande refusée");
          }
        },
        onError: () => {
          setRespondedIds(prev => {
            const next = new Set(prev);
            next.delete(notifId);
            return next;
          });
          toast.error("Erreur, réessaie");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">Notifications</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !notifications?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-4xl mb-3">🔔</span>
          <p className="text-muted-foreground text-sm">Aucune notification pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const cfg = typeConfig[notif.type] ?? typeConfig.cheer;
            const Icon = cfg.icon;
            const isFriendRequest = notif.type === "friend_request";
            const fromUserId = notif.data?.from_user_id;
            const alreadyResponded = respondedIds.has(notif.id);

            return (
              <div
                key={notif.id}
                className={`bg-gradient-card rounded-xl border p-4 flex items-start gap-3 transition-all ${
                  !notif.read ? "border-primary/30" : "border-border"
                }`}
              >
                <div className={`mt-0.5 ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                  </p>

                  {isFriendRequest && fromUserId && !alreadyResponded && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleRespond(notif.id, fromUserId, true)}
                        disabled={respondMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handleRespond(notif.id, fromUserId, false)}
                        disabled={respondMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  )}
                  {isFriendRequest && alreadyResponded && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Répondu ✓</p>
                  )}
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Notifications;
