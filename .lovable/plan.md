

## Plan: Fix scrollbar on all pages + verify translations

### Root cause of scrollbar
App.tsx uses `paddingTop` on a `min-h-screen` container. Inner pages also use `min-h-screen` (= 100vh). So total height = 100vh + safe-area padding → always overflows by ~24px → scrollbar appears everywhere.

### Fix approach
Change App.tsx wrapper to `h-screen flex flex-col overflow-hidden` with the paddingTop. Wrap `<AppRoutes />` in a `flex-1 overflow-y-auto` div. Then replace `min-h-screen` with `min-h-full` on all pages so they fill the remaining space exactly.

### Files to modify

**`src/App.tsx`** (line 91):
- Change wrapper to `h-screen flex flex-col overflow-hidden bg-background max-w-md mx-auto relative`
- Wrap `<AppRoutes />` in `<div className="flex-1 overflow-y-auto">`

**All pages — replace `min-h-screen` with `min-h-full`** (8 files):
| File | Lines |
|------|-------|
| `src/pages/Dashboard.tsx` | 133, 221 |
| `src/pages/Shop.tsx` | 109, 117, 128 |
| `src/pages/PhotoVerify.tsx` | 166, 190, 213, 237 |
| `src/pages/Friends.tsx` | 87 |
| `src/pages/Orders.tsx` | 86 |
| `src/pages/Notifications.tsx` | 161 |
| `src/pages/Settings.tsx` | 39 |
| `src/pages/Rewards.tsx` | 49 |

### Translations verification
All notification types (11 types) are already translated in `notif-i18n.ts`. Edge functions and `useFriends.ts` already use locale-aware notifications. The DB trigger for referral_signup is also translated. The UI strings use `t()` throughout. No remaining hardcoded French strings found in notification logic.

