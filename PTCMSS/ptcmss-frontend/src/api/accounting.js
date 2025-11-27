import { apiFetch } from "./http";

/**
 * Accounting API
 * Module 6 - Accounting Dashboard and Reports endpoints
 */

// Get accounting dashboard
export function getAccountingDashboard({ branchId, period, year, month } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (period) params.append("period", period);
    if (year != null) params.append("year", String(year));
    if (month != null) params.append("month", String(month));
    const qs = params.toString();
    return apiFetch(`/api/accounting/dashboard${qs ? `?${qs}` : ""}`);
}

// Get revenue report
export function getRevenueReport({
                                     branchId,
                                     customerId,
                                     startDate,
                                     endDate,
                                     period,
                                     page = 0,
                                     size = 20,
                                 } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    const qs = params.toString();
    return apiFetch(`/api/accounting/revenue${qs ? `?${qs}` : ""}`);
}

// Get expense report
export function getExpenseReport({
                                     branchId,
                                     costType,
                                     vehicleId,
                                     startDate,
                                     endDate,
                                     period,
                                     page = 0,
                                     size = 20,
                                 } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (costType) params.append("expenseType", costType); // Backend expects expenseType
    if (vehicleId != null) params.append("vehicleId", String(vehicleId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    const qs = params.toString();
    return apiFetch(`/api/accounting/expense${qs ? `?${qs}` : ""}`);
}

// Get total revenue
export function getTotalRevenue({ branchId, startDate, endDate, period } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    return apiFetch(`/api/accounting/stats/revenue${qs ? `?${qs}` : ""}`);
}

// Get total expense
export function getTotalExpense({ branchId, startDate, endDate, period } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    return apiFetch(`/api/accounting/stats/expense${qs ? `?${qs}` : ""}`);
}

// Get AR balance
export function getARBalance({ branchId } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    const qs = params.toString();
    return apiFetch(`/api/accounting/stats/ar-balance${qs ? `?${qs}` : ""}`);
}

// Get invoices due in 7 days
export function getInvoicesDueIn7Days({ branchId } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    const qs = params.toString();
    return apiFetch(`/api/accounting/stats/invoices-due${qs ? `?${qs}` : ""}`);
}

// Get overdue invoices
export function getOverdueInvoices({ branchId } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    const qs = params.toString();
    return apiFetch(`/api/accounting/stats/overdue${qs ? `?${qs}` : ""}`);
}

