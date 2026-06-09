---
name: Shams Tex order-edit finalize paths
description: Two distinct finalize paths for a customer order edit and why they clamp vs force differently
---

There are two ways a customer's in-flight order edit gets finalized, and they must
handle the availability cap differently:

- **Customer-driven (cart «تأكيد التعديل»)** finalizes via `finalizeEditedItem` —
  it CLAMPS each item's weight/actualWeight DOWN to the cap (`min(current, cap)`).
- **Staff-acceptance / auto-accept-on-expiry** finalizes via
  `acceptStaffAvailability` — it FORCES partial items UP to `availableQuantity`.

**Why:** in the cart the customer can manually reduce a quantity below the cap, so
forcing to the cap would silently overwrite their choice. The cart UI also only
*displays* the capped value (`min(rawAw, cap)`) without mutating an untouched
item, so finalize must clamp or an over-cap untouched item would survive the save.
On the auto/staff path there is no customer interaction, so "accept what's
available" (force to cap) is the right default.

**How to apply:** never swap `acceptStaffAvailability` into the cart finalize path
(or vice-versa). Keep `computeItemsTotal` after whichever pass runs so the saved
total matches the clamped/forced items.

## Pieces (ثوب/bolt) cap = WHOLE bolts only — no forced minimum

A pieces order is sold in whole bolts (`bltOf` = 20kg or 100m each). The
availability cap is a WEIGHT (`availableQuantity` in kg/m), so the bolt cap is
`floor(cap / perBolt)`. Never `Math.max(1, ...)` it: if less than one full bolt is
available the item CANNOT be fulfilled and must be dropped (treated like
`unavailable`), not rounded up to 1 bolt — rounding up exceeds the cap.
- `acceptStaffAvailability`: `if (bolts < 1) return acc` (skip the item).
- cart clamp-on-load effect: `if (maxBolts < 1) removeFromCart(...)`.
- `finalizeEditedItem` / cart stepper `maxBolts`: plain `floor`, guarded ≥0.

## Edit save must NOT hard-throw (offline tolerance)

`updateOrderItems` used to `throw new Error("save_failed")` when
`saveOrderReliable` returned false — the ONLY save path that did. Every other save
(`addOrder`, scheduled release) uses `FS.saveOrder(...).catch(()=>{})` and relies
on the `pendingOrderSaves` retry queue. `saveOrderReliable` already updates local
state + queues for retry before returning false, so the edit is never lost.
**Why:** the throw surfaced a spurious "تعذّر حفظ التعديل" to customers on any
transient Firestore hiccup, inconsistent with the create path.
**How to apply:** keep edit/confirm save paths offline-tolerant (warn + rely on
the queue); don't reintroduce a hard throw that alerts the user on a queued save.
