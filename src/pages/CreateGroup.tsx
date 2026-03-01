import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateGroup } from "@/hooks/useGroups";
import { useFriendsList } from "@/hooks/useFriends";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";

const CreateGroup = () => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const createGroup = useCreateGroup();
  const { data: friends } = useFriendsList();

  const toggleMember = (uid: string) => {
    setSelectedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error(t('createGroup.nameRequired')); return; }
    try {
      await createGroup.mutateAsync({ name: name.trim(), description: description.trim() || undefined, memberIds: selectedIds });
      toast.success(t('createGroup.groupCreated'));
      navigate("/friends");
    } catch {
      toast.error(t('createGroup.createError'));
    }
  };

  const getInitials = (p: any) => (p?.display_name || p?.first_name || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">{t('createGroup.title')}</h1>
      </div>

      <div className="flex-1 space-y-6">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t('createGroup.groupName')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('createGroup.groupNamePlaceholder')} />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t('createGroup.description')}</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('createGroup.descPlaceholder')} />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-3 block">{t('createGroup.members')}</label>
          {!friends || friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('createGroup.addFriendsFirst')}</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f: any) => (
                <button
                  key={f.user_id}
                  onClick={() => toggleMember(f.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedIds.includes(f.user_id) ? "border-primary bg-primary/10" : "border-border bg-gradient-card"
                  }`}
                >
                  <Checkbox checked={selectedIds.includes(f.user_id)} className="pointer-events-none" />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={f.avatar_url} />
                    <AvatarFallback className="text-[10px] bg-secondary">{getInitials(f)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{f.display_name || f.first_name || t('friends.friend')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleCreate}
        disabled={createGroup.isPending || !name.trim()}
        className="w-full h-14 text-lg font-display font-bold bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow rounded-xl mt-6"
      >
        {createGroup.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
        {t('createGroup.createBtn')}
      </Button>
    </div>
  );
};

export default CreateGroup;
