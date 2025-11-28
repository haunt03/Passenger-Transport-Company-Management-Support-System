import { apiFetch } from "./http";

/**
 * Lấy danh sách khách hàng với filter và phân trang
 */
export function listCustomers({ keyword, branchId, fromDate, toDate, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.append("keyword", keyword);
    if (branchId) params.append("branchId", branchId);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    params.append("page", String(page));
    params.append("size", String(size));

    return apiFetch(`/api/customers?${params.toString()}`);
}

/**
 * Lấy thông tin khách hàng theo ID
 */
export function getCustomer(id) {
    return apiFetch(`/api/customers/${id}`);
}

/**
 * Lấy danh sách đơn hàng của khách hàng
 */
export function getCustomerBookings(customerId, { page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("size", String(size));
    return apiFetch(`/api/customers/${customerId}/bookings?${params.toString()}`);
}