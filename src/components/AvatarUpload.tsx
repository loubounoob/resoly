import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
  size?: "sm" | "lg";
  showSkip?: boolean;
  onSkip?: () => void;
}

const AvatarUpload = ({ currentUrl, onUploaded, size = "lg", showSkip, onSkip }: AvatarUploadProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = size === "lg" ? "w-28 h-28" : "w-16 h-16";
  const iconSize = size === "lg" ? "w-8 h-8" : "w-4 h-4";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Upload (upsert to overwrite)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Photo de profil mise à jour !");
      onUploaded?.(publicUrl);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Erreur lors de l'upload");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview || currentUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => inputRef.current?.click()}
        className="relative group"
        disabled={uploading}
      >
        <Avatar className={`${sizeClasses} border-2 border-border`}>
          <AvatarImage src={displayUrl || undefined} />
          <AvatarFallback className="bg-secondary text-muted-foreground">
            <Camera className={iconSize} />
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFile}
        className="hidden"
      />

      {size === "lg" && (
        <p className="text-xs text-muted-foreground text-center">
          Appuie pour prendre ou choisir une photo
        </p>
      )}

      {showSkip && onSkip && (
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          Passer cette étape
        </Button>
      )}
    </div>
  );
};

export default AvatarUpload;
