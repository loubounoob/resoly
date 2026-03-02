

## Plan: Currency multiplier on coins + Countdown verification

### 1. Currency multiplier on coin calculation

The coin formula needs a currency-based multiplier to account for weaker currencies:
- **AUD / CAD** → multiply result by **0.65**
- **USD** → multiply result by **0.85**
- **EUR / GBP / CHF** → no change (×1.0)

This must be applied in **3 places**:

| File | What changes |
|------|-------------|
| `src/lib/coins.ts` | Add a `getCurrencyMultiplier(currency)` function. Update `calculateCoins` to accept an optional `currency` param and apply the multiplier. |
| `src/pages/Dashboard.tsx` (line 216) | Pass `currency` to `calculateCoins` so the preview matches actual server award. |
| `src/pages/CreateChallenge.tsx` (line 85) | Pass `currency` to `calculateCoins`. |
| `src/pages/CreateSocialChallenge.tsx` (line 42) | Pass `currency` to `calculateCoins`. |
| `supabase/functions/complete-challenge/index.ts` (line 84) | After computing `coinsToEarn`, look up the user's `country` from `profiles`, map it to a currency, and apply the same multiplier before awarding coins. |

The country→currency mapping on the server will be a simple inline map:
```
AU→AUD(×0.65), CA→CAD(×0.65), US→USD(×0.85), others→×1.0
```

### 2. Weeks remaining countdown verification

The current logic (Dashboard.tsx lines 271-281):
```
challengeEnd = started_at + duration_months
weeksRemaining = ceil(msLeft / 7days)
```

**Issue**: When `weeksRemaining === 0`, the countdown text is hidden. This means during the very last partial week, the text disappears. This is correct behavior — the user is in their final stretch and the weekly ring shows their progress.

**Completion trigger**: `isChallengeComplete` (line 166) checks `completedSessions >= totalSessions`. When true, the golden "tap to claim" card appears and clicking it triggers `ChallengeVictoryOverlay` which calls `complete-challenge`. The server validates `count >= total_sessions` before awarding. This flow is correct.

**Plural handling**: The `{s}` in translation strings like `"⏳ {count} semaine{s} restante{s}"` is never replaced because no `s` param is passed. The literal `{s}` stays in the output. This needs fixing: when count=1, remove the `s`; when count>1, show `s`.

I'll fix this by updating the `t()` function in `LocaleContext.tsx` to handle `{s}` as a conditional plural based on a `count` param.

### Files to modify

| File | Change |
|------|--------|
| `src/lib/coins.ts` | Add currency multiplier function, update `calculateCoins` signature |
| `src/pages/Dashboard.tsx` | Pass currency to `calculateCoins` |
| `src/pages/CreateChallenge.tsx` | Pass currency to `calculateCoins` |
| `src/pages/CreateSocialChallenge.tsx` | Pass currency to `calculateCoins` |
| `supabase/functions/complete-challenge/index.ts` | Apply currency multiplier server-side |
| `src/contexts/LocaleContext.tsx` | Handle `{s}` plural marker based on `count` param |

