import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Flame, Search, Copy, Check, X, Loader2, UserPlus, Swords, Gift, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import BottomNav from "@/components/BottomNav";
import MiniProgressRing from "@/components/MiniProgressRing";
import CoinIcon from "@/components/CoinIcon";
import { useFriendsActivity, useFriendRequests, useSendFriendRequest, useRespondFriendRequest, useSearchUsers, useMyProfile, useFriendshipsRealtime } from "@/hooks/useFriends";
import { useReceivedSocialChallenges, useAcceptSocialChallenge } from "@/hooks/useSocialChallenges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Friends = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [ibanValue, setIbanValue] = useState("");

  useFriendshipsRealtime();
  const { data: activity, isLoading: loadingActivity } = useFriendsActivity();
  const { data: requests } = useFriendRequests();
  const { data: receivedChallenges } = useReceivedSocialChallenges();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const { data: myProfile } = useMyProfile();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const acceptChallenge = useAcceptSocialChallenge();

  const getInitials = (profile: any) => {
    const name = profile?.username || "?";
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
    if (sc.type === "boost" && !ibanValue.trim()) {
      toast.error("Entre ton IBAN pour recevoir ta récompense");
      return;
    }
    setAcceptingId(sc.id);
    try {
      // For boost challenges, recipient doesn't pay — use dedicated function
      const { data, error } = await supabase.functions.invoke("accept-boost-challenge", {
        body: {
          socialChallengeId: sc.id,
          iban: ibanValue.trim() || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");

      toast.success("Défi accepté ! C'est parti 🔥");
      setIbanValue("");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'acceptation");
      setAcceptingId(null);
    }
  };

  const pendingCount = requests?.length ?? 0;
  const receivedCount = receivedChallenges?.length ?? 0;

  // Compute challenge details for the selected friend
  const friendChallenge = selectedFriend?.challenge;
  const totalDone = selectedFriend?.challenge
    ? undefined // we'll compute from check-ins data if available
    : 0;

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
                    {req.profile?.username || "Inconnu"}
                  </p>
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
                      {sc.creatorProfile?.username || "Quelqu'un"} t'offre un défi !
                    </p>
                    <p className="text-xs text-muted-foreground">
                      🎁 {sc.bet_amount}€ · {sc.sessions_per_week}x/sem · {sc.duration_months} mois
                    </p>
                  </div>
                </div>

                {/* IBAN input for boost challenges */}
                {sc.type === "boost" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      Ton IBAN (pour recevoir ta récompense)
                    </label>
                    <input
                      type="text"
                      value={ibanValue}
                      onChange={(e) => setIbanValue(e.target.value.toUpperCase())}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      className="w-full h-10 rounded-xl border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>
                )}

                <Button
                  onClick={() => handleAcceptChallenge(sc)}
                  disabled={acceptingId === sc.id}
                  className="w-full h-12 font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
                >
                  {acceptingId === sc.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
                  Accepter le défi
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
                <button
                  key={friend.userId}
                  onClick={() => setSelectedFriend(friend)}
                  className="w-full bg-gradient-card rounded-2xl border border-border p-4 shadow-card flex items-center gap-3 text-left transition-all hover:border-primary/30 active:scale-[0.98]"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.profile?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs font-bold">
                      {getInitials(friend.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {friend.profile?.username || "Ami"}
                    </p>
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
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
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
          Offrir un défi
        </Button>
      </section>

      {/* Friend Detail Drawer */}
      <Drawer open={!!selectedFriend} onOpenChange={(open) => { if (!open) setSelectedFriend(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedFriend?.profile?.avatar_url} />
                <AvatarFallback className="bg-secondary text-xs font-bold">
                  {getInitials(selectedFriend?.profile)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedFriend?.profile?.username || "Ami"}</span>
            </DrawerTitle>
            <DrawerDescription>
              {selectedFriend?.hasChallenge ? "Détails du défi actif" : "Aucun défi actif"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {selectedFriend?.hasChallenge && selectedFriend?.challenge ? (
              (() => {
                const f = selectedFriend;
                const weeklyProgress = f.weeklyGoal > 0 ? Math.min(100, Math.round((f.weeklyDone / f.weeklyGoal) * 100)) : 0;
                const ringColors = f.isGoalMet
                  ? { start: "hsl(82, 85%, 55%)", end: "hsl(82, 85%, 40%)" }
                  : f.isUrgent
                  ? { start: "hsl(0, 85%, 55%)", end: "hsl(0, 70%, 45%)" }
                  : { start: "hsl(35, 95%, 55%)", end: "hsl(25, 90%, 45%)" };
                const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];
                const motivationMessage = f.weeklyDone >= f.weeklyGoal
                  ? "Objectif de la semaine atteint ! 🎉"
                  : `🔥 ${f.weeklyGoal - f.weeklyDone} séance(s) restante(s)`;

                return (
                  <div className="space-y-4">
                    {/* First week banner */}
                    {f.isFirstWeek && (
                      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-2 text-center">
                        <span className="text-xs font-medium text-accent">⭐ Première semaine — objectif adapté</span>
                      </div>
                    )}
                    {/* Progress ring */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(220, 15%, 18%)" strokeWidth="8" />
                          <circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke={`url(#friendRingGrad)`}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 52}`}
                            strokeDashoffset={`${2 * Math.PI * 52 * (1 - weeklyProgress / 100)}`}
                            className="transition-all duration-700"
                          />
                          <defs>
                            <linearGradient id="friendRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={ringColors.start} />
                              <stop offset="100%" stopColor={ringColors.end} />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-display font-bold">{f.weeklyDone}/{f.weeklyGoal}</span>
                          <span className="text-[10px] text-muted-foreground">cette semaine</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-2">{motivationMessage}</p>
                    </div>

                    {/* Weeks remaining */}
                    {f.weeksRemaining > 0 && (
                      <p className="text-center text-xs text-muted-foreground">
                        ⏳ <span className="font-semibold">{f.weeksRemaining} semaine{f.weeksRemaining > 1 ? "s" : ""}</span> restante{f.weeksRemaining > 1 ? "s" : ""} pour remporter le défi
                      </p>
                    )}

                    {/* Week tracker */}
                    {f.weekStatus && (
                      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">🗓️ Sa semaine</span>
                          <span className="text-xs text-muted-foreground">{f.weeklyDone}/{f.weeklyGoal} séances</span>
                        </div>
                        <div className="grid grid-cols-7 gap-2 mb-3">
                          {weekDayLabels.map((day, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">{day}</span>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                f.weekStatus[i] === true
                                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                  : f.weekStatus[i] === false
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-secondary text-muted-foreground"
                              }`}>
                                {f.weekStatus[i] === true ? "✓" : f.weekStatus[i] === false ? "✗" : "·"}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Progress value={weeklyProgress} className="h-2" />
                      </div>
                    )}

                    {/* Bet & stats */}
                    <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl">💰</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xl font-display font-bold">{f.challenge.bet_per_month}€</span>
                        <p className="text-xs text-muted-foreground">
                          {f.challenge.sessions_per_week}x/sem · {f.challenge.duration_months} mois
                        </p>
                      </div>
                    </div>

                    {/* Coins */}
                    <div className="bg-gradient-card rounded-2xl border border-border p-3 shadow-card flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Pièces gagnées</span>
                      <span className="font-display font-bold text-gradient-gold inline-flex items-center gap-1">
                        <CoinIcon size={16} /> {f.challenge.coins_awarded}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Cet ami n'a pas de défi actif</p>
                <Button
                  onClick={() => {
                    setSelectedFriend(null);
                    navigate("/friends/create-social?type=boost");
                  }}
                  className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-glow"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Lui offrir un défi
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
                       {(u.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.username || "?"}</p>
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
