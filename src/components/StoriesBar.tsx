import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStories, type StoryGroup, type Story } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const StoriesBar = () => {
  const { data: storyGroups, isLoading } = useStories();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  if (isLoading || !storyGroups || storyGroups.length === 0) return null;

  const currentStory: Story | null =
    selectedGroup && selectedGroup.stories[storyIndex]
      ? selectedGroup.stories[storyIndex]
      : null;

  const openStory = (group: StoryGroup) => {
    setSelectedGroup(group);
    setStoryIndex(0);
  };

  const closeStory = () => {
    setSelectedGroup(null);
    setStoryIndex(0);
  };

  const nextStory = () => {
    if (!selectedGroup) return;
    if (storyIndex < selectedGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      // Move to next group
      const idx = storyGroups.findIndex((g) => g.userId === selectedGroup.userId);
      if (idx < storyGroups.length - 1) {
        setSelectedGroup(storyGroups[idx + 1]);
        setStoryIndex(0);
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    }
  };

  return (
    <>
      {/* Compact horizontal scroll bar */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 mb-4">
        {storyGroups.map((group) => {
          const isMe = group.userId === user?.id;
          const label = isMe ? "Toi" : group.username || group.displayName || "?";
          return (
            <button
              key={group.userId}
              onClick={() => openStory(group)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="p-[2px] rounded-full bg-gradient-to-tr from-primary to-accent">
                <Avatar className="w-12 h-12 border-2 border-background">
                  <AvatarImage src={group.avatarUrl || undefined} />
                  <AvatarFallback className="bg-secondary text-xs font-bold">
                    {label.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[52px]">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Story viewer dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && closeStory()}>
        <DialogContent className="max-w-md w-full h-[85vh] p-0 border-0 bg-black rounded-2xl overflow-hidden [&>button]:hidden">
          {currentStory && selectedGroup && (
            <div className="relative w-full h-full flex flex-col">
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                {selectedGroup.stories.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        i < storyIndex ? "bg-white w-full" : i === storyIndex ? "bg-white w-full" : "w-0"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-white/30">
                    <AvatarImage src={currentStory.avatarUrl || undefined} />
                    <AvatarFallback className="bg-secondary text-[10px]">
                      {(currentStory.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">
                      {currentStory.userId === user?.id ? "Toi" : currentStory.username || currentStory.displayName}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {formatDistanceToNow(new Date(currentStory.checkedInAt), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                <button onClick={closeStory} className="p-1 rounded-full bg-white/10 hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Photo */}
              <img
                src={currentStory.photoUrl}
                alt="Story"
                className="w-full h-full object-cover"
              />

              {/* Navigation zones */}
              <button
                onClick={prevStory}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
                aria-label="Précédent"
              />
              <button
                onClick={nextStory}
                className="absolute right-0 top-0 bottom-0 w-2/3 z-20"
                aria-label="Suivant"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesBar;
