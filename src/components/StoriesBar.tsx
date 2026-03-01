import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStories, type StoryGroup, type Story } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";

const StoriesBar = () => {
  const { data: storyGroups, isLoading } = useStories();
  const { user } = useAuth();
  const { t, dateLocale } = useLocale();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const STORY_DURATION = 4000;

  const currentStory: Story | null =
    selectedGroup && selectedGroup.stories[storyIndex]
      ? selectedGroup.stories[storyIndex]
      : null;

  const advanceStory = useCallback(() => {
    if (!selectedGroup || !storyGroups) return;
    if (storyIndex < selectedGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      const idx = storyGroups.findIndex((g) => g.userId === selectedGroup.userId);
      if (idx < storyGroups.length - 1) {
        setSelectedGroup(storyGroups[idx + 1]);
        setStoryIndex(0);
      } else {
        closeStory();
      }
    }
  }, [selectedGroup, storyGroups, storyIndex]);

  useEffect(() => {
    if (!selectedGroup) return;
    elapsedRef.current = 0;
    setProgress(0);

    if (paused) return;

    startTimeRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const total = elapsedRef.current + (now - startTimeRef.current);
      const pct = Math.min(total / STORY_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        advanceStory();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };
    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [selectedGroup, storyIndex, paused, advanceStory]);

  const handlePointerDown = () => {
    elapsedRef.current += Date.now() - startTimeRef.current;
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setPaused(true);
  };

  const handlePointerUp = () => {
    setPaused(false);
  };

  if (isLoading || !storyGroups || storyGroups.length === 0) return null;

  const openStory = (group: StoryGroup) => {
    setSelectedGroup(group);
    setStoryIndex(0);
    setPaused(false);
  };

  const closeStory = () => {
    setSelectedGroup(null);
    setStoryIndex(0);
    setPaused(false);
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    }
  };

  const deleteStory = async () => {
    if (!currentStory || !user) return;
    const url = currentStory.photoUrl;
    const pathMatch = url.match(/check-in-photos\/(.+)$/);
    const filePath = pathMatch ? pathMatch[1] : null;

    await supabase
      .from("check_ins")
      .update({ photo_url: null })
      .eq("id", currentStory.checkInId);

    if (filePath) {
      await supabase.storage.from("check-in-photos").remove([filePath]);
    }

    toast.success(t('stories.deleted'));
    queryClient.invalidateQueries({ queryKey: ["stories"] });

    if (selectedGroup && selectedGroup.stories.length <= 1) {
      closeStory();
    } else {
      advanceStory();
    }
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 mb-4">
        {storyGroups.map((group) => {
          const isMe = group.userId === user?.id;
          const label = isMe ? t('stories.you') : group.username || group.displayName || "?";
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

      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && closeStory()}>
        <DialogContent className="max-w-md w-full h-[85vh] p-0 border-0 bg-black rounded-2xl overflow-hidden [&>button]:hidden">
          {currentStory && selectedGroup && (
            <div
              className="relative w-full h-full flex flex-col select-none"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
                {selectedGroup.stories.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width:
                          i < storyIndex
                            ? "100%"
                            : i === storyIndex
                            ? `${progress * 100}%`
                            : "0%",
                        transition: i === storyIndex ? "none" : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>

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
                      {currentStory.userId === user?.id ? t('stories.you') : currentStory.username || currentStory.displayName}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {formatDistanceToNow(new Date(currentStory.checkedInAt), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {currentStory.userId === user?.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteStory(); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1 rounded-full bg-white/10 hover:bg-red-500/40"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeStory(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <img
                src={currentStory.photoUrl}
                alt="Story"
                className="w-full h-full object-cover pointer-events-none"
              />

              <button
                onClick={prevStory}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
                aria-label={t('stories.previous')}
              />
              <button
                onClick={advanceStory}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-0 top-0 bottom-0 w-2/3 z-20"
                aria-label={t('stories.next')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoriesBar;
