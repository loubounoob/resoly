import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Flame, Search, Copy, Check, X, Trophy, Loader2, UserPlus, Swords, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import BottomNav from "@/components/BottomNav";
import MiniProgressRing from "@/components/MiniProgressRing";
import { useFriendsActivity, useFriendRequests, useSendFriendRequest, useRespondFriendRequest, useSearchUsers, useMyProfile, useLeaderboard } from "@/hooks/useFriends";
import { useSocialChallenges, useReceivedSocialChallenges, useAcceptSocialChallenge } from "@/hooks/useSocialChallenges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Friends = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: activity, isLoading: loadingActivity } = useFriendsActivity();
  const { data: requests } = useFriendRequests();
  const { data: socialChallenges } = useSocialChallenges();
  const { data: receivedChallenges } = useReceivedSocialChallenges();
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const { data: myProfile } = useMyProfile();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const acceptChallenge = useAcceptSocialChallenge();

  const getInitials = (profile: any) => {
    const name = profile?.display_name || profile?.first_name || "?";
    return name.charAt(0).toUpperCase();
  };

  const getStatusInfo = (friend: any) => {
    if (!friend.hasChallenge) return { text: "Pas de défi actif", color: "text-muted-foreground" };
    if (friend.isGoalMet) return { text: "Défi réussi ✅", color: "text-primary" };
    if (friend.isUrgent) return { text: "Dernière chance aujourd'hui", color: "text-destructive" };
    return { text: `${friend.weeklyDone}/${friend.weeklyGoal} cette semaine`, color: "text-accent" };
  };

  const handleCopyInvite = () => {
    if (myProfile?.invite_code) {
      const link = `${window.location.origin}/auth?invite=${(myProfile as any).invite_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Lien d'invitation copié !");
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendRequest.mutateAsync(userId);
      toast.success("Demande envoyée !");
      setSearchQuery("");
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleAcceptChallenge = async (sc: any) => {
    setAcceptingId(sc.id);
    try {
      const member = await acceptChallenge.mutateAsync({
        socialChallengeId: sc.id,
        betAmount: sc.bet_amount,
      });

      // Redirect to Stripe
      const { data, error } = await supabase.functions.invoke("create-challenge-payment", {
        body: {
          socialChallengeId: sc.id,
          memberId: member.id,
          amount: sc.bet_amount,
          description: `Mise Resoly Social — ${sc.bet_amount}€ — ${sc.type} ${sc.sessions_per_week}x/sem pendant ${sc.duration_months} mois`,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("Code promo appliqué ! Défi accepté 🎉");
        navigate("/friends");
      } else if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL");
      }
    } catch {
      toast.error("Erreur lors de l'acceptation");
      setAcceptingId(null);
    }
  };

  const pendingCount = requests?.length ?? 0;
  const receivedCount = receivedChallenges?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Amis</h1>
          {(pendingCount + receivedCount) > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
              {pendingCount + receivedCount}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Section 0: Pending friend requests */}
      {pendingCount > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            Demandes en attente
            <Badge variant="secondary" className="text-[10px] ml-1">{pendingCount}</Badge>
          </h2>
          <div className="space-y-2">
            {requests!.map((req: any) => (
              <div key={req.id} className="flex items-center gap-3 p-3 rounded-2xl border border-primary/20 bg-primary/5 shadow-card">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={req.profile?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-xs font-bold">
                    {getInitials(req.profile)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {req.profile?.display_name || req.profile?.first_name || "Inconnu"}
                  </p>
                  {req.profile?.username && (
                    <p className="text-[11px] text-muted-foreground">@{req.profile.username}</p>
                  )}
                </div>
                <button
                  onClick={() => respondRequest.mutate({ id: req.id, accept: true, senderUserId: req.profile?.user_id })}
                  className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => respondRequest.mutate({ id: req.id, accept: false })}
                  className="p-2 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 0b: Received social challenges */}
      {receivedCount > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-accent" />
            Défis reçus
            <Badge variant="secondary" className="text-[10px] ml-1">{receivedCount}</Badge>
          </h2>
          <div className="space-y-2">
            {receivedChallenges!.map((sc: any) => (
              <div key={sc.id} className="p-4 rounded-2xl border border-accent/20 bg-accent/5 shadow-card space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={sc.creatorProfile?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {getInitials(sc.creatorProfile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sc.creatorProfile?.display_name || sc.creatorProfile?.first_name || "Quelqu'un"} t'a défié !
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sc.type === "duel" ? "🥊 Duel" : sc.type === "boost" ? "🤝 Boost" : "👥 Groupe"} · {sc.bet_amount}€ · {sc.sessions_per_week}x/sem · {sc.duration_months} mois
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAcceptChallenge(sc)}
                  disabled={acceptingId === sc.id}
                  className="w-full h-12 font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
                >
                  {acceptingId === sc.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
                  Accepter et payer {sc.bet_amount}€
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 1: Fil d'activité */}
      <section className="mb-6">
        <h2 className="text-sm text-muted-foreground mb-3">Fil d'activité</h2>
        {loadingActivity ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="bg-gradient-card rounded-2xl border border-border p-6 text-center shadow-card">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Ajoute des amis pour voir leur activité</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((friend: any) => {
              const status = getStatusInfo(friend);
              return (
                <div key={friend.userId} className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.profile?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {getInitials(friend.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {friend.profile?.display_name || friend.profile?.first_name || "Ami"}
                    </p>
                    {friend.profile?.username && (
                      <p className="text-[11px] text-muted-foreground">@{friend.profile.username}</p>
                    )}
                    <p className={`text-xs ${status.color}`}>{status.text}</p>
                  </div>
                  {friend.hasChallenge && (
                    <MiniProgressRing
                      done={friend.weeklyDone}
                      goal={friend.weeklyGoal}
                      isGoalMet={friend.isGoalMet}
                      isUrgent={friend.isUrgent}
                    />
                  )}
                  <button className="text-muted-foreground hover:text-accent transition-colors p-1">
                    <Flame className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Offrir un défi button */}
        <Button
          onClick={() => navigate("/friends/create-social?type=boost")}
          className="w-full h-12 mt-4 font-display font-bold bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 rounded-xl"
        >
          <Gift className="w-4 h-4 mr-2" />
          Offrir un défi à un ami
        </Button>
      </section>

      {/* Section 2: Défis sociaux */}
      <section className="mb-6">
        <h2 className="text-sm text-muted-foreground mb-3">Défis sociaux</h2>
        {socialChallenges && socialChallenges.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {socialChallenges.map((sc: any) => (
              <div key={sc.id} className="flex-shrink-0 w-[200px] bg-gradient-card rounded-2xl border border-border p-4 shadow-card">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {sc.type === "duel" ? "🥊 Duel" : sc.type === "boost" ? "🤝 Boost" : "👥 Groupe"}
                  </span>
                </div>
                <div className="flex -space-x-2 mb-2">
                  {sc.members?.slice(0, 4).map((m: any) => (
                    <Avatar key={m.user_id} className="w-7 h-7 border-2 border-background">
                      <AvatarImage src={m.profile?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {getInitials(m.profile)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sc.sessions_per_week}x/sem · {sc.duration_months} mois · {sc.bet_amount}€
                </p>
                <span className={`text-[10px] font-medium ${sc.status === "active" ? "text-primary" : "text-accent"}`}>
                  {sc.status === "active" ? "En cours" : "En attente"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Aucun défi social en cours</p>
        )}
      </section>

      {/* Section 3: Classement */}
      <section>
        <h2 className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Classement du cercle
        </h2>
        {loadingLeaderboard ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center">Pas encore de données</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry: any, i: number) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  entry.isMe ? "border-primary/30 bg-primary/5" : "border-border bg-gradient-card"
                }`}
              >
                <span className="text-sm font-bold w-6 text-center text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={entry.profile?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-secondary">
                    {getInitials(entry.profile)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.isMe ? "Toi" : entry.profile?.display_name || entry.profile?.first_name || "—"}
                  </p>
                  {entry.profile?.username && (
                    <p className="text-[10px] text-muted-foreground">@{entry.profile.username}</p>
                   )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{entry.totalSessions}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.activeWeeks} sem.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Friend Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ajouter des amis</DrawerTitle>
            <DrawerDescription>Recherche par pseudo ou partage ton lien</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un pseudo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((u: any) => (
                  <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-gradient-card">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {(u.display_name || u.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.display_name || u.username}</p>
                      {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendRequest(u.user_id)}
                      disabled={sendRequest.isPending}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={handleCopyInvite}>
              <Copy className="w-4 h-4 mr-2" />
              Partager mon lien d'invitation
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
};

export default Friends;
