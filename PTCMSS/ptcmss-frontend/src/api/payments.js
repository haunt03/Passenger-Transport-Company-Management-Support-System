import axios from "./axiosInstance";

/**
 * Tạo yêu cầu thanh toán (ghi nhận thanh toán cho booking)
 * Sử dụng endpoint /api/deposits/bookings/{bookingId} thay vì invoices
 * @param {Object} payload - { bookingId, amount, paymentMethod, note, status }
 */
export async function createPayment(payload) {
  const { bookingId, amount, paymentMethod, note } = payload;
  
  // Lấy branchId từ booking info nếu có
  let branchId = payload.branchId;
  if (!branchId) {
    try {
      // Lấy thông tin booking để có branchId
      const bookingRes = await axios.get(`/api/bookings/${bookingId}`);
      branchId = bookingRes.data?.data?.branchId || bookingRes.data?.branchId;
    } catch (e) {
      console.warn("[createPayment] Could not fetch booking info:", e);
    }
  }
  
  // Gọi API deposit endpoint (cho phép DRIVER)
  const res = await axios.post(`/api/deposits/bookings/${bookingId}`, {
    branchId: branchId,
    bookingId: bookingId,
    type: "INCOME", // Required field
    amount: amount,
    paymentMethod: paymentMethod === "TRANSFER" ? "BANK_TRANSFER" : (paymentMethod || "CASH"),
    isDeposit: false, // Đây là thanh toán, không phải cọc
    note: note || `Thu tiền từ khách - Booking #${bookingId}`,
    paymentTerms: "NET_0",
    dueDate: new Date().toISOString().split("T")[0],
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
