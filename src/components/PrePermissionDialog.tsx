import { useState } from "react";
import { Bell, Camera, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type PermissionType = "notifications" | "camera" | "location";

interface PrePermissionDialogProps {
  type: PermissionType;
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

const icons: Record<PermissionType, React.ElementType> = {
  notifications: Bell,
  camera: Camera,
  location: MapPin,
};

const iconColors: Record<PermissionType, string> = {
  notifications: "text-amber-500",
  camera: "text-blue-500",
  location: "text-emerald-500",
};

const bgColors: Record<PermissionType, string> = {
  notifications: "bg-amber-500/10",
  camera: "bg-blue-500/10",
  location: "bg-emerald-500/10",
};

const PrePermissionDialog = ({ type, open, onAccept, onDismiss }: PrePermissionDialogProps) => {
  const { t } = useLocale();

  const Icon = icons[type];
  const title = t(`permissions.${type}.title`);
  const description = t(`permissions.${type}.description`);
  const bullets = [
    t(`permissions.${type}.bullet1`),
    t(`permissions.${type}.bullet2`),
    t(`permissions.${type}.bullet3`),
  ];
  const cta = t(`permissions.${type}.cta`);
  const skip = t("permissions.later");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0">
        {/* Hero section */}
        <div className={`${bgColors[type]} flex flex-col items-center justify-center py-10 px-6`}>
          <div className={`w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-lg mb-4`}>
            <Icon className={`w-10 h-10 ${iconColors[type]}`} />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle className="text-xl font-display font-bold text-center">
              {title}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 space-y-5">
          <DialogDescription className="text-sm text-muted-foreground text-center">
            {description}
          </DialogDescription>

          <ul className="space-y-3">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {["🔔", "📸", "📍"][type === "notifications" ? 0 : type === "camera" ? 1 : 2] || "✓"}
                </span>
                <span className="text-sm text-foreground">{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 pt-2">
            <Button
              onClick={onAccept}
              className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow font-display font-bold text-base"
            >
              {cta}
            </Button>
            <button
              onClick={onDismiss}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {skip}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrePermissionDialog;
