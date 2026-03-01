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
import { useLocale } from "@/contexts/LocaleContext";

const Friends = () => {
  const navigate = useNavigate();
  const { t, formatCurrency } = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  useFriendshipsRealtime();
  const { data: activity, isLoading: loadingActivity } = useFriendsActivity();
  const { data: requests } = useFriendRequests();
  const { data: receivedChallenges } = useReceivedSocialChallenges();
  const { data: searchResults } = useSearchUsers(searchQuery);
  const { data: myProfile } = useMyProfile();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();

  const getInitials = (profile: any) => {
    const name = profile?.username || "?";
    return name.charAt(0).toUpperCase();
  };

  const getStatusInfo = (friend: any) => {
    if (!friend.hasChallenge || friend.weeklyGoal === 0) return { text: t('friends.noActiveChallenge'), color: "text-muted-foreground" };
    if (friend.isGoalMet) return { text: t('friends.challengeSuccess'), color: "text-primary" };
    if (friend.isUrgent) return { text: t('friends.lastChance'), color: "text-destructive" };
    return { text: t('friends.thisWeek', { done: friend.weeklyDone, goal: friend.weeklyGoal }), color: "text-accent" };
  };

  const handleCopyInvite = () => {
    if (myProfile?.invite_code) {
      navigator.clipboard.writeText((myProfile as any).invite_code);
      toast.success(t('friends.referralCopied'));
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendRequest.mutateAsync(userId);
      toast.success(t('friends.requestSent'));
      setSearchQuery("");
    } catch {
      toast.error(t('friends.sendError'));
    }
  };

  const handleAcceptChallenge = async (sc: any) => {
    setAcceptingId(sc.id);
    try {
      const { data, error } = await supabase.functions.invoke("accept-boost-challenge", {
        body: { socialChallengeId: sc.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");

      toast.success(t('friends.challengeAccepted'));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || t('friends.acceptError'));
      setAcceptingId(null);
    }
  };

  const pendingCount = requests?.length ?? 0;
  const receivedCount = receivedChallenges?.length ?? 0;

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">{t('friends.title')}</h1>
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

      {pendingCount > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            {t('friends.pendingRequests')}
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
                    {req.profile?.username || t('friends.unknown')}
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

      {receivedCount > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-accent" />
            {t('friends.receivedChallenges')}
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
                      {t('friends.offersChallenge', { name: sc.creatorProfile?.username || t('friends.someone') })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      🎁 {formatCurrency(sc.bet_amount)} · {sc.sessions_per_week}x/{t('common.week')} · {sc.duration_months} {t('common.months')}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleAcceptChallenge(sc)}
                  disabled={acceptingId === sc.id}
                  className="w-full h-12 font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
                >
                  {acceptingId === sc.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flame className="w-4 h-4 mr-2" />}
                  {t('friends.acceptChallenge')}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm text-muted-foreground mb-3">{t('friends.activityFeed')}</h2>
        {loadingActivity ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="bg-gradient-card rounded-2xl border border-border p-6 text-center shadow-card">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('friends.noActivity')}</p>
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
                      {friend.profile?.username || t('friends.friend')}
                    </p>
                    <p className={`text-xs ${status.color}`}>{status.text}</p>
                  </div>
                  {friend.hasChallenge && friend.weeklyGoal > 0 && (
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

        <Button
          onClick={() => navigate("/friends/create-social?type=boost")}
          className="w-full h-12 mt-4 font-display font-bold bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 rounded-xl"
        >
          <Gift className="w-4 h-4 mr-2" />
          {t('friends.giftChallenge')}
        </Button>
      </section>

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
              <span>{selectedFriend?.profile?.username || t('friends.friend')}</span>
            </DrawerTitle>
            <DrawerDescription>
              {selectedFriend?.hasChallenge ? t('friends.friendDetail') : t('friends.noActiveDetail')}
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
                const weekDayLabels = t('dashboard.weekDays') as unknown as string[];
                const motivationMessage = f.weeklyDone >= f.weeklyGoal
                  ? t('friends.weekGoalDone')
                  : t('friends.sessionsRemaining', { count: f.weeklyGoal - f.weeklyDone });

                return (
                  <div className="space-y-4">
                    {f.isFirstWeek && (
                      <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-2 text-center">
                        <span className="text-xs font-medium text-accent">{t('friends.firstWeekAdapted')}</span>
                      </div>
                    )}
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
                          <span className="text-[10px] text-muted-foreground">{t('dashboard.thisWeek')}</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-2">{motivationMessage}</p>
                    </div>

                    {f.weeksRemaining > 0 && (
                      <p className="text-center text-xs text-muted-foreground" dangerouslySetInnerHTML={{ 
                        __html: t('friends.weeksRemainingFriend', { count: f.weeksRemaining }).replace(String(f.weeksRemaining), `<span class="font-semibold">${f.weeksRemaining}</span>`)
                      }} />
                    )}

                    {f.weekStatus && (
                      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">{t('friends.hisWeek')}</span>
                          <span className="text-xs text-muted-foreground">{f.weeklyDone}/{f.weeklyGoal} {t('common.sessions')}</span>
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

                    <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl">💰</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-xl font-display font-bold">{formatCurrency(f.challenge.bet_per_month)}</span>
                        <p className="text-xs text-muted-foreground">
                          {f.challenge.sessions_per_week}x/{t('common.week')} · {f.challenge.duration_months} {t('common.months')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-card rounded-2xl border border-border p-3 shadow-card flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('friends.coinsEarned')}</span>
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
                <p className="text-muted-foreground">{t('friends.noChallengeFriend')}</p>
                <Button
                  onClick={() => {
                    setSelectedFriend(null);
                    navigate("/friends/create-social?type=boost");
                  }}
                  className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-glow"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {t('friends.giftToFriend')}
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('friends.addFriends')}</DrawerTitle>
            <DrawerDescription>{t('friends.searchByPseudo')}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('friends.searchPlaceholder')}
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
              {t('friends.copyReferral')}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
};

export default Friends;
