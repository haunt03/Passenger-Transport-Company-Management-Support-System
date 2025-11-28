import { apiFetch } from "./http";

export function createExpenseRequest(payload) {
    return apiFetch("/api/expense-requests", {
        method: "POST",
        body: payload,
    });
}

// Get expense requests by driver ID
export function getDriverExpenseRequests(driverId) {
    return apiFetch(`/api/expense-requests/driver/${driverId}`);
}

// Get pending expense requests (for accountant)
export function getPendingExpenseRequests() {
    return apiFetch("/api/expense-requests/pending");
}

// Get all expense requests with filters
export function listExpenseRequests({ status, branchId } = {}) {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (branchId) params.append("branchId", String(branchId));
    const qs = params.toString();
    return apiFetch(`/api/expense-requests${qs ? `?${qs}` : ""}`);
}

// Approve expense request
export function approveExpenseRequest(id, note = "") {
    const params = note ? `?note=${encodeURIComponent(note)}` : "";
    return apiFetch(`/api/expense-requests/${id}/approve${params}`, {
        method: "PATCH",
    });
}

// Reject expense request
export function rejectExpenseRequest(id, note = "") {
    const params = note ? `?note=${encodeURIComponent(note)}` : "";
    return apiFetch(`/api/expense-requests/${id}/reject${params}`, {
        method: "PATCH",
    });
}