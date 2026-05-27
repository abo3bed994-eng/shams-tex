import type { User, Notification } from "@/context/AppContext";

export function filterNotificationsForUser(notifications: Notification[], user: User | null): Notification[] {
  if (!user) return [];

  // Customers/merchants must NOT see broadcasts that were sent before their
  // account was created. Staff can see the full history.
  const isStaff = user.role !== "customer" && user.role !== "merchant";
  // Fallback: if the user record has no registeredAt (legacy users / failed
  // write), use the moment the app first loaded them in this session so they
  // don't see months-old broadcast spam on first open.
  const registeredAt = user.registeredAt || (typeof globalThis !== "undefined" && (globalThis as any).__sessionStart) || new Date().toISOString();

  return notifications.filter((n) => {
    if (n.sourceUserId && n.sourceUserId === user.id) return false;

    // Hide broadcasts (no targetUserId) that predate the user's registration,
    // but always allow direct-targeted notifications (e.g. order updates).
    if (!isStaff && !n.targetUserId && n.createdAt && n.createdAt < registeredAt) {
      return false;
    }
    if (user.role === "admin") {
      if (n.targetUserId) return n.targetUserId === user.id;
      return true;
    }

    if (user.role === "supervisor") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole === "supervisor" || n.targetRole === "staff") return true;
      if (n.actionType === "upgrade_request") return true;
      if (!n.targetRole && !n.targetUserId) return true;
      return false;
    }

    if (user.role === "employee") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole === "employee" || n.targetRole === "staff") return true;
      if (!n.targetRole && !n.targetUserId) return true;
      return false;
    }

    if (user.role === "customer" || user.role === "merchant") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole) return n.targetRole === user.role;
      if (!n.targetRole && !n.targetUserId) return true;
      return false;
    }

    return false;
  });
}
