---
name: Shams Tex notification targeting (id vs phone)
description: Why the in-app heads-up "forMe" filter must match direct notifications by phone, not just userId.
---

For non-staff users, the notification subscription delivers direct notifications by `targetUserPhone == userPhone` (phone is the stable identity in this phone-login app). But the in-app heads-up local-fire filter (`forMe` in `context/AppContext.tsx`) historically only fired when `targetUserId === me.id`.

**Problem:** an order's stored `userId` can differ from the current session's `user.id` (regenerated across sessions/devices), so order-status notifications landed in the in-app list (phone match) but the heads-up never popped (id mismatch) — users reported "notifications don't arrive."

**Rule:** direct-to-user notifications must be matched by **id OR phone** in `forMe`. Keep phone as the primary identity for any non-staff notification gating.

**Why:** the subscription is phone-keyed; gating the heads-up on a different field (userId) than the delivery query silently drops alerts.

**How to apply:** whenever adding/changing customer-facing notification delivery or local-fire logic, gate on `targetUserPhone === me.phone` (optionally also id), never id alone. Staff false-positives are avoided because customer docs carry the customer's phone, not staff phones.

## Use the live customer phone, not the order's frozen phone

Both customer notification delivery sinks are **exact** phone matches with no canonicalization: the Firestore subscription (`where("targetUserPhone","==",userPhone)`) and the push lookup (`getPushTokenByPhone` → `pushTokens/{phone}` doc id). An order/return stores `userPhone` frozen at creation time; if the phone format later drifts (legacy local `01…` vs E.164 `+20…`/canonical) those exact matches miss and the customer gets neither in-app nor push — while admin "message" notifications still work because they read the live customer record.

**Rule:** when emitting any customer-targeted notification, resolve the recipient's CURRENT phone via `resolveRecipientPhone(userId, userPhone)` in `context/AppContext.tsx` (looks up the live customer in `registeredCustomersRef.current` by id or `samePhone`, falls back to the frozen value) and use that for BOTH `targetUserPhone` and the `notifyUserByPhone(...)` argument. Never pass raw `order.userPhone`/`req.userPhone` to either sink.

**Why:** the two sinks do not use `samePhone`/`canonicalPhone`, so the only safe place to reconcile format drift is at emit time by reading the live record.

**How to apply:** any new customer notification path (status, message, editable, invoice, return status/cancel, scheduled release) must call `resolveRecipientPhone` first. Staff-targeted notifications are unaffected and stay as-is.
