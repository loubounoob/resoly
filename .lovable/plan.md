

## Plan: Fix Push Notifications Token Registration

### Problem
The current `usePushNotifications` hook has a critical bug: listeners are registered **after** `PushNotifications.register()`. The `registration` event fires immediately upon registration, so the listener misses it. Additionally, `useRef` guards are needed to prevent duplicate registrations on re-renders.

### Database
The `push_tokens` table already exists with the correct schema (user_id, token, platform, created_at, updated_at) and RLS policies. No migration needed.

The table has a unique constraint needed for upsert -- need to verify. If `onConflict: "user_id,token"` fails, we'll add a unique index via migration.

### Changes

**1. Rewrite `src/hooks/usePushNotifications.ts`**
- Register all listeners **before** calling `PushNotifications.register()`
- Add a `useRef` guard to prevent multiple registrations across re-renders
- Remove `as any` casts (table exists in DB now)
- Add clear debug logs at each step: permission granted, token received, token saved
- Use `useCallback` pattern to avoid stale closures on `user`

**2. Add unique constraint on push_tokens (migration)**
- `CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_idx ON push_tokens(user_id, token)` to support the upsert's `onConflict`.

**3. iOS native setup reminder**
After code changes, provide the user with the checklist for Xcode:
- Enable Push Notifications capability
- Enable Background Modes > Remote notifications
- Ensure `FirebaseApp.configure()` is called in `AppDelegate.swift`
- Ensure `GoogleService-Info.plist` is in the Xcode project

### Corrected Hook Logic (key order)
```
1. Check user + native platform
2. useRef guard to prevent double registration
3. Register listeners (registration, registrationError, received, actionPerformed)
4. Request permissions
5. If granted, call PushNotifications.register()
6. On registration event: upsert token to push_tokens + log
7. Cleanup: removeAllListeners on unmount
```

