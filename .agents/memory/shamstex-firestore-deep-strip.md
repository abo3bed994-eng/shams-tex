---
name: Shams Tex Firestore deep undefined strip
description: Why Firestore writes in shamstex must strip undefined recursively, not shallowly
---

Firestore's `setDoc` throws on any `undefined` field value, including ones nested
inside arrays/objects (e.g. `order.items[].customerDecision = undefined`).

`stripUndefined` in `artifacts/shamstex/lib/firebase.ts` must be **recursive**
(deep) — a shallow version only cleans top-level keys and lets nested undefined
through, which silently fails order/customer/product writes.

**Why:** the staff "تحديد التوفر" availability save and the customer
edit-confirm flow build item objects that explicitly set fields to `undefined`;
a shallow strip made every save throw "تعذّر حفظ التغيير" and blocked
deletion of unavailable items.

**How to apply:** keep stripUndefined deep. Caveat: deep strip turns class
instances (e.g. `Date`) into `{}`. This app stores ISO strings, not Date
instances, so it's safe today — don't start passing Date/Timestamp objects into
FS.save* without revisiting this.
