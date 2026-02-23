import { useState, useEffect, useRef } from "react";
import CoinIcon from "@/components/CoinIcon";
import { cn } from "@/lib/utils";

interface AnimatedCoinCounterProps {
  value: number;
  className?: string;
}

const AnimatedCoinCounter = ({ value, className }: AnimatedCoinCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPlus, setShowPlus] = useState<number | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;

    if (prev === value || prev === 0) {
      setDisplayValue(value);
      return;
    }

    const diff = value - prev;
    if (diff <= 0) {
      setDisplayValue(value);
      return;
    }

    // Show floating "+X" badge
    setShowPlus(diff);
    setIsAnimating(true);

    // Animate counter incrementing
    const duration = Math.min(1500, Math.max(600, diff * 10));
    const steps = Math.min(diff, 30);
    const stepTime = duration / steps;
    let current = prev;
    const increment = diff / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        current = value;
        clearInterval(timer);
        setTimeout(() => {
          setIsAnimating(false);
          setShowPlus(null);
        }, 800);
      }
      setDisplayValue(Math.round(current));
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className={cn("relative flex items-center gap-1.5", className)}>
      <CoinIcon size={14} />
      <span
        className={cn(
          "text-sm font-bold transition-colors duration-300",
          isAnimating && "text-accent"
        )}
      >
        {displayValue}
      </span>

      {/* Floating +X animation */}
      {showPlus !== null && (
        <span
          key={showPlus + "-" + Date.now()}
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-display font-bold text-accent animate-coin-float pointer-events-none whitespace-nowrap"
        >
          +{showPlus} 🪙
        </span>
      )}

      {/* Glow pulse behind icon */}
      {isAnimating && (
        <div className="absolute inset-0 -m-1 rounded-full bg-accent/20 animate-ping pointer-events-none" />
      )}
    </div>
  );
};

export default AnimatedCoinCounter;
