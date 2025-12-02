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
const fmtVND = (n) => {
    const num = Math.max(0, Number(n || 0));
    // Format với số thập phân nếu có, tối đa 2 chữ số sau dấu phẩy
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num);
};

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
    const [qrData, setQrData] = React.useState(null); // { qrText, qrImageUrl, expiresAt }

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
                hasPending: false,
                originalRemaining: originalRemaining
            };
        }

        // Tính tổng các payment requests PENDING
        const pendingPayments = paymentHistory.filter(ph => ph.confirmationStatus === 'PENDING');
        const pendingTotal = pendingPayments.reduce((sum, ph) => sum + (Number(ph.amount) || 0), 0);
        const hasPending = pendingPayments.length > 0;

        // Remaining amount = original remaining - pending payments
        const remaining = originalRemaining - pendingTotal;

        return {
            amount: Math.max(0, remaining),
            pendingTotal: pendingTotal,
            isOverLimit: remaining < 0,
            hasPending: hasPending,
            pendingCount: pendingPayments.length,
            originalRemaining: originalRemaining
        };
    }, [remainingAmount, paymentHistory]);

    // Reset form khi modal mở (nhưng giữ QR data nếu đã có)
    React.useEffect(() => {
        if (open) {
            setPaymentMethod("CASH");
            setAmountStr(String(calculatedRemainingAmount.amount || 0));
            setNotes("");
            setLoading(false);
            setError("");
            setSuccessMsg("");
            // KHÔNG reset qrData ở đây - giữ lại để hiển thị QR code
            // setQrData(null);
        } else {
            // Chỉ reset qrData khi modal đóng
            setQrData(null);
        }
    }, [open, calculatedRemainingAmount]);

    // Khi chọn TRANSFER, tự động set amount = remaining amount
    React.useEffect(() => {
        if (paymentMethod === "TRANSFER" && calculatedRemainingAmount.amount > 0) {
            setAmountStr(String(calculatedRemainingAmount.amount));
        }
    }, [paymentMethod, calculatedRemainingAmount.amount]);

    async function loadPaymentHistory() {
        setHistoryLoading(true);
        try {
            // Dùng endpoint booking payments thay vì invoice payments
            const { listBookingPayments } = await import("../../api/bookings");
            const history = await listBookingPayments(bookingId);
            setPaymentHistory(Array.isArray(history) ? history : []);
        } catch (err) {
            console.error("Lỗi khi tải lịch sử thanh toán:", err);
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

            // Hiển thị thông báo thành công
            alert("Đã xóa yêu cầu thanh toán thành công");
        } catch (err) {
            console.error("Lỗi khi xóa yêu cầu thanh toán:", err);
            const errorMsg = err?.data?.message || err?.message || "Không thể xóa yêu cầu thanh toán";
            alert(errorMsg);
        } finally {
            setDeleteLoading(null);
        }
    }

    if (!open) return null;

    // Clean input: chỉ giữ số và dấu chấm (cho số thập phân)
    const cleanDigits = (s) => {
        const str = String(s || "");
        // Loại bỏ tất cả ký tự không phải số hoặc dấu chấm
        let cleaned = str.replace(/[^0-9.]/g, "");
        // Chỉ giữ 1 dấu chấm đầu tiên
        const parts = cleaned.split(".");
        if (parts.length > 2) {
            cleaned = parts[0] + "." + parts.slice(1).join("");
        }
        return cleaned;
    };

    const amount = Number(cleanDigits(amountStr || "") || 0);

    // Validation:
    // 1. Không được tạo yêu cầu mới nếu đã có yêu cầu PENDING
    // 2. Tổng pending + amount mới <= remaining amount
    const canCreateNewRequest = !calculatedRemainingAmount.hasPending;
    const totalWithNewAmount = calculatedRemainingAmount.pendingTotal + amount;
    const exceedsRemaining = totalWithNewAmount > calculatedRemainingAmount.originalRemaining;

    const valid = amount > 0
        && amount <= calculatedRemainingAmount.amount
        && paymentMethod
        && !calculatedRemainingAmount.isOverLimit
        && canCreateNewRequest
        && !exceedsRemaining;

    async function handleSubmit() {
        if (!valid) {
            if (calculatedRemainingAmount.hasPending) {
                setError(`Không thể tạo yêu cầu mới. Đã có ${calculatedRemainingAmount.pendingCount} yêu cầu thanh toán đang chờ duyệt (tổng ${fmtVND(calculatedRemainingAmount.pendingTotal)}đ). Vui lòng đợi kế toán xác nhận các yêu cầu trước.`);
            } else if (calculatedRemainingAmount.isOverLimit) {
                setError(`Đã có ${fmtVND(calculatedRemainingAmount.pendingTotal)}đ đang chờ duyệt, vượt quá số tiền còn lại (${fmtVND(calculatedRemainingAmount.originalRemaining)}đ). Vui lòng đợi kế toán xác nhận các yêu cầu trước.`);
            } else if (totalWithNewAmount > calculatedRemainingAmount.originalRemaining) {
                setError(`Tổng số tiền yêu cầu (${fmtVND(calculatedRemainingAmount.pendingTotal + amount)}đ) vượt quá số tiền còn lại (${fmtVND(calculatedRemainingAmount.originalRemaining)}đ). Số tiền có thể tạo thêm: ${fmtVND(calculatedRemainingAmount.amount)}đ.`);
            } else if (amount > calculatedRemainingAmount.amount) {
                setError(`Số tiền vượt quá số tiền còn lại (${fmtVND(calculatedRemainingAmount.amount)}đ). Đã có ${calculatedRemainingAmount.pendingCount} yêu cầu đang chờ duyệt.`);
            } else {
                setError("Vui lòng nhập số tiền hợp lệ.");
            }
            return;
        }

        setLoading(true);
        setError("");
        setSuccessMsg("");
        setQrData(null);

        try {
            if (paymentMethod === "TRANSFER") {
                // Chuyển khoản: Tạo QR code
                const { generateBookingQrPayment } = await import("../../api/bookings");

                const qrResponse = await generateBookingQrPayment(bookingId, {
                    amount: amount,
                    note: notes || `Thu tiền từ khách - Chuyến #${tripId}`,
                    deposit: false, // Đây là thanh toán, không phải cọc
                });

                console.log("[TripPaymentRequestModal] QR Response:", qrResponse);

                // API trả về ApiResponse<PaymentResponse>, nên data nằm trong qrResponse.data
                // Hoặc nếu apiFetch đã unwrap thì trực tiếp trong qrResponse
                const qrDataFromResponse = qrResponse?.data || qrResponse;

                // Lưu QR data để hiển thị
                if (qrDataFromResponse?.qrImageUrl) {
                    setQrData({
                        qrText: qrDataFromResponse.qrText || "",
                        qrImageUrl: qrDataFromResponse.qrImageUrl,
                        expiresAt: qrDataFromResponse.expiresAt,
                    });
                } else {
                    console.error("[TripPaymentRequestModal] QR response không có qrImageUrl:", qrDataFromResponse);
                    setError("Không thể tạo mã QR. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
                    return;
                }

                // Reload payment history sau khi tạo QR (nhưng KHÔNG reset qrData)
                await loadPaymentHistory();

                // Hiển thị thông báo thành công
                setSuccessMsg(`Đã tạo mã QR thanh toán ${fmtVND(amount)}đ. Vui lòng cho khách quét mã QR để thanh toán.`);

                // Gọi callback sau khi đã set qrData và successMsg
                if (typeof onSubmitted === "function") {
                    onSubmitted({
                        amount,
                        paymentMethod: "TRANSFER",
                        notes,
                        qrData: qrDataFromResponse,
                    });
                }
            } else {
                // Tiền mặt: Tạo payment request như cũ
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
            }

            // Reset form với remaining amount mới (sẽ được tính lại bởi useEffect khi paymentHistory thay đổi)
            setNotes("");
            setError("");
        } catch (err) {
            console.error("Lỗi khi tạo yêu cầu thanh toán:", err);
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

                                        // Tạo unique key: invoiceId + paymentId + idx để tránh duplicate
                                        const uniqueKey = payment.invoiceId
                                            ? `invoice-${payment.invoiceId}-${payment.paymentId || idx}`
                                            : payment.paymentId
                                                ? `payment-${payment.paymentId}-${idx}`
                                                : `payment-${payment.id || idx}-${idx}`;

                                        return (
                                            <div key={uniqueKey} className="px-4 py-3 hover:bg-slate-50">
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
                            {calculatedRemainingAmount.hasPending && (
                                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1 mt-1">
                                    ⚠️ Đã có {calculatedRemainingAmount.pendingCount} yêu cầu thanh toán đang chờ duyệt (tổng {fmtVND(calculatedRemainingAmount.pendingTotal)}đ). Vui lòng đợi kế toán xác nhận trước khi tạo yêu cầu mới.
                                </div>
                            )}
                            {calculatedRemainingAmount.isOverLimit && !calculatedRemainingAmount.hasPending && (
                                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1 mt-1">
                                    ⚠️ Đã có {fmtVND(calculatedRemainingAmount.pendingTotal)}đ đang chờ duyệt, vượt quá số tiền còn lại ({fmtVND(calculatedRemainingAmount.originalRemaining)}đ)
                                </div>
                            )}
                            {calculatedRemainingAmount.pendingTotal > 0 && !calculatedRemainingAmount.isOverLimit && !calculatedRemainingAmount.hasPending && (
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
                            disabled={paymentMethod === "TRANSFER"}
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 tabular-nums text-base outline-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900 placeholder:text-slate-400",
                                paymentMethod === "TRANSFER" ? "bg-slate-50 cursor-not-allowed" : ""
                            )}
                        />
                        {paymentMethod === "TRANSFER" && (
                            <div className="text-[11px] text-slate-500 mt-1">
                                Số tiền sẽ tự động được set bằng số tiền còn lại
                            </div>
                        )}
                    </div>

                    {/* Phương thức thanh toán */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-2 font-medium">
                            Phương thức thanh toán
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMethod("CASH");
                                    setQrData(null);
                                }}
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
                        {paymentMethod === "TRANSFER" && (
                            <div className="mt-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                💡 Khi chọn chuyển khoản, hệ thống sẽ tự động tạo mã QR với số tiền còn lại
                            </div>
                        )}
                    </div>

                    {/* QR Code Display */}
                    {qrData && qrData.qrImageUrl && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                            <div className="text-[12px] font-semibold text-slate-700 text-center">
                                Mã QR thanh toán
                            </div>
                            <div className="flex justify-center">
                                <img
                                    src={qrData.qrImageUrl}
                                    alt="QR Code"
                                    className="w-48 h-48 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="text-center text-[11px] text-slate-600">
                                <div className="font-medium mb-1">Số tiền: {fmtVND(amount)} đ</div>
                                {qrData.expiresAt && (
                                    <div className="text-amber-600">
                                        Mã QR hết hạn: {new Date(qrData.expiresAt).toLocaleString("vi-VN")}
                                    </div>
                                )}
                            </div>
                            {qrData.qrText && (
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(qrData.qrText);
                                            alert("Đã sao chép mã QR vào bộ nhớ tạm");
                                        }}
                                        className="text-[11px] text-sky-600 hover:text-sky-700 underline"
                                    >
                                        Sao chép mã QR
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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
                        disabled={!valid || loading || calculatedRemainingAmount.hasPending}
                        className={cls(
                            "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-2",
                            "bg-[#0079BC] hover:bg-[#0079BC]/90",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        title={calculatedRemainingAmount.hasPending ? "Không thể tạo yêu cầu mới khi đã có yêu cầu đang chờ duyệt" : ""}
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
