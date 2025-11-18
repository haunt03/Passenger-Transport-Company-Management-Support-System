import { apiFetch } from "./http";

// Dashboard for consultant
export function getConsultantDashboard(branchId) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    return apiFetch(`/api/bookings/dashboard${qs}`);
}

// Create booking
export function createBooking(body) {
    return apiFetch(`/api/bookings`, { method: "POST", body });
}

// Update booking
export function updateBooking(id, body) {
    return apiFetch(`/api/bookings/${id}`, { method: "PUT", body });
}

// Delete (cancel) booking
export function cancelBooking(id) {
    return apiFetch(`/api/bookings/${id}`, { method: "DELETE" });
}

// Get by id
export function getBooking(id) {
    return apiFetch(`/api/bookings/${id}`);
}

// List bookings (unpaged list)
export function listBookings({ status, branchId, consultantId } = {}) {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (branchId != null) params.append("branchId", String(branchId));
    if (consultantId != null) params.append("consultantId", String(consultantId));
    const qs = params.toString();
    return apiFetch(`/api/bookings${qs ? `?${qs}` : ""}`);
}

// Paged bookings
export function pageBookings({ status, branchId, consultantId, startDate, endDate, keyword, page = 1, size = 20, sortBy } = {}) {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (branchId != null) params.append("branchId", String(branchId));
    if (consultantId != null) params.append("consultantId", String(consultantId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (keyword) params.append("keyword", keyword);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    if (sortBy) params.append("sortBy", sortBy);
    const qs = params.toString();
    return apiFetch(`/api/bookings${qs ? `?${qs}` : ""}`);
}

// Calculate price
export function calculatePrice({ vehicleCategoryIds = [], quantities = [], distance, useHighway = false }) {
    const params = new URLSearchParams();
    for (const id of vehicleCategoryIds) params.append("vehicleCategoryIds", String(id));
    for (const q of quantities) params.append("quantities", String(q));
    if (distance != null) params.append("distance", String(distance));
    params.append("useHighway", String(!!useHighway));
    return apiFetch(`/api/bookings/calculate-price?${params.toString()}`, { method: "POST" });
}

// Add payment/deposit for booking
export function addBookingPayment(id, { amount, paymentMethod, note, deposit = true }) {
    const body = {
        amount: Number(amount || 0),
        paymentMethod: paymentMethod || 'CASH',
        note: note || '',
        deposit: !!deposit,
    };
    return apiFetch(`/api/bookings/${id}/payments`, { method: 'POST', body });
}

// Assign driver/vehicle for booking trips
export function assignBooking(id, { driverId, vehicleId, tripIds, note }) {
    const body = {
        driverId: driverId != null && driverId !== '' ? Number(driverId) : undefined,
        vehicleId: vehicleId != null && vehicleId !== '' ? Number(vehicleId) : undefined,
        tripIds: Array.isArray(tripIds) && tripIds.length ? tripIds : undefined,
        note: note || undefined,
    };
    return apiFetch(`/api/bookings/${id}/assign`, { method: 'POST', body });
}

// Check availability by branch/category/time
export function checkVehicleAvailability({ branchId, categoryId, startTime, endTime, quantity = 1 }) {
    const body = {
        branchId: Number(branchId),
        categoryId: Number(categoryId),
        startTime,
        endTime,
        quantity: Number(quantity || 1),
    };
    return apiFetch(`/api/bookings/check-availability`, { method: 'POST', body });
}

// Payment history for a booking
export function listBookingPayments(id) {
    return apiFetch(`/api/bookings/${id}/payments`);
}

// Generate QR payment invoice
export function generateBookingQrPayment(id, { amount, note, deposit = true }) {
    const body = {
        amount: Number(amount || 0),
        paymentMethod: 'QR',
        note: note || '',
        deposit: !!deposit,
    };
    return apiFetch(`/api/bookings/${id}/payments/qr`, { method: 'POST', body });
}