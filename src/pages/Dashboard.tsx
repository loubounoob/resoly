import { useState } from "react";
import { toast } from "sonner";
import { Flame, Camera, Plus, Loader2 } from "lucide-react";
import BuyCoinsDrawer from "@/components/BuyCoinsDrawer";
import CoinIcon from "@/components/CoinIcon";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import AvatarUpload from "@/components/AvatarUpload";
import { useActiveChallenge, useCheckIns, useUserCoins } from "@/hooks/useChallenge";
import { useMyProfile } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { calculateCoins } from "@/lib/coins";
import { startOfWeek, endOfWeek, isWithinInterval, format, startOfDay, getDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { useGymProximity } from "@/hooks/useGymProximity";

const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const { data: challenge, isLoading: loadingChallenge } = useActiveChallenge();
  const { data: checkIns, isLoading: loadingCheckIns } = useCheckIns(challenge?.id);
  const { data: coins } = useUserCoins();
  const { data: myProfile } = useMyProfile();

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

  // Header component reused in both states
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
            onClick={() => setBuyCoinsOpen(true)}
            className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 hover:bg-secondary/80 transition-colors"
          >
            <CoinIcon size={14} />
            <span className="text-sm font-bold">{coins ?? 0}</span>
          </button>
        </div>
      </div>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Photo de profil</DialogTitle>
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
      <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
        {headerBlock}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center space-y-3">
            <Flame className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-2xl font-display font-bold">Aucun défi actif</h2>
            <p className="text-muted-foreground text-sm">Crée ton premier défi fitness et commence à gagner des pièces !</p>
          </div>
          <Button
            onClick={() => navigate("/create")}
            className="h-14 px-8 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer un défi
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const verifiedCheckIns = checkIns?.filter(c => c.verified) ?? [];
  const completedSessions = verifiedCheckIns.length;
  const totalSessions = challenge.total_sessions;
  const isChallengeComplete = completedSessions >= totalSessions && totalSessions > 0;

  // Week tracker
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekCheckIns = verifiedCheckIns.filter(ci =>
    isWithinInterval(new Date(ci.checked_in_at), { start: weekStart, end: weekEnd })
  );
  const checkedDays = new Set(thisWeekCheckIns.map(ci => new Date(ci.checked_in_at).getDay()));
  const weeklyDone = checkedDays.size; // count unique days, not total check-ins

  // First week adjustment: detect if we're in the first week of the challenge
  const challengeStartDate = new Date(challenge.started_at);
  const challengeWeekStart = startOfWeek(challengeStartDate, { weekStartsOn: 1 });
  const isFirstWeek = weekStart.getTime() === challengeWeekStart.getTime();
  const firstWeekSessions = (challenge as any).first_week_sessions as number | null;
  const weeklyGoal = isFirstWeek && firstWeekSessions != null
    ? firstWeekSessions
    : challenge.sessions_per_week;

  const weeklyProgress = weeklyGoal > 0 ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : 0;

  // Dynamic ring color logic
  const isGoalMet = weeklyDone >= weeklyGoal;
  const sessionsRemaining = weeklyGoal - weeklyDone;
  const dayOfWeek = getDay(now); // 0=Sun, 1=Mon...
  const daysLeftInWeek = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1; // days left including today, week ends Sunday
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

  // Motivation message
  const remaining = weeklyGoal - weeklyDone;
  const motivationMessage =
    weeklyDone === 0
      ? "C'est le moment de commencer ! 💪"
      : weeklyDone >= weeklyGoal
      ? "Objectif de la semaine atteint ! 🎉"
      : `Continue comme ça, plus que ${remaining} ! 🔥`;

  const totalBet = challenge.bet_per_month;
  const coinsToEarn = calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week);

  const handleCompleteChallenge = async () => {
    setIsCompleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("complete-challenge", {
        body: { challengeId: challenge.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Completion failed");
      toast.success(data.refunded ? "Mise remboursée et pièces gagnées ! 🎉" : "Pièces gagnées ! 🎉");
      queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["user-coins"] });
    } catch {
      toast.error("Erreur lors de la finalisation du défi");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      {headerBlock}

      {/* Weekly Progress Ring — clickable */}
      <button
        onClick={() => !isGoalMet && navigate("/verify")}
        className={`flex flex-col items-center mb-6 group ${!isGoalMet ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className={`relative w-44 h-44 transition-transform duration-200 ${!isGoalMet ? "group-hover:scale-105 group-active:scale-95" : ""}`}>
          {/* Pulse animation only when urgent (red) */}
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
            <span className="text-xs text-muted-foreground">cette semaine</span>
            {!isGoalMet && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Check-in</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm font-medium mt-3 text-center">{motivationMessage}</p>
      </button>

      {/* First week banner */}
      {isFirstWeek && firstWeekSessions != null && (
        <div className="bg-accent/20 border border-accent/30 rounded-xl p-3 mb-4 text-center">
          <p className="text-sm font-medium">🌱 Première semaine : objectif adapté à <span className="font-bold text-primary">{firstWeekSessions} séance{firstWeekSessions > 1 ? "s" : ""}</span></p>
          <p className="text-[11px] text-muted-foreground mt-0.5">L'objectif normal de {challenge.sessions_per_week} séances/sem commence la semaine prochaine</p>
        </div>
      )}

      {/* Weeks remaining */}
      {(() => {
        const challengeEnd = new Date(challenge.started_at);
        challengeEnd.setMonth(challengeEnd.getMonth() + challenge.duration_months);
        const msLeft = challengeEnd.getTime() - now.getTime();
        const weeksRemaining = Math.max(0, Math.ceil(msLeft / (7 * 24 * 60 * 60 * 1000)));
        return weeksRemaining > 0 ? (
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">⏳ <span className="font-semibold">{weeksRemaining} semaine{weeksRemaining > 1 ? "s" : ""}</span> restante{weeksRemaining > 1 ? "s" : ""} pour remporter le défi</p>
          </div>
        ) : null;
      })()}

      {/* Week tracker */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 mb-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">🗓️ Ta semaine</span>
          <span className="text-xs text-muted-foreground">{weeklyDone}/{weeklyGoal} séances</span>
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

      {/* Bet reminder — motivate to recover */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-2xl font-bold">💰</span>
        </div>
        <div className="flex-1">
          <span className="text-2xl font-display font-bold">{totalBet}€</span>
          <p className="text-xs text-muted-foreground">
            Tu as misé {totalBet}€ — tiens bon pour tout récupérer !
          </p>
        </div>
      </div>

      {/* Coins to earn */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card mb-4 flex items-center justify-between">
        <div>
          <span className="text-xl font-display font-bold text-gradient-gold flex items-center gap-1"><CoinIcon size={18} /> +{coinsToEarn}</span>
          <p className="text-xs text-muted-foreground">Bonus pièces si tu réussis ton défi</p>
        </div>
      </div>


      {isChallengeComplete && (
        <div className="space-y-3">
          <div className="bg-gradient-card rounded-2xl border border-accent/30 p-5 text-center shadow-card">
            <span className="text-4xl mb-2 block">🎉</span>
            <h3 className="text-xl font-display font-bold mb-1">Défi terminé !</h3>
            <p className="text-sm text-muted-foreground mb-2">Bravo ! Tu as réussi ton défi !</p>
            <p className="text-lg font-display font-bold text-gradient-gold flex items-center justify-center gap-1">+ <CoinIcon size={16} /> {coinsToEarn} pièces</p>
          </div>
          <Button
            onClick={handleCompleteChallenge}
            disabled={isCompleting}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {isCompleting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
            Récupérer et lancer un nouveau défi
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
