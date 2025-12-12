import { apiFetch } from "./http";

/**
 * Debt Management API
 * Module 6 - Debt Management endpoints
 */

// Get debts list
export function getDebts({
                             branchId,
                             customerId,
                             overdueOnly,
                             debtLabel,
                             startDate,
                             endDate,
                             keyword,
                             page = 0,
                             size = 20,
                             sortBy = "dueDate",
                             sortDir = "asc",
                         } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (overdueOnly) params.append("overdueOnly", "true");
    if (debtLabel) params.append("debtLabel", debtLabel);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (keyword) params.append("keyword", keyword);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    if (sortBy) params.append("sortBy", sortBy);
    if (sortDir) params.append("sortDir", sortDir);
    const qs = params.toString();
    return apiFetch(`/api/debts${qs ? `?${qs}` : ""}`);
}

// Get aging buckets
export function getAgingBuckets({ branchId, customerId } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    const qs = params.toString();
    return apiFetch(`/api/debts/aging${qs ? `?${qs}` : ""}`);
}

// Send debt reminder
export function sendDebtReminder(invoiceId, body) {
    return apiFetch(`/api/debts/${invoiceId}/reminder`, {
        method: "POST",
        body,
    });
}

// Get reminder history
export function getReminderHistory(invoiceId) {
    return apiFetch(`/api/debts/${invoiceId}/reminders`);
}

// Update debt info
export function updateDebtInfo(invoiceId, body) {
    return apiFetch(`/api/debts/${invoiceId}/info`, {
        method: "PUT",
        body,
    });
}

// Set promise to pay date
export function setPromiseToPay(invoiceId, body) {
    return apiFetch(`/api/debts/${invoiceId}/promise-to-pay`, {
        method: "PUT",
        body,
    });
}

// Set debt label
export function setDebtLabel(invoiceId, body) {
    return apiFetch(`/api/debts/${invoiceId}/label`, {
        method: "PUT",
        body,
    });
}
