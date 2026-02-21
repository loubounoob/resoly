interface MiniProgressRingProps {
  done: number;
  goal: number;
  isGoalMet: boolean;
  isUrgent: boolean;
  size?: number;
}

const MiniProgressRing = ({ done, goal, isGoalMet, isUrgent, size = 48 }: MiniProgressRingProps) => {
  const progress = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress / 100);

  const colors = isGoalMet
    ? { start: "hsl(210, 85%, 55%)", end: "hsl(210, 85%, 40%)" }
    : isUrgent
    ? { start: "hsl(0, 85%, 55%)", end: "hsl(0, 70%, 45%)" }
    : { start: "hsl(35, 95%, 55%)", end: "hsl(25, 90%, 45%)" };

  const gradId = `miniGrad-${done}-${goal}-${size}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="hsl(220, 15%, 18%)" strokeWidth="4"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{done}/{goal}</span>
      </div>
    </div>
  );
};

export default MiniProgressRing;
