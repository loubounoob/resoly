import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCreateSocialChallenge } from "@/hooks/useSocialChallenges";
import { useFriendsList } from "@/hooks/useFriends";
import { useGroups } from "@/hooks/useGroups";
import { toast } from "sonner";

type ChallengeType = "duel" | "boost" | "group";

const DURATION_OPTIONS = [1, 2, 3];
const SESSIONS_OPTIONS = [2, 3, 4, 5, 6];

const TYPE_CARDS: { type: ChallengeType; emoji: string; title: string; desc: string }[] = [
  { type: "duel", emoji: "🥊", title: "Duel", desc: "Chacun crée son propre défi, validation indépendante" },
  { type: "boost", emoji: "🤝", title: "Défi Boost", desc: "Tu configures et finances un défi pour un ami" },
  { type: "group", emoji: "👥", title: "Groupe", desc: "Paramètres communs, chacun rejoint avec sa mise" },
];

const CreateSocialChallenge = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"params" | "type" | "target" | "confirm">("params");
  const [betAmount, setBetAmount] = useState(100);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [duration, setDuration] = useState(3);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const createSocial = useCreateSocialChallenge();
  const { data: friends } = useFriendsList();
  const { data: groups } = useGroups();

  const handleSelectType = (type: ChallengeType) => {
    setChallengeType(type);
    if (type === "group" && groups && groups.length === 0) {
      toast.info("Crée d'abord un groupe !");
      navigate("/friends/create-group");
      return;
    }
    setStep("target");
  };

  const handleConfirm = async () => {
    if (!challengeType) return;
    try {
      await createSocial.mutateAsync({
        type: challengeType,
        target_user_id: selectedFriend ?? undefined,
        group_id: selectedGroup ?? undefined,
        sessions_per_week: sessionsPerWeek,
        duration_months: duration,
        bet_amount: betAmount,
      });
      toast.success("Défi social créé !");
      navigate("/friends");
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  const getInitials = (p: any) => (p?.display_name || p?.first_name || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => step === "params" ? navigate(-1) : setStep(step === "type" ? "params" : step === "target" ? "type" : "target")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Défi social</h1>
      </div>

      {step === "params" && (
        <div className="flex-1 space-y-8">
          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Mise</label>
            <div className="text-center mb-4">
              <span className="text-5xl font-display font-bold text-gradient-primary">{betAmount}€</span>
            </div>
            <Slider value={[betAmount]} onValueChange={(v) => setBetAmount(v[0])} min={10} max={1000} step={10} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>10€</span><span>1 000€</span></div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Séances par semaine</label>
            <div className="grid grid-cols-5 gap-2">
              {SESSIONS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSessionsPerWeek(s)} className={`h-12 rounded-lg font-display font-bold text-lg transition-all ${sessionsPerWeek === s ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{s}</button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm text-muted-foreground mb-3 block">Durée</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDuration(d)} className={`h-12 rounded-lg font-display font-bold transition-all ${duration === d ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{d}<span className="text-xs font-normal ml-0.5">mois</span></button>
              ))}
            </div>
          </section>

          <Button onClick={() => setStep("type")} className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl">
            Suivant
          </Button>
        </div>
      )}

      {step === "type" && (
        <div className="flex-1 space-y-4">
          <p className="text-sm text-muted-foreground mb-2">Choisis le type de défi</p>
          {TYPE_CARDS.map((card) => (
            <button
              key={card.type}
              onClick={() => handleSelectType(card.type)}
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                challengeType === card.type
                  ? "border-primary bg-primary/10"
                  : "border-border bg-gradient-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{card.emoji}</span>
                <span className="font-display font-bold text-lg">{card.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === "target" && (
        <div className="flex-1 space-y-4">
          {challengeType !== "group" ? (
            <>
              <p className="text-sm text-muted-foreground mb-2">Sélectionne un ami</p>
              {!friends || friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun ami ajouté</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((f: any) => (
                    <button
                      key={f.user_id}
                      onClick={() => { setSelectedFriend(f.user_id); setStep("confirm"); }}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        selectedFriend === f.user_id ? "border-primary bg-primary/10" : "border-border bg-gradient-card"
                      }`}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={f.avatar_url} />
                        <AvatarFallback className="bg-secondary text-xs">{getInitials(f)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{f.display_name || f.first_name || "Ami"}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">Sélectionne un groupe</p>
              <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/friends/create-group")}>
                + Créer un groupe
              </Button>
              {!groups || groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun groupe</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g: any) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGroup(g.id); setStep("confirm"); }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedGroup === g.id ? "border-primary bg-primary/10" : "border-border bg-gradient-card"
                      }`}
                    >
                      <span className="font-medium">{g.name}</span>
                      {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="flex-1 space-y-6">
          <div className="bg-gradient-card rounded-2xl border border-border p-5 shadow-card space-y-3">
            <h3 className="font-display font-bold text-lg">Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground block">Type</span><span className="font-bold">{challengeType === "duel" ? "🥊 Duel" : challengeType === "boost" ? "🤝 Boost" : "👥 Groupe"}</span></div>
              <div><span className="text-muted-foreground block">Mise</span><span className="font-bold">{betAmount}€</span></div>
              <div><span className="text-muted-foreground block">Fréquence</span><span className="font-bold">{sessionsPerWeek}x/sem</span></div>
              <div><span className="text-muted-foreground block">Durée</span><span className="font-bold">{duration} mois</span></div>
            </div>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={createSocial.isPending}
            className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl"
          >
            {createSocial.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flame className="w-5 h-5 mr-2" />}
            Lancer le défi
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreateSocialChallenge;
