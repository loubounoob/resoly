import { Flame, TrendingUp, Camera, Calendar, Coins, ChevronRight, Plus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useActiveChallenge, useCheckIns, useUserCoins } from "@/hooks/useChallenge";
import { supabase } from "@/integrations/supabase/client";
import { calculateCoins } from "@/lib/coins";
import { differenceInDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: challenge, isLoading: loadingChallenge } = useActiveChallenge();
  const { data: checkIns, isLoading: loadingCheckIns } = useCheckIns(challenge?.id);
  const { data: coins } = useUserCoins();

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
  const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const isChallengeComplete = completedSessions >= totalSessions && totalSessions > 0;

  const startDate = parseISO(challenge.started_at);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + challenge.duration_months);
  const daysRemaining = Math.max(0, differenceInDays(endDate, new Date()));

  // Current streak
  let currentStreak = 0;
  if (verifiedCheckIns.length > 0) {
    const sorted = [...verifiedCheckIns].sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime());
    const checkDay = new Date();
    for (const ci of sorted) {
      const ciDate = new Date(ci.checked_in_at);
      const diff = differenceInDays(checkDay, ciDate);
      if (diff <= 1) {
        currentStreak++;
      } else break;
    }
  }

  // Week tracker
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekCheckIns = verifiedCheckIns.filter(ci =>
    isWithinInterval(new Date(ci.checked_in_at), { start: weekStart, end: weekEnd })
  );
  const checkedDays = new Set(thisWeekCheckIns.map(ci => new Date(ci.checked_in_at).getDay()));

  const weekStatus = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = i === 6 ? 0 : i + 1;
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    if (dayDate > now) return null;
    return checkedDays.has(dayIndex) ? true : false;
  });

  const totalBet = challenge.bet_per_month * challenge.duration_months;
  const coinsToEarn = calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week);

  const handleCompleteChallenge = async () => {
    // Award coins to user profile
    await supabase
      .from("profiles")
      .update({ coins: (coins ?? 0) + coinsToEarn } as any)
      .eq("user_id", user!.id);

    // Mark challenge as completed with coins
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
          <span className="font-display font-bold text-xl">FitBet</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <span className="text-sm">🪙</span>
            <span className="text-sm font-bold">{coins ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <Flame className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold">{currentStreak}j</span>
          </div>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(220, 15%, 18%)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(82, 85%, 55%)" />
                <stop offset="100%" stopColor="hsl(82, 85%, 40%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-display font-bold">{progress}%</span>
            <span className="text-xs text-muted-foreground">{completedSessions}/{totalSessions} séances</span>
          </div>
        </div>
      </div>

      {/* Week tracker */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 mb-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Cette semaine</span>
          <span className="text-xs text-muted-foreground">Obj: {challenge.sessions_per_week} séances</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Cote</span>
          </div>
          <span className="text-2xl font-display font-bold text-gradient-gold">x{Number(challenge.odds)}</span>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Restant</span>
          </div>
          <span className="text-2xl font-display font-bold">{daysRemaining}j</span>
        </div>
      </div>

      {/* Mise & coins */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Mise totale</span>
            <span className="text-xl font-display font-bold">{totalBet}€</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Pièces à gagner</span>
            <span className="text-lg font-display font-bold text-gradient-gold">🪙 {coinsToEarn}</span>
          </div>
        </div>
      </div>

      {isChallengeComplete ? (
        <div className="space-y-3">
          <div className="bg-gradient-card rounded-2xl border border-accent/30 p-5 text-center shadow-card">
            <span className="text-4xl mb-2 block">🎉</span>
            <h3 className="text-xl font-display font-bold mb-1">Défi terminé !</h3>
            <p className="text-sm text-muted-foreground mb-2">Bravo ! Tu récupères ta mise de {totalBet}€</p>
            <p className="text-lg font-display font-bold text-gradient-gold">+ 🪙 {coinsToEarn} pièces</p>
          </div>
          <Button
            onClick={handleCompleteChallenge}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Récupérer et lancer un nouveau défi
          </Button>
        </div>
      ) : (
        <>
          <Button
            onClick={() => navigate("/verify")}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            <Camera className="w-5 h-5 mr-2" />
            Check-in maintenant
          </Button>

          <button
            onClick={() => navigate("/shop")}
            className="flex items-center justify-between w-full mt-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Mes pièces</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Dashboard;
