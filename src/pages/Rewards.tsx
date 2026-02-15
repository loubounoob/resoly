import { Coins, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useUserCoins } from "@/hooks/useChallenge";
import { useAuth } from "@/contexts/AuthContext";

const Rewards = () => {
  const { user } = useAuth();
  const { data: coins, isLoading } = useUserCoins();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <Coins className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold">Mes Pièces</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        Gagne des pièces en complétant tes défis
      </p>

      {/* Coin balance */}
      <div className="bg-gradient-card rounded-2xl border border-border p-8 shadow-card text-center mb-6">
        <div className="text-6xl mb-3">🪙</div>
        <span className="text-5xl font-display font-bold text-gradient-gold">{coins ?? 0}</span>
        <p className="text-muted-foreground text-sm mt-2">pièces disponibles</p>
      </div>

      {/* How it works */}
      <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card">
        <h3 className="font-display font-bold text-lg mb-4">Comment ça marche ?</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl">💰</span>
            <div>
              <p className="font-medium text-sm">Mise remboursée</p>
              <p className="text-xs text-muted-foreground">Si tu complètes ton défi, ta mise est remboursée</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🪙</span>
            <div>
              <p className="font-medium text-sm">Pièces bonus</p>
              <p className="text-xs text-muted-foreground">En plus du remboursement, tu gagnes des pièces à dépenser en boutique</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">📈</span>
            <div>
              <p className="font-medium text-sm">Plus tu mises, plus tu gagnes</p>
              <p className="text-xs text-muted-foreground">La formule prend en compte ta mise, la durée et l'intensité</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium text-sm">Échec = tout perdu</p>
              <p className="text-xs text-muted-foreground">Si tu ne finis pas le défi, pas de remboursement ni de pièces</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Rewards;
