

## Plan: Promo codes with ×1.5 coin multiplier + animation

### Overview
Add a promo code input field on the CreateChallenge page. When a valid code is entered, coins preview is multiplied by 1.5 with a celebratory animation. The valid codes are: `SUMMER`, `SUMMERBODY`, `WINTER`, `NEWYEAR`, `2027`.

### 1. Promo code validation (frontend only)

A simple constant list of valid codes in `CreateChallenge.tsx`:
```typescript
const PROMO_CODES = ["SUMMER", "SUMMERBODY", "WINTER", "NEWYEAR", "2027"];
```

No server-side validation needed — the multiplier is purely cosmetic for the preview. The actual coin award at challenge completion stays unchanged (server-controlled).

**Wait — should the ×1.5 also apply to the actual coins awarded server-side?** Based on the request ("multiplient par 1,5 le nombre de pièce"), yes. So:

### 2. Changes needed

| File | Change |
|------|--------|
| `src/pages/CreateChallenge.tsx` | Add promo code input + state (`promoCode`, `promoApplied`). Validate against the list. Apply ×1.5 to `coinsPreview`. Show animation on valid code. Pass `promoCode` to the edge function. |
| `src/lib/coins.ts` | Add `VALID_PROMO_CODES` constant and `getPromoMultiplier(code)` helper (returns 1.5 or 1.0). |
| `supabase/functions/complete-challenge/index.ts` | Read `promo_code` from the challenge row. If valid, apply ×1.5 to coins before awarding. |
| `challenges` table | Add a `promo_code` column (text, nullable) via migration to persist the code used at creation. |
| `src/i18n/locales/fr.ts`, `en.ts`, `de.ts` | Add translation keys for promo code UI (`promoCode`, `promoApplied`, `promoInvalid`, `promoPlaceholder`). |

### 3. UI design

Below the duration section (before the summary card), add:
- A text input with a "Appliquer" button
- On valid code: input turns green, a ✅ badge appears, coins preview animates (scale-up + glow) to show the new ×1.5 value
- On invalid code: toast error "Code invalide"
- The animation: the coins number scales up with a brief `animate-scale-in` + golden glow pulse

### 4. Server-side persistence

- **Migration**: `ALTER TABLE challenges ADD COLUMN promo_code text;`
- At challenge creation in `useCreateChallenge`, pass the promo code to the insert
- In `complete-challenge` edge function, check `challenge.promo_code` against the valid list and apply ×1.5

### 5. Files to modify

1. **Migration** — add `promo_code` column to `challenges`
2. **`src/lib/coins.ts`** — add promo codes list + helper
3. **`src/pages/CreateChallenge.tsx`** — promo input UI, animation, pass code to challenge creation
4. **`src/hooks/useChallenge.ts`** — accept `promo_code` in `useCreateChallenge`
5. **`supabase/functions/complete-challenge/index.ts`** — apply ×1.5 if valid promo
6. **`src/i18n/locales/fr.ts`**, **`en.ts`**, **`de.ts`** — translation keys

