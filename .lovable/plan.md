

## Plan : Fix OnboardingChallenge top spacing + Remove unwanted scroll on all pages

### Problem 1: OnboardingChallenge progress bar behind notch
The OnboardingChallenge uses `fixed inset-0` with its own safe-area div at `z-50`, but App.tsx's global spacer is `z-[100]` which renders on top. The progress bar area gets clipped by the notch.

**Fix**: Increase the OnboardingChallenge's safe-area spacer to `z-[101]` so it renders above App.tsx's spacer, ensuring proper coverage.

### Problem 2: Unwanted scroll on pages like Shop
In App.tsx line 91, `marginTop` adds space OUTSIDE the container, making the document taller than 100vh → small scroll appears on all pages even when content fits.

**Fix**: Change `marginTop` to `paddingTop` in App.tsx line 91. With padding, the container remains at 100vh but content starts lower. No extra document height, no unwanted scroll.

### Files to modify

| File | Change |
|------|--------|
| `src/App.tsx` | Line 91: change `marginTop` → `paddingTop` |
| `src/pages/OnboardingChallenge.tsx` | Line 247: change `z-50` → `z-[101]` |

