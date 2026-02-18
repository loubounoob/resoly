import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { data: unread } = useUnreadCount();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/notifications")}
      className="relative p-2 rounded-full hover:bg-secondary transition-colors"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5 text-foreground" />
      {(unread ?? 0) > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
          {unread! > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
