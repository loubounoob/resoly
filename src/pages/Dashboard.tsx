import { Flame, TrendingUp, Camera, Calendar, Trophy, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

// Mock challenge data
const challenge = {
  sessionsPerWeek: 4,
  duration: 3,
  betPerMonth: 75,
  odds: 2.1,
  completedSessions: 18,
  totalSessions: 48,
  daysRemaining: 52,
  currentStreak: 5,
  rewardTier: "Ensemble sportif 🎽",
};

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
const weekStatus = [true, false, true, true, false, null, null]; // true=done, false=missed, null=upcoming

const Dashboard = () => {
  const navigate = useNavigate();
  const progress = Math.round((challenge.completedSessions / challenge.totalSessions) * 100);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-xl">FitBet</span>
        </div>
        <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold">{challenge.currentStreak}j</span>
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
            <span className="text-xs text-muted-foreground">{challenge.completedSessions}/{challenge.totalSessions} séances</span>
          </div>
        </div>
      </div>

      {/* Week tracker */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 mb-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Cette semaine</span>
          <span className="text-xs text-muted-foreground">Obj: {challenge.sessionsPerWeek} séances</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => (
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
          <span className="text-2xl font-display font-bold text-gradient-gold">x{challenge.odds}</span>
        </div>
        <div className="bg-gradient-card rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Restant</span>
          </div>
          <span className="text-2xl font-display font-bold">{challenge.daysRemaining}j</span>
        </div>
      </div>

      {/* Mise & reward */}
      <div className="bg-gradient-card rounded-2xl border border-border p-4 shadow-card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground block">Mise totale</span>
            <span className="text-xl font-display font-bold">{challenge.betPerMonth * challenge.duration}€</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Récompense visée</span>
            <span className="text-lg font-display font-bold text-gradient-gold">{challenge.rewardTier}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <Button
        onClick={() => navigate("/verify")}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
      >
        <Camera className="w-5 h-5 mr-2" />
        Check-in maintenant
      </Button>

      <button
        onClick={() => navigate("/rewards")}
        className="flex items-center justify-between w-full mt-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium">Voir mes récompenses</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
