import { apiFetch } from "./http";

/**
 * Invoice Management API
 * Module 6 - Invoice Management endpoints
 */

// Create invoice
export function createInvoice(body) {
    return apiFetch("/api/invoices", {
        method: "POST",
        body,
    });
}

// Get invoice by ID
export function getInvoice(id) {
    return apiFetch(`/api/invoices/${id}`);
}

// List invoices with filters
export function listInvoices({
                                 branchId,
                                 customerId,
                                 bookingId,
                                 type,
                                 paymentStatus,
                                 status,
                                 startDate,
                                 endDate,
                                 keyword,
                                 overdueOnly,
                                 page = 0,
                                 size = 20,
                                 sortBy = "createdAt",
                                 sortDir = "desc",
                             } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (bookingId != null) params.append("bookingId", String(bookingId));
    if (type) params.append("type", type);
    if (paymentStatus) params.append("paymentStatus", paymentStatus);
    if (status) params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (keyword) params.append("keyword", keyword);
    if (overdueOnly) params.append("overdueOnly", "true");
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    if (sortBy) params.append("sortBy", sortBy);
    if (sortDir) params.append("sortDir", sortDir);
    const qs = params.toString();
    return apiFetch(`/api/invoices${qs ? `?${qs}` : ""}`);
}

// Update invoice
export function updateInvoice(id, body) {
    return apiFetch(`/api/invoices/${id}`, {
        method: "PUT",
        body,
    });
}

// Void invoice
export function voidInvoice(id, body) {
    return apiFetch(`/api/invoices/${id}/void`, {
        method: "POST",
        body,
    });
}

// Send invoice via email
export function sendInvoice(id, body) {
    return apiFetch(`/api/invoices/${id}/send`, {
        method: "POST",
        body,
    });
}

// Record payment for invoice
// Backend expects RecordPaymentRequest format
export function recordPayment(invoiceId, body) {
    // Transform frontend format to backend RecordPaymentRequest
    const payload = {
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        // Bank transfer info
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        referenceNumber: body.referenceNumber,
        // Cash info
        cashierName: body.cashierName,
        receiptNumber: body.receiptNumber,
        note: body.note,
        createdBy: body.createdBy,
    };

    return apiFetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: payload,
    }).then(res => res.data); // Backend returns ApiResponse wrapper
}

// Get payment history for invoice
export function getPaymentHistory(invoiceId) {
    return apiFetch(`/api/invoices/${invoiceId}/payments`)
        .then(res => res.data);
}

// Get invoice balance
export function getInvoiceBalance(invoiceId) {
    return apiFetch(`/api/invoices/${invoiceId}/balance`)
        .then(res => res.data);
}

// Mark invoice as paid
export function markInvoiceAsPaid(invoiceId) {
    return apiFetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
    }).then(res => res.data);
}

// Generate invoice number
export function generateInvoiceNumber(branchId) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    const qs = params.toString();
    return apiFetch(`/api/invoices/generate-number${qs ? `?${qs}` : ""}`);
}
