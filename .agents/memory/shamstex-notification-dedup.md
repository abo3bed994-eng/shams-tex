---
name: Shams Tex local notification de-duplication
description: Why local OS notifications re-fired on logout/login and how the watermark fixes it
---

# Local OS notification re-fire (Shams Tex)

Local OS notifications (expo-notifications `scheduleNotificationAsync`) are fired
from the Firestore notifications listener in `context/AppContext.tsx`, NOT from a
backend. The app must itself avoid re-presenting already-delivered notifications.

**Rule:** Decide "is this notification new?" by comparing its `createdAt` to a
login-scoped watermark (`notifWatermarkRef`), reset to `new Date().toISOString()`
at the start of the subscription `useEffect` on every login. Fire only when
`createdAt > watermark`, then advance the watermark to the snapshot's max
`createdAt`.

**Why:** The previous approach (in-memory `prevIds` set + `isFirstNotifLoad`
flag) re-fired old notifications after logout/login and on a second device,
because:
1. `FS.subscribeNotificationsForUser` delivers snapshots in TWO merged batches
   (two parallel Firestore listeners merged in memory). The second batch looked
   "new" relative to the first.
2. Those in-memory guards reset whenever the effect re-runs (logout/login,
   single-device enforcement kicking the first device), so historical docs were
   treated as new.

The watermark is immune to both: pre-existing docs always have
`createdAt < login time`, and the second merge batch re-emits items already
`<= watermark`.

**How to apply:** Keep all notification `createdAt` values as ISO strings
(`new Date().toISOString()`) so lexicographic compare == chronological. If you
ever add a new notification-creation path, set `createdAt` the same way, or it
may be silently skipped (or, with a future clock, re-alert). Do NOT reintroduce
`prevIds`/`isFirstNotifLoad`-based newness detection.
