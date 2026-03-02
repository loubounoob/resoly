

## Fix: Promo code bonus not reflected on Dashboard

### Problem
The Dashboard calculates `coinsToEarn` without considering the `promo_code` stored on the challenge. So even if a promo code was applied at creation, the displayed coin count on the Dashboard ignores the ×1.5 multiplier. The server-side (complete-challenge) already applies it correctly, so only the frontend display needs fixing.

### Changes

**1. `src/hooks/useChallenge.ts`** — Add `promo_code` to the `Challenge` interface:
```typescript
promo_code: string | null;
```

**2. `src/pages/Dashboard.tsx`** — Apply promo multiplier to coin preview (line 216):
```typescript
import { calculateCoins, getPromoMultiplier } from "@/lib/coins";
// ...
const promoMult = getPromoMultiplier(challenge.promo_code ?? undefined);
const coinsToEarn = Math.round(calculateCoins(totalBet, challenge.duration_months, challenge.sessions_per_week, currency) * promoMult);
```

This ensures the "+684 bonus" badge on the Dashboard shows the correct promo-boosted value (e.g. +1026 with a valid code), and the same correct value is passed to the VictoryOverlay at completion.

