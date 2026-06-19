---
name: Shams Tex notification targeting (id vs phone)
description: Why the in-app heads-up "forMe" filter must match direct notifications by phone, not just userId.
---

For non-staff users, the notification subscription delivers direct notifications by `targetUserPhone == userPhone` (phone is the stable identity in this phone-login app). But the in-app heads-up local-fire filter (`forMe` in `context/AppContext.tsx`) historically only fired when `targetUserId === me.id`.

**Problem:** an order's stored `userId` can differ from the current session's `user.id` (regenerated across sessions/devices), so order-status notifications landed in the in-app list (phone match) but the heads-up never popped (id mismatch) — users reported "notifications don't arrive."

**Rule:** direct-to-user notifications must be matched by **id OR phone** in `forMe`. Keep phone as the primary identity for any non-staff notification gating.

**Why:** the subscription is phone-keyed; gating the heads-up on a different field (userId) than the delivery query silently drops alerts.

**How to apply:** whenever adding/changing customer-facing notification delivery or local-fire logic, gate on `targetUserPhone === me.phone` (optionally also id), never id alone. Staff false-positives are avoided because customer docs carry the customer's phone, not staff phones.
