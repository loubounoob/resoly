

## Plan: Fix cart drawer top clipping + green progress ring at 0/0

### Issue 1: Cart drawer (Sheet) content clipped at top
The Sheet component uses `fixed inset-y-0` (line 41) which starts at the very top of the viewport, behind the notch/safe-area. The `p-6` padding isn't enough to clear it.

**Fix**: Add `paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)'` to the Sheet content for `right` and `left` sides, matching the global app safe-area offset. This is best done in `src/components/ui/sheet.tsx` line 58, by adding a style prop with the safe-area padding.

### Issue 2: Progress ring shows no color at 0/0
On Dashboard line 232-248, when `weeklyProgress` is 0, the `strokeDashoffset` equals the full circumference, so the gradient stroke is invisible — the ring appears grey/colorless.

**Fix**: In Dashboard.tsx, when progress is 0, still render a minimal visible arc (e.g., force a minimum `strokeDashoffset` so ~2% of the ring is visible), OR always show the gradient ring with at least a tiny visible stroke. The simplest approach: set a minimum progress of ~2 when `weeklyGoal > 0` so the green arc is always slightly visible, showing the user there's a ring to fill.

### Files to modify

| File | Change |
|------|--------|
| `src/components/ui/sheet.tsx` | Line 58: add safe-area paddingTop style to SheetContent |
| `src/pages/Dashboard.tsx` | Line 240: use `Math.max(2, weeklyProgress)` for strokeDashoffset so the ring always shows some color |

