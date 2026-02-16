import { NavLink, useLocation } from "react-router-dom";
import { Home, Camera, Trophy, ShoppingBag } from "lucide-react";

const BottomNav = () => {
  const location = useLocation();
  if (location.pathname === "/") return null;

  const links = [
    { to: "/dashboard", icon: Home, label: "Accueil" },
    { to: "/verify", icon: Camera, label: "Check-in" },
    { to: "/rewards", icon: Trophy, label: "Pièces" },
    { to: "/shop", icon: ShoppingBag, label: "Shop" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-xl border-t border-border safe-bottom z-50">
      <div className="flex justify-around items-center py-2 px-4">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
