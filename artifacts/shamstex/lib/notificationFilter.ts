import type { User, Notification } from "@/context/AppContext";

// Captured once at module load — used as a stable fallback "registered at"
// cutoff for legacy accounts that never had registeredAt persisted.
const SESSION_START_ISO = new Date().toISOString();

export function filterNotificationsForUser(notifications: Notification[], user: User | null): Notification[] {
  if (!user) return [];

  // Customers/merchants must NOT see broadcasts that were sent before their
  // account was created. Staff can see the full history.
  const isStaff = user.role !== "customer" && user.role !== "merchant";
  // Fallback: if the user record has no registeredAt (legacy users / failed
  // write), use the stable module-load timestamp (close to app cold-start) so
  // the cutoff doesn't drift on every render and silently hide brand-new
  // broadcasts that arrive during the session.
  const registeredAt = user.registeredAt || SESSION_START_ISO;

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
