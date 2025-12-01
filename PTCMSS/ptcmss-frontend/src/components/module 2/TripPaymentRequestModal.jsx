import React from "react";
import {
    Receipt,
    DollarSign,
    CreditCard,
    Banknote,
    X,
    Info,
    Loader2,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
} from "lucide-react";

/**
 * TripPaymentRequestModal – Tài xế tạo yêu cầu thanh toán từ khách hàng
 *
 * Props:
 *  - open: boolean
 *  - tripId: number
 *  - bookingId: number
 *  - totalCost: number (tổng tiền)
 *  - depositAmount: number (đã cọc)
 *  - remainingAmount: number (còn lại cần thu)
 *  - customerName: string
 *  - onClose: () => void
 *  - onSubmitted?: (payload) => void
 */

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

export default function TripPaymentRequestModal({
                                                    open,
                                                    tripId,
                                                    bookingId,
                                                    totalCost = 0,
                                                    depositAmount = 0,
                                                    remainingAmount = 0,
                                                    customerName = "",
                                                    onClose,
                                                    onSubmitted,
                                                }) {
    const [paymentMethod, setPaymentMethod] = React.useState("CASH"); // CASH | TRANSFER
    const [amountStr, setAmountStr] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [successMsg, setSuccessMsg] = React.useState("");

    // Payment history state
    const [paymentHistory, setPaymentHistory] = React.useState([]);
    const [historyLoading, setHistoryLoading] = React.useState(false);
    const [deleteLoading, setDeleteLoading] = React.useState(null); // paymentId being deleted

    // Load payment history khi modal mở
    React.useEffect(() => {
        if (open && bookingId) {
            loadPaymentHistory();
        }
    }, [open, bookingId]);

    // Tính lại remaining amount dựa trên payment history (trừ đi các payment requests PENDING)
    const calculatedRemainingAmount = React.useMemo(() => {
        const originalRemaining = remainingAmount || 0;

        if (!paymentHistory || paymentHistory.length === 0) {
            return {
                amount: originalRemaining,
                pendingTotal: 0,
                isOverLimit: false,
                originalRemaining: originalRemaining
            };
        }

        // Tính tổng các payment requests PENDING
        const pendingTotal = paymentHistory
            .filter(ph => ph.confirmationStatus === 'PENDING')
            .reduce((sum, ph) => sum + (Number(ph.amount) || 0), 0);

        // Remaining amount = original remaining - pending payments
        const remaining = originalRemaining - pendingTotal;

        return {
            amount: Math.max(0, remaining),
            pendingTotal: pendingTotal,
            isOverLimit: remaining < 0,
            originalRemaining: originalRemaining
        };
    }, [remainingAmount, paymentHistory]);

    // Reset form khi modal mở
    React.useEffect(() => {
        if (open) {
            setPaymentMethod("CASH");
            setAmountStr(String(calculatedRemainingAmount.amount || 0));
            setNotes("");
            setLoading(false);
            setError("");
            setSuccessMsg("");
        }
    }, [open, calculatedRemainingAmount]);

    async function loadPaymentHistory() {
        setHistoryLoading(true);
        try {
            // Dùng endpoint booking payments thay vì invoice payments
            const { listBookingPayments } = await import("../../api/bookings");
            const history = await listBookingPayments(bookingId);
            setPaymentHistory(Array.isArray(history) ? history : []);
        } catch (err) {
            console.error("Error loading payment history:", err);
            setPaymentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }

    async function handleDeletePayment(paymentId) {
        if (!confirm("Bạn có chắc muốn xóa yêu cầu thanh toán này?")) {
            return;
        }

        setDeleteLoading(paymentId);
        try {
            const { deletePayment } = await import("../../api/invoices");
            await deletePayment(paymentId);

            // Reload payment history
            await loadPaymentHistory();

            // Show success message (you can use a toast library here)
            alert("Đã xóa yêu cầu thanh toán");
        } catch (err) {
            console.error("Error deleting payment:", err);
            const errorMsg = err?.data?.message || err?.message || "Không thể xóa yêu cầu thanh toán";
            alert(errorMsg);
        } finally {
            setDeleteLoading(null);
        }
    }

    if (!open) return null;

    const cleanDigits = (s) => String(s || "").replace(/[^0-9]/g, "");
    const amount = Number(cleanDigits(amountStr || ""));
    const valid = amount > 0 && amount <= calculatedRemainingAmount.amount && paymentMethod && !calculatedRemainingAmount.isOverLimit;

    async function handleSubmit() {
        if (!valid) {
            if (calculatedRemainingAmount.isOverLimit) {
                setError(`Đã có ${fmtVND(calculatedRemainingAmount.pendingTotal)}đ đang chờ duyệt, vượt quá số tiền còn lại (${fmtVND(calculatedRemainingAmount.originalRemaining)}đ). Vui lòng đợi kế toán xác nhận các yêu cầu trước.`);
            } else if (amount > calculatedRemainingAmount.amount) {
                setError(`Số tiền vượt quá số tiền còn lại (${fmtVND(calculatedRemainingAmount.amount)}đ). Đã có ${paymentHistory.filter(ph => ph.confirmationStatus === 'PENDING').length} yêu cầu đang chờ duyệt.`);
            } else {
                setError("Vui lòng nhập số tiền hợp lệ.");
            }
            return;
        }

        setLoading(true);
        setError("");
        setSuccessMsg("");

        try {
            // Import API
            const { createPayment } = await import("../../api/payments");

            const payload = {
                bookingId: bookingId,
                amount: amount,
                paymentMethod: paymentMethod,
                note: notes || `Thu tiền từ khách - Chuyến #${tripId}`,
                status: "PENDING", // Chờ kế toán duyệt
            };

            await createPayment(payload);

            // Reload payment history sau khi tạo mới
            await loadPaymentHistory();

            if (typeof onSubmitted === "function") {
                onSubmitted({
                    amount,
                    paymentMethod,
                    notes,
                });
            }

            // Hiển thị thông báo thành công
            setSuccessMsg(`Đã gửi yêu cầu thanh toán ${fmtVND(amount)}đ. Đang chờ kế toán xác nhận.`);

            // Reset form với remaining amount mới (sẽ được tính lại bởi useEffect khi paymentHistory thay đổi)
            // calculatedRemainingAmount sẽ tự động cập nhật sau khi loadPaymentHistory() hoàn thành
            setNotes("");
            setError("");
        } catch (err) {
            console.error("Error creating payment request:", err);
            setError(
                err?.data?.message || err?.message || "Không thể gửi yêu cầu thanh toán. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-xl shadow-slate-900/10 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-3 flex-shrink-0">
                    <div className="flex-none rounded-xl bg-sky-50 border border-sky-200 p-2 text-sky-600 shadow-sm">
                        <Receipt className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 leading-none">
                            Yêu cầu thanh toán từ khách
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                            Chuyến #{tripId} · {customerName}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-400 hover:text-slate-600"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-5 space-y-5 text-sm text-slate-700 overflow-y-auto flex-1">
                    {/* Payment History Section */}
                    {paymentHistory.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    Các yêu cầu thanh toán đã gửi
                                </div>
                            </div>
                            <div className="divide-y divide-slate-200">
                                {historyLoading ? (
                                    <div className="px-4 py-3 text-center text-slate-500 text-xs">
                                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                        Đang tải...
                                    </div>
                                ) : (
                                    paymentHistory.map((payment, idx) => {
                                        const isPending = payment.confirmationStatus === "PENDING";
                                        const isConfirmed = payment.confirmationStatus === "CONFIRMED";
                                        const isRejected = payment.confirmationStatus === "REJECTED";

                                        return (
                                            <div key={payment.paymentId || payment.id || idx} className="px-4 py-3 hover:bg-slate-50">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {fmtVND(payment.amount)} đ
                              </span>
                                                            <span className="text-xs text-slate-500">
                                ({payment.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"})
                              </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isPending && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-700 border border-amber-300">
                                  <Clock className="h-3 w-3" />
                                  Chờ xác nhận
                                </span>
                                                            )}
                                                            {isConfirmed && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <CheckCircle className="h-3 w-3" />
                                  Đã xác nhận
                                </span>
                                                            )}
                                                            {isRejected && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-rose-50 text-rose-700 border border-rose-300">
                                  <XCircle className="h-3 w-3" />
                                  Đã từ chối
                                </span>
                                                            )}
                                                        </div>
                                                        {payment.note && (
                                                            <div className="text-xs text-slate-500 mt-1 truncate">
                                                                {payment.note}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Nút xóa - chỉ hiện với PENDING */}
                                                    {isPending && (
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.paymentId || payment.id)}
                                                            disabled={deleteLoading === (payment.paymentId || payment.id)}
                                                            className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                            title="Xóa yêu cầu"
                                                        >
                                                            {deleteLoading === (payment.paymentId || payment.id) ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            )}
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Thông tin thanh toán */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <div className="flex justify-between text-[13px]">
                            <span className="text-slate-500">Tổng tiền chuyến:</span>
                            <span className="font-semibold text-slate-900">{fmtVND(totalCost)} đ</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                            <span className="text-slate-500">Đã đặt cọc:</span>
                            <span className="font-semibold text-emerald-600">{fmtVND(depositAmount)} đ</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2">
                            <div className="flex justify-between text-[14px] mb-1">
                                <span className="text-slate-700 font-medium">Còn lại cần thu:</span>
                                <span className={calculatedRemainingAmount.isOverLimit ? "font-bold text-rose-600" : "font-bold text-amber-600"}>
                  {fmtVND(calculatedRemainingAmount.amount)} đ
                </span>
                            </div>
                            {calculatedRemainingAmount.isOverLimit && (
                                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1 mt-1">
                                    ⚠️ Đã có {fmtVND(calculatedRemainingAmount.pendingTotal)}đ đang chờ duyệt, vượt quá số tiền còn lại ({fmtVND(calculatedRemainingAmount.originalRemaining)}đ)
                                </div>
                            )}
                            {calculatedRemainingAmount.pendingTotal > 0 && !calculatedRemainingAmount.isOverLimit && (
                                <div className="text-xs text-amber-600 mt-1">
                                    (Đã có {fmtVND(calculatedRemainingAmount.pendingTotal)}đ đang chờ duyệt)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Số tiền thu */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[12px] text-slate-600 font-medium">
                                Số tiền thu từ khách
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-slate-400" />
                                <span>
                  Xem trước:{" "}
                                    <span className="text-slate-800 font-semibold tabular-nums">
                    {fmtVND(amount)} đ
                  </span>
                </span>
                            </div>
                        </div>

                        <input
                            value={amountStr}
                            onChange={(e) => setAmountStr(cleanDigits(e.target.value))}
                            inputMode="numeric"
                            placeholder="0"
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 tabular-nums text-base outline-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                            )}
                        />
                    </div>

                    {/* Phương thức thanh toán */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-2 font-medium">
                            Phương thức thanh toán
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("CASH")}
                                className={cls(
                                    "rounded-xl border p-3 flex flex-col items-center gap-2 transition-all",
                                    paymentMethod === "CASH"
                                        ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                )}
                            >
                                <Banknote className="h-6 w-6" />
                                <span className="text-[13px] font-medium">Tiền mặt</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("TRANSFER")}
                                className={cls(
                                    "rounded-xl border p-3 flex flex-col items-center gap-2 transition-all",
                                    paymentMethod === "TRANSFER"
                                        ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                )}
                            >
                                <CreditCard className="h-6 w-6" />
                                <span className="text-[13px] font-medium">Chuyển khoản</span>
                            </button>
                        </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 font-medium">
                            Ghi chú (tuỳ chọn)
                        </div>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ví dụ: Khách thanh toán đủ, có hoá đơn"
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none resize-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                            )}
                        />
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <Info className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                        <div>
                            Sau khi gửi, yêu cầu sẽ được chuyển đến <b>Kế toán</b> để xác nhận.
                            Bạn cần thu tiền từ khách trước khi hoàn thành chuyến.
                        </div>
                    </div>

                    {/* Success message */}
                    {successMsg && (
                        <div className="flex items-start gap-2 text-[11px] leading-relaxed bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                            <div className="text-emerald-700 font-medium">{successMsg}</div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex items-start gap-2 text-[11px] leading-relaxed bg-rose-50 border border-rose-200 rounded-lg p-3">
                            <XCircle className="h-4 w-4 mt-0.5 text-rose-500 shrink-0" />
                            <div className="text-rose-600">{error}</div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 border-t border-slate-200 flex items-center gap-3 justify-end bg-slate-50 rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm"
                    >
                        Huỷ
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!valid || loading}
                        className={cls(
                            "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-2",
                            "bg-[#0079BC] hover:bg-[#0079BC]/90",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Đang gửi...</span>
                            </>
                        ) : (
                            <>
                                <Receipt className="h-4 w-4" />
                                <span>Gửi yêu cầu</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
