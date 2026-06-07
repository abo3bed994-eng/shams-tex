import type { Order, User } from "@/context/AppContext";

// Height of the visible countdown row (excluding the status-bar safe area). The
// EditCountdownBar overlays the top of the screen by this much, so the Toast
// must drop below it to avoid being covered.
export const EDIT_BAR_CONTENT_H = 40;

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
