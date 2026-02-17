import { Flame, Camera, Plus, Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import BottomNav from "@/components/BottomNav";
import { useActiveChallenge, useCheckIns, useUserCoins } from "@/hooks/useChallenge";
import { useMyProfile } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { calculateCoins } from "@/lib/coins";
import { startOfWeek, endOfWeek, isWithinInterval, format, startOfDay, getDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenge, isLoading: loadingChallenge } = useActiveChallenge();
  const { data: checkIns, isLoading: loadingCheckIns } = useCheckIns(challenge?.id);
  const { data: coins } = useUserCoins();
  const { data: myProfile } = useMyProfile();

  if (loadingChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24 gap-6">
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
    await supabase
      .from("profiles")
      .update({ coins: (coins ?? 0) + coinsToEarn } as any)
      .eq("user_id", user!.id);
    await supabase
      .from("challenges")
      .update({ status: "completed", coins_awarded: coinsToEarn } as any)
      .eq("id", challenge.id);
    queryClient.invalidateQueries({ queryKey: ["active-challenge"] });
    queryClient.invalidateQueries({ queryKey: ["user-coins"] });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-primary" />
          <div>
            <span className="font-display font-bold text-xl">Resoly</span>
            {myProfile?.username && (
              <p className="text-xs text-muted-foreground">@{myProfile.username}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <CoinIcon size={14} />
            <span className="text-sm font-bold">{coins ?? 0}</span>
          </div>
        </div>
      </div>

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
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Récupérer et lancer un nouveau défi
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
