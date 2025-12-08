import { apiFetch } from "./http";
import { getStoredUserId } from "../utils/session";

/**
 * Notifications API
 * Module 2 & 5 - Driver Notifications & System Notifications
 */

/**
 * Get driver notifications
 * GET /api/notifications/user/{userId}
 * Note: If backend doesn't have this endpoint, we can use the general notifications endpoint
 */
export function getDriverNotifications({ userId, page = 1, limit = 20 } = {}) {
  if (!userId) {
    // Try to get from session
    try {
      const { getStoredUserId } = require("../utils/session");
      userId = getStoredUserId();
    } catch (err) {
      throw new Error("USER_ID_REQUIRED");
    }
  }
  
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("limit", String(limit));
  
  return apiFetch(`/api/notifications/user/${userId}?${params.toString()}`).catch(() => {
    // If endpoint fails, return empty array
    return { data: [], total: 0, page, limit };
  });
}

/**
 * Mark notification as read
 * PUT /api/notifications/{notificationId}/read
 */
export function markNotificationRead(notificationId) {
  return apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
  });
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export function markAllNotificationsRead(userId) {
  return apiFetch(`/api/notifications/read-all`, {
    method: "PUT",
    body: { userId: Number(userId) },
  });
}

/**
 * Get notification dashboard (for coordinators/managers)
 * GET /api/notifications/dashboard?branchId={branchId}
 */
export function getNotificationDashboard(branchId) {
  const params = new URLSearchParams();
  if (branchId) params.append("branchId", String(branchId));
  return apiFetch(`/api/notifications/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
}

/**
 * Get alerts
 * GET /api/notifications/alerts?branchId={branchId}
 */
export function getAlerts(branchId) {
  const params = new URLSearchParams();
  if (branchId) params.append("branchId", String(branchId));
  return apiFetch(`/api/notifications/alerts${params.toString() ? `?${params.toString()}` : ""}`);
}

/**
 * Acknowledge alert
 * POST /api/notifications/alerts/{alertId}/acknowledge
 */
export function acknowledgeAlert(alertId, userId) {
  return apiFetch(`/api/notifications/alerts/${alertId}/acknowledge`, {
    method: "POST",
    body: { userId: Number(userId) },
  });
}

/**
 * Get pending approvals
 * GET /api/notifications/approvals/pending?branchId={branchId}
 */
export function getPendingApprovals(branchId) {
  const params = new URLSearchParams();
  if (branchId) params.append("branchId", String(branchId));
  return apiFetch(`/api/notifications/approvals/pending${params.toString() ? `?${params.toString()}` : ""}`);
}

export function approveApprovalRequest(historyId, { userId, note } = {}) {
  const resolvedUserId = userId ?? getStoredUserId();
  if (!resolvedUserId) {
    throw new Error("USER_ID_REQUIRED");
  }
  return apiFetch(`/api/notifications/approvals/${historyId}/approve`, {
    method: "POST",
    body: { userId: Number(resolvedUserId), note },
  });
}

export function rejectApprovalRequest(historyId, { userId, note } = {}) {
  const resolvedUserId = userId ?? getStoredUserId();
  if (!resolvedUserId) {
    throw new Error("USER_ID_REQUIRED");
  }
  return apiFetch(`/api/notifications/approvals/${historyId}/reject`, {
    method: "POST",
    body: { userId: Number(resolvedUserId), note },
  });
}

/**
 * Delete notification
 * DELETE /api/notifications/{notificationId}?userId={userId}
 */
export function deleteNotification(notificationId, userId) {
  const resolvedUserId = userId ?? getStoredUserId();
  if (!resolvedUserId) {
    throw new Error("USER_ID_REQUIRED");
  }
  return apiFetch(`/api/notifications/${notificationId}?userId=${resolvedUserId}`, {
    method: "DELETE",
  });
}

/**
 * Delete notification by approval type and related entity ID
 * DELETE /api/notifications/by-approval?approvalType=...&relatedEntityId=...&userId=...
 */
export function deleteNotificationByApproval(approvalType, relatedEntityId, userId) {
  const resolvedUserId = userId ?? getStoredUserId();
  if (!resolvedUserId) {
    throw new Error("USER_ID_REQUIRED");
  }
  const params = new URLSearchParams({
    approvalType,
    relatedEntityId: String(relatedEntityId),
    userId: String(resolvedUserId),
  });
  return apiFetch(`/api/notifications/by-approval?${params.toString()}`, {
    method: "DELETE",
  });
}

/**
 * Dismiss approval (delete approval history and related notification)
 * DELETE /api/notifications/approvals/{approvalHistoryId}?userId=...
 */
export function dismissApproval(approvalHistoryId, userId) {
  const resolvedUserId = userId ?? getStoredUserId();
  if (!resolvedUserId) {
    throw new Error("USER_ID_REQUIRED");
  }
  return apiFetch(`/api/notifications/approvals/${approvalHistoryId}?userId=${resolvedUserId}`, {
    method: "DELETE",
  });
}

