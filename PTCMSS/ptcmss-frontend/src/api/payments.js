import axios from "./axios";

/**
 * Tạo yêu cầu thanh toán (ghi nhận thanh toán cho invoice/booking)
 * @param {Object} payload - { bookingId, amount, paymentMethod, note, status }
 */
export async function createPayment(payload) {
    // Tìm invoice theo bookingId trước
    const invoicesRes = await axios.get("/api/invoices", {
        params: {
            customerId: null, // sẽ filter sau
            page: 0,
            size: 100
        }
    });

    // Tìm invoice liên quan đến booking này (có thể cần endpoint khác)
    // Tạm thời gọi recordPayment với invoiceId = bookingId
    // Cần điều chỉnh tùy theo cấu trúc backend thực tế

    const { bookingId, amount, paymentMethod, note } = payload;

    // Gọi API record payment
    const res = await axios.post(`/api/invoices/${bookingId}/payments`, {
        amount: amount,
        paymentMethod: paymentMethod || "CASH",
        paymentDate: new Date().toISOString().split("T")[0],
        note: note || "",
        reference: `DRIVER-COLLECT-${Date.now()}`,
    });

    return res.data?.data || res.data;
}

/**
 * Lấy lịch sử thanh toán của invoice
 */
export async function getPaymentHistory(invoiceId) {
    const res = await axios.get(`/api/invoices/${invoiceId}/payments`);
    return res.data?.data || res.data || [];
}

/**
 * Xác nhận thanh toán (kế toán)
 */
export async function confirmPayment(paymentId, status) {
    const res = await axios.patch(`/api/invoices/payments/${paymentId}/confirm`, null, {
        params: { status }
    });
    return res.data?.data || res.data;
}