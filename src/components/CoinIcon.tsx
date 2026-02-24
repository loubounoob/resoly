import { forwardRef } from "react";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinIconProps extends React.HTMLAttributes<SVGSVGElement> {
  className?: string;
  size?: number;
}

const CoinIcon = forwardRef<SVGSVGElement, CoinIconProps>(
  ({ className, size = 16, ...props }, ref) => (
    <Coins ref={ref} className={cn("text-accent", className)} size={size} {...props} />
  )
);
CoinIcon.displayName = "CoinIcon";

export default CoinIcon;
