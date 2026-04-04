import type { User, Notification } from "@/context/AppContext";

export function filterNotificationsForUser(notifications: Notification[], user: User | null): Notification[] {
  if (!user) return [];

  return notifications.filter((n) => {
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
      return n.targetRole === "employee" || n.targetRole === "staff";
    }

    if (user.role === "customer" || user.role === "merchant") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole) return n.targetRole === user.role;
      return false;
    }

    return false;
  });
}
