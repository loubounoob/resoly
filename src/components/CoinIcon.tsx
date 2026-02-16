import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinIconProps {
  className?: string;
  size?: number;
}

const CoinIcon = ({ className, size = 16 }: CoinIconProps) => (
  <Coins className={cn("text-accent", className)} size={size} />
);

export default CoinIcon;
