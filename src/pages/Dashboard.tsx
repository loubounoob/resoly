import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Flame, Camera, Plus, Loader2, Trophy, Settings } from "lucide-react";
import BuyCoinsDrawer from "@/components/BuyCoinsDrawer";
import CoinIcon from "@/components/CoinIcon";
import AnimatedCoinCounter from "@/components/AnimatedCoinCounter";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import AvatarUpload from "@/components/AvatarUpload";
import { useActiveChallenge, useCheckIns, useUserCoins, useRecentlyFailedChallenge, useAutoFailCheck } from "@/hooks/useChallenge";
import ChallengeFailedOverlay from "@/components/ChallengeFailedOverlay";
import ChallengeVictoryOverlay from "@/components/ChallengeVictoryOverlay";
import ChallengeAcceptedOverlay from "@/components/ChallengeAcceptedOverlay";
import { useMyProfile } from "@/hooks/useFriends";
import { calculateCoins, getPromoMultiplier } from "@/lib/coins";
import { startOfWeek, endOfWeek, isWithinInterval, getDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { useGymProximity } from "@/hooks/useGymProximity";
import StoriesBar from "@/components/StoriesBar";
import { useLocale } from "@/contexts/LocaleContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, formatCurrency, currency } = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [showFailedOverlay, setShowFailedOverlay] = useState(false);
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [showAcceptedOverlay, setShowAcceptedOverlay] = useState(false);

  useEffect(() => {
    if ((location.state as any)?.challengeJustCreated) {
      setShowAcceptedOverlay(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const { data: challenge, isLoading: loadingChallenge } = useActiveChallenge();
  const { data: checkIns } = useCheckIns(challenge?.id);
  const { data: coins } = useUserCoins();
  const { data: myProfile } = useMyProfile();
  const { data: failedChallenge } = useRecentlyFailedChallenge();

  useAutoFailCheck(challenge, checkIns);

  useEffect(() => {
    if (!loadingChallenge && !challenge && failedChallenge) {
      const seenKey = `failed-overlay-seen-${failedChallenge.id}`;
      if (!localStorage.getItem(seenKey)) {
        setShowFailedOverlay(true);
      }
    }
  }, [loadingChallenge, challenge, failedChallenge]);

  useGymProximity({
    gymLatitude: (myProfile as any)?.gym_latitude ?? null,
    gymLongitude: (myProfile as any)?.gym_longitude ?? null,
    hasActiveChallenge: !!challenge,
  });

  if (loadingChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const headerBlock = (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setAvatarDialogOpen(true)} className="relative group">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={myProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-xs font-bold">
                {(myProfile?.display_name || myProfile?.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <div>
            <span className="font-display font-bold text-xl">Resoly</span>
            {myProfile?.username && (
              <p className="text-xs text-muted-foreground">@{myProfile.username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setBuyCoinsOpen(true)}
            className="relative flex items-center bg-secondary rounded-full px-3 py-1.5 hover:bg-secondary/80 transition-colors"
          >
            <AnimatedCoinCounter value={coins ?? 0} />
          </button>
        </div>
      </div>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{t('dashboard.profilePhoto')}</DialogTitle>
          </DialogHeader>
          <AvatarUpload
            currentUrl={myProfile?.avatar_url}
            size="lg"
            onUploaded={() => setAvatarDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <BuyCoinsDrawer
        open={buyCoinsOpen}
        onOpenChange={setBuyCoinsOpen}
        inviteCode={myProfile?.invite_code}
      />
    </>
  );

  if (!challenge) {
    return (
      <div className="min-h-full flex flex-col px-6 pt-6 pb-24 h-full overflow-hidden">
        {headerBlock}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-3">
            <Flame className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-2xl font-display font-bold">{t('dashboard.noChallenge')}</h2>
            <p className="text-muted-foreground text-sm">{t('dashboard.noChallengeSub')}</p>
          </div>
          <Button
            onClick={() => navigate("/onboarding-challenge")}
            className="h-14 px-8 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('dashboard.createChallenge')}
          </Button>
        </div>
        {showFailedOverlay && failedChallenge && (
          <ChallengeFailedOverlay
            betLost={failedChallenge.bet_per_month}
            onClose={() => {
              localStorage.setItem(`failed-overlay-seen-${failedChallenge.id}`, "1");
              setShowFailedOverlay(false);
            }}
          />
        )}
        <BottomNav />
      </div>
    );
  }

  const verifiedCheckIns = checkIns?.filter(c => c.verified) ?? [];
  const completedSessions = verifiedCheckIns.length;
  const totalSessions = challenge.total_sessions;
  const isChallengeComplete = completedSessions >= totalSessions && totalSessions > 0;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekCheckIns = verifiedCheckIns.filter(ci =>
    isWithinInterval(new Date(ci.checked_in_at), { start: weekStart, end: weekEnd })
  );
  const checkedDays = new Set(thisWeekCheckIns.map(ci => new Date(ci.checked_in_at).getDay()));
  const weeklyDone = checkedDays.size;

  const challengeStartDate = new Date(challenge.started_at);
  const challengeWeekStart = startOfWeek(challengeStartDate, { weekStartsOn: 1 });
  const isFirstWeek = weekStart.getTime() === challengeWeekStart.getTime();
  const firstWeekSessions = (challenge as any).first_week_sessions as number | null;
  const weeklyGoal = isFirstWeek && firstWeekSessions != null
    ? firstWeekSessions
    : challenge.sessions_per_week;

  const weeklyProgress = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : 0;

  const isGoalMet = weeklyDone >= weeklyGoal;
  const sessionsRemaining = weeklyGoal - weeklyDone;
  const dayOfWeek = getDay(now);
  const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;
  const isUrgent = !isGoalMet && sessionsRemaining >= daysLeftInWeek;

  const ringColors = isGoalMet
    ? { start: "hsl(82, 85%, 55%)", end: "hsl(82, 85%, 40%)" }
    : isUrgent
    ? { start: "hsl(0, 85%, 55%)", end: "hsl(0, 70%, 45%)" }
    : { start: "hsl(35, 95%, 55%)", end: "hsl(25, 90%, 45%)" };

  const weekStatus = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = i === 6 ? 0 : i + 1;
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    if (dayDate > now) return null;
    return checkedDays.has(dayIndex) ? true : false;
  });

  const remaining = weeklyGoal - weeklyDone;
  const motivationMessage =
    weeklyDone === 0
      ? t('dashboard.motivStart')
      : weeklyDone >= weeklyGoal
      ? t('dashboard.motivDone')
      : t('dashboard.motivRemaining', { remaining });

  const totalBet = challenge.bet_per_month;
  const promoMult = getPromoMultiplier(challenge.promo_code ?? undefined);
  const coinsToEarn = Math.round(calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week, currency) * promoMult);

  const weekDayLabels = t('dashboard.weekDays') as unknown as string[];

  return (
    <div className="min-h-full flex flex-col px-6 pt-6 pb-24 overflow-y-auto">
      {headerBlock}

      <button
        onClick={() => !isGoalMet && navigate("/verify")}
        className={`flex flex-col items-center mb-6 group ${!isGoalMet ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className={`relative w-44 h-44 transition-transform duration-200 ${!isGoalMet ? "group-hover:scale-105 group-active:scale-95" : ""}`}>
          {isUrgent && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-10" style={{ background: ringColors.start }} />
          )}
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(220, 15%, 18%)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - weeklyProgress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={ringColors.start} />
                <stop offset="100%" stopColor={ringColors.end} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <span className="text-4xl font-display font-bold">{weeklyDone}/{weeklyGoal}</span>
            <span className="text-xs text-muted-foreground">{t('dashboard.thisWeek')}</span>
            {!isGoalMet && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">{t('dashboard.checkIn')}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm font-medium mt-3 text-center">{motivationMessage}</p>
      </button>

      {isFirstWeek && firstWeekSessions != null && (
        <div className="bg-accent/20 border border-accent/30 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: t('dashboard.firstWeekBanner', { sessions: firstWeekSessions }).replace(String(firstWeekSessions), `<span class="font-bold text-primary">${firstWeekSessions}</span>`) }} />
          <p className="text-[11px] text-muted-foreground mt-0.5">{t('dashboard.firstWeekNormal', { sessions: challenge.sessions_per_week })}</p>
        </div>
      )}

      {(() => {
        const challengeEnd = new Date(challenge.started_at);
        challengeEnd.setMonth(challengeEnd.getMonth() + challenge.duration_months);
        const msLeft = challengeEnd.getTime() - now.getTime();
        const weeksRemaining = Math.max(0, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)));
        return weeksRemaining > 0 ? (
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('dashboard.weeksRemaining', { count: weeksRemaining }).replace(String(weeksRemaining), `<span class="font-semibold">${weeksRemaining}</span>`) }} />
          </div>
        ) : null;
      })()}

      <div className="bg-gradient-card rounded-2xl border border-border p-4 mb-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{t('dashboard.yourWeek')}</span>
          <span className="text-xs text-muted-foreground">{weeklyDone}/{weeklyGoal} {t('common.sessions')}</span>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekDayLabels.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{day}</span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  weekStatus[i] === true
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : weekStatus[i] === false
                    ? "bg-destructive/20 text-destructive"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {weekStatus[i] === true ? "✓" : weekStatus[i] === false ? "✗" : "·"}
              </div>
            </div>
          ))}
        </div>
        <Progress value={weeklyProgress} className="h-2" />
      </div>

      <StoriesBar />

      {isChallengeComplete ? (
        <button
          onClick={() => setShowVictoryOverlay(true)}
          className="relative overflow-hidden rounded-2xl border-2 border-amber-500/50 p-5 shadow-gold mb-4 bg-gradient-to-br from-amber-950/40 via-yellow-900/20 to-amber-950/40 animate-shimmer-gold transition-transform active:scale-95 text-left w-full"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4 z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/40 to-yellow-500/30 flex items-center justify-center shadow-lg border border-amber-500/30">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-display font-bold tracking-tight text-gradient-gold">{t('dashboard.betWon', { amount: formatCurrency(totalBet) })}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                <CoinIcon size={13} />
                <span className="text-xs font-display font-bold text-amber-400">+{coinsToEarn}</span>
                <span className="text-[10px] text-muted-foreground">{t('common.bonus')}</span>
              </div>
              <p className="text-xs text-amber-300/60 animate-pulse">{t('dashboard.tapToClaim')}</p>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card mb-4 bg-gradient-to-br from-secondary via-secondary/80 to-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shadow-lg border border-primary/20">
              <span className="text-2xl">💰</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-display font-bold tracking-tight">{formatCurrency(totalBet)}</span>
                <span className="text-xs text-muted-foreground font-medium">{t('dashboard.atStake')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('dashboard.holdOn')}</p>
              <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-2.5 py-0.5">
                <CoinIcon size={13} />
                <span className="text-xs font-display font-bold text-accent">+{coinsToEarn}</span>
                <span className="text-[10px] text-muted-foreground">{t('common.bonus')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVictoryOverlay && (
        <ChallengeVictoryOverlay
          betAmount={totalBet}
          coinsEarned={coinsToEarn}
          challengeId={challenge.id}
          isBoosted={!!challenge.social_challenge_id}
          onClose={() => setShowVictoryOverlay(false)}
        />
      )}

      {showAcceptedOverlay && (
        <ChallengeAcceptedOverlay onClose={() => setShowAcceptedOverlay(false)} />
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
