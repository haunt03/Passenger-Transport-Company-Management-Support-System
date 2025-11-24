import { apiFetch } from "./http";

/**
 * Deposit Management API
 * Module 6 - Deposit endpoints
 * Backend: DepositController.java
 */

// Create deposit for booking
// Backend expects CreateInvoiceRequest format
export function createDeposit(bookingId, body) {
    // Validate required fields
    if (!body.branchId) {
        console.error("[createDeposit] Missing branchId in body:", body);
        throw new Error("branchId is required");
    }
    if (!body.amount) {
        throw new Error("amount is required");
    }

    // Transform frontend format to backend CreateInvoiceRequest
    const payload = {
        branchId: body.branchId,
        bookingId: bookingId,
        customerId: body.customerId,
        type: "INCOME",
        isDeposit: true,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        paymentTerms: "NET_7",
        dueDate: body.paymentDate,
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

    console.log("[createDeposit] Final payload:", payload);

    return apiFetch(`/api/deposits/bookings/${bookingId}`, {
        method: "POST",
        body: payload,
    }).then(res => res.data); // Backend returns ApiResponse wrapper
}

// Get deposits by booking
export function getDepositsByBooking(bookingId) {
    return apiFetch(`/api/deposits/bookings/${bookingId}`)
        .then(res => res.data);
}

// Get total deposit paid for booking
export function getTotalDepositPaid(bookingId) {
    return apiFetch(`/api/deposits/bookings/${bookingId}/total-paid`)
        .then(res => res.data);
}

// Get remaining amount for booking
export function getRemainingAmount(bookingId) {
    return apiFetch(`/api/deposits/bookings/${bookingId}/remaining`)
        .then(res => res.data);
}

// Cancel deposit
export function cancelDeposit(depositId, reason) {
    const params = new URLSearchParams();
    params.append("reason", reason);
    return apiFetch(`/api/deposits/${depositId}/cancel?${params.toString()}`, {
        method: "POST",
    }).then(res => res.data);
}

// Generate receipt number
export function generateReceiptNumber(branchId) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    return apiFetch(`/api/deposits/generate-receipt-number?${params.toString()}`)
        .then(res => res.data);
}
