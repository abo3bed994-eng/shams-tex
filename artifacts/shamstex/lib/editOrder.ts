import type { CartItem, Order, User } from "@/context/AppContext";

// Weight (kg) or length (m) contained in one bolt ("ثوب"), used to estimate the
// weight of a pieces order when no actual weight has been recorded yet.
const bltOf = (u?: string) => (u === "meter" ? 100 : 20);

// Removes the staff-availability metadata from an item once an edit is finalized
// so the order no longer renders as "affected".
export function cleanEditedItem(it: CartItem): CartItem {
  const clean: CartItem = { ...it };
  delete clean.stockStatus;
  delete clean.availableQuantity;
  delete clean.customerDecision;
  delete clean.editMaxQty;
  return clean;
}

// Applies the staff's availability decisions as an automatic acceptance: drops
// fully-unavailable items, caps partially-available items to the available
// quantity, and strips the availability metadata. Shared by the customer's
// «تأكيد التعديل» action and the auto-accept that runs when the edit window
// expires, so both behave identically.
export function acceptStaffAvailability(items: CartItem[]): CartItem[] {
  return items.reduce<CartItem[]>((acc, it) => {
    if (it.stockStatus === "unavailable") return acc;
    const clean = cleanEditedItem(it);
    if (it.stockStatus === "partial" && it.availableQuantity != null) {
      if (it.orderType === "weight") {
        clean.weight = it.availableQuantity;
      } else {
        // Pieces: a bolt (ثوب) is normally bltOf kg/m, but the last/only bolt can
        // be a partial remnant (e.g. 9kg). Keep AT LEAST 1 bolt even when the
        // available weight is below a full bolt, and pin actualWeight to the real
        // available amount so the remnant shows its true weight (never above cap).
        const perBolt = bltOf(it.unit);
        const bolts = Math.max(1, Math.floor(it.availableQuantity / perBolt));
        clean.quantity = bolts;
        clean.actualWeight = Math.min(bolts * perBolt, it.availableQuantity);
      }
    }
    acc.push(clean);
    return acc;
  }, []);
}

// The availability cap for an item during editing: partially-available items cap
// at the available quantity; otherwise an explicit editMaxQty if staff set one.
function capOf(it: CartItem): number | undefined {
  if (it.stockStatus === "partial" && it.availableQuantity != null) return it.availableQuantity;
  return it.editMaxQty ?? undefined;
}

// Finalizes a customer-edited item: clamps the weight / actual weight DOWN to the
// availability cap (so an untouched over-cap item can't survive finalize) while
// respecting any further manual reduction the customer made, then strips the
// staff-availability metadata. Unlike acceptStaffAvailability this never raises a
// quantity up to the cap — the customer's own choices in the cart are preserved.
export function finalizeEditedItem(it: CartItem): CartItem {
  const cap = capOf(it);
  const clean = cleanEditedItem(it);
  if (it.orderType === "weight") {
    if (cap != null && (clean.weight ?? 0) > cap) clean.weight = cap;
  } else {
    // Pieces: clamp the bolt count to the available whole bolts and keep the
    // actual weight in lockstep (each bolt is exactly bltOf kg/m). This both
    // respects a manual reduction by the customer and prevents an untouched
    // over-cap count from surviving finalize.
    const perBolt = bltOf(it.unit);
    let bolts = clean.quantity;
    if (cap != null) {
      // At least 1 bolt: a partial last bolt (e.g. 9kg < 20kg) is still sellable.
      const maxBolts = Math.max(1, Math.floor(cap / perBolt));
      if (bolts > maxBolts) bolts = maxBolts;
    }
    clean.quantity = bolts;
    clean.actualWeight = cap != null ? Math.min(bolts * perBolt, cap) : bolts * perBolt;
  }
  return clean;
}

// Order total for a set of (already finalized) items. Weight items price by
// weight; pieces items price by recorded actual weight, falling back to the
// per-bolt estimate.
export function computeItemsTotal(items: CartItem[]): number {
  const weightTotal = items
    .filter((i) => i.orderType === "weight")
    .reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
  const piecesTotal = items
    .filter((i) => i.orderType === "pieces")
    .reduce((a, b) => a + (b.actualWeight ?? b.quantity * bltOf(b.unit)) * b.unitPrice, 0);
  return weightTotal + piecesTotal;
}

// Height of the visible countdown row (excluding the status-bar safe area). The
// EditCountdownBar overlays the top of the screen by this much, so the Toast
// must drop below it to avoid being covered.
export const EDIT_BAR_CONTENT_H = 40;

// Length of the customer's edit window. The countdown is armed the moment staff
// make an order editable (request the customer's confirmation), so it runs even
// if the customer hasn't opened the order yet.
export const EDIT_WINDOW_MS = 10 * 60 * 1000;

// The current customer's order that is in an active (armed) edit window. Shared
// by EditCountdownBar (to render the bar) and Toast (to offset below the bar).
export function selectActiveEditOrder(orders: Order[], user: User | null): Order | null {
  if (!user || (user.role !== "customer" && user.role !== "merchant")) return null;
  return (
    orders.find(
      (o) =>
        o.editable &&
        o.editableExpiresAt &&
        o.status !== "cancelled" &&
        o.userId === user.id
    ) ?? null
  );
}

// Whether an active edit window still has time left at the given instant.
export function isEditWindowLive(order: Order | null, now: number): boolean {
  if (!order?.editableExpiresAt) return false;
  return new Date(order.editableExpiresAt).getTime() - now > 0;
}
