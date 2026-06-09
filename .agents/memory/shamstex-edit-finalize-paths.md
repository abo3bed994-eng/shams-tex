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
