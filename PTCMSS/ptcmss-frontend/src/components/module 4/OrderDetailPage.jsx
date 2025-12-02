// OrderDetailPage.jsx (LIGHT THEME, hooked with light DepositModal)
import React from "react";
import { useParams } from "react-router-dom";
import {
    getBooking,
    addBookingPayment,
    listBookingPayments,
    generateBookingQrPayment,
} from "../../api/bookings";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import AssignDriverDialog from "../module 5/AssignDriverDialog";
import {
    ClipboardList,
    User,
    Phone,
    Mail,
    MapPin,
    Clock,
    CarFront,
    Users,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Truck,
    BadgeDollarSign,
    ChevronRight,
    X,
    QrCode,
    Copy,
} from "lucide-react";

//  dùng modal light theme thay vì bản dark
import DepositModal from "../module 6/DepositModal.jsx";

/**
 * View Order Detail (Module 4.S4)
 *
 * API design:
 *  GET /api/orders/{orderId}
 *  {
 *    id, code, status,
 *    customer: { name, phone, email },
 *    trip: {
 *      pickup, dropoff, pickup_time, dropoff_eta,
 *      pax_count, vehicle_category, vehicle_count
 *    },
 *    quote: { base_price, discount_amount, final_price },
 *    payment: { paid, remaining },
 *    dispatch: { driver_name, driver_phone, vehicle_plate }
 *  }
 *
 * Chức năng trang:
 *  - Xem chi tiết đơn hàng (read-only)
 *  - Ghi nhận thanh toán / đặt cọc (DepositModal - M6.S3)
 *  - Sau khi ghi nhận thanh toán => cập nhật phần payment hiển thị
 *  - Toast feedback
 */

/* ---------- utils ---------- */
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtDateTime = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${MM}/${yyyy} ${hh}:${mm}`;
};

const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    ) + " đ";

/* ---------- status pill ---------- */
const ORDER_STATUS_LABEL = {
    DRAFT: "Nháp",
    PENDING: "Chờ xử lý",
    ASSIGNED: "Đã phân xe",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
};

const ORDER_STATUS_STYLE_LIGHT = {
    DRAFT: "ring-1 ring-slate-300 bg-slate-100 text-slate-700",
    PENDING:
        "ring-1 ring-amber-200 bg-amber-50 text-amber-700",
    ASSIGNED:
        "ring-1 ring-sky-200 bg-sky-50 text-sky-700",
    COMPLETED:
        "ring-1 ring-emerald-200 bg-amber-50 text-amber-700",
    CANCELLED:
        "ring-1 ring-rose-200 bg-rose-50 text-rose-700",
};

function OrderStatusPill({ status }) {
    return (
        <span
            className={cls(
                "inline-flex items-center rounded-md px-2 py-[2px] text-[11px] font-medium whitespace-nowrap",
                ORDER_STATUS_STYLE_LIGHT[status] ||
                "ring-1 ring-slate-300 bg-slate-100 text-slate-700"
            )}
        >
            {ORDER_STATUS_LABEL[status] || status}
        </span>
    );
}

/* ---------- Toast system (light) ---------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback((msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    }, []);
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-md px-3 py-2 shadow-sm border bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-amber-200 bg-amber-50 text-amber-700",
                        t.kind === "error" &&
                        "border-rose-200 bg-rose-50 text-rose-700",
                        t.kind === "info" &&
                        "border-slate-200 bg-white text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* ---------- Section cards (LIGHT THEME) ---------- */

/* 1. Thông tin khách hàng */
function CustomerInfoCard({ customer }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <User className="h-4 w-4 text-sky-600" />
                Thông tin khách hàng
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                    <div className="text-[12px] text-slate-500">
                        Tên khách hàng
                    </div>
                    <div className="text-base font-medium text-slate-900 leading-tight">
                        {customer.name || "—"}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="text-[12px] text-slate-500">
                        Số điện thoại
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 leading-tight break-all">
                        <Phone className="h-4 w-4 text-sky-600 shrink-0" />
                        <a
                            className="text-sky-600 hover:underline"
                            href={
                                "tel:" +
                                (customer.phone || "")
                            }
                        >
                            {customer.phone || "—"}
                        </a>
                    </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <div className="text-[12px] text-slate-500">
                        Email
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 break-all">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>
                            {customer.email || "—"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* 2. Thông tin lịch trình */
function TripInfoCard({ trip, hireTypeName, useHighway }) {
    // Format chi tiết xe: "1×Xe 45 chỗ, 2×Xe 16 chỗ"
    const vehicleDetailsText = trip.vehicle_details && trip.vehicle_details.length > 0
        ? trip.vehicle_details.map(v => `${v.quantity}×${v.name}`).join(", ")
        : (trip.vehicle_category ? `${trip.vehicle_count || 1}×${trip.vehicle_category}` : "—");

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <MapPin className="h-4 w-4 text-amber-600" />
                Thông tin lịch trình
            </div>

            {/* Hình thức thuê & Thông tin chung */}
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                    <span className="text-slate-600">Hình thức:</span>
                    <span className="font-semibold text-sky-700">
                        {hireTypeName || "—"}
                    </span>
                </div>
                {trip.distance > 0 && (
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">Khoảng cách:</span>
                        <span className="font-medium text-slate-900">{trip.distance} km</span>
                    </div>
                )}
                {useHighway && (
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-emerald-600" />
                        <span className="font-medium text-emerald-700">Có đi cao tốc</span>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[1fr_auto] gap-6">
                {/* Lộ trình chi tiết */}
                <div className="flex flex-col gap-4 text-sm">
                    <div className="flex gap-3">
                        {/* timeline dots */}
                        <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full bg-amber-500" />
                            <div className="flex-1 w-px bg-slate-300" />
                            <div className="h-3 w-3 rounded-full bg-rose-500" />
                        </div>

                        <div className="space-y-4">
                            {/* Pickup */}
                            <div>
                                <div className="mb-1 flex items-center gap-1 text-[12px] text-slate-500">
                                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Điểm đón</span>
                                </div>
                                <div className="font-medium text-slate-900 leading-relaxed">
                                    {trip.pickup || "—"}
                                </div>

                                <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        Thời gian đi:{" "}
                                        <span className="font-medium text-slate-900 tabular-nums">
                                            {fmtDateTime(trip.pickup_time)}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Dropoff */}
                            <div>
                                <div className="mb-1 flex items-center gap-1 text-[12px] text-slate-500">
                                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                                    <span>Điểm đến</span>
                                </div>
                                <div className="font-medium text-slate-900 leading-relaxed">
                                    {trip.dropoff || "—"}
                                </div>

                                <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-500">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        Thời gian về:{" "}
                                        <span className="font-medium text-slate-900 tabular-nums">
                                            {fmtDateTime(trip.dropoff_eta)}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* meta box - Thông tin xe */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2 text-[13px] text-slate-700">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span>
                                Sức chứa:{" "}
                                <span className="font-medium text-slate-900">
                                    {trip.pax_count > 0 ? `${trip.pax_count} chỗ` : "—"}
                                </span>
                            </span>
                        </div>

                        <div className="flex items-start gap-2">
                            <CarFront className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                                <span className="text-slate-600">Xe: </span>
                                <span className="font-medium text-slate-900">
                                    {vehicleDetailsText}
                                </span>
                                {trip.vehicle_count > 0 && (
                                    <span className="text-slate-500 ml-1">
                                        ({trip.vehicle_count} xe)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* box nhắc nhở */}
                <div className="lg:w-[200px] shrink-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 space-y-2 h-fit">
                    <div className="flex items-start gap-2 leading-relaxed">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                            Hãy gọi xác nhận với khách{" "}
                            <span className="font-semibold text-slate-900">
                                trước giờ đón ~10 phút
                            </span>{" "}
                            và đảm bảo xe đúng loại.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* 3. Báo giá */
function QuoteInfoCard({ quote }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Báo giá
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Giá gốc (ước tính)
                    </div>
                    <div className="tabular-nums font-semibold text-slate-900">
                        {fmtVND(quote.base_price)}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Giảm giá
                    </div>
                    <div className="tabular-nums font-semibold text-slate-900">
                        {fmtVND(
                            quote.discount_amount
                        )}
                    </div>
                    {Number(
                        quote.discount_amount
                    ) > 0 ? (
                        <div className="text-[11px] text-slate-500 leading-relaxed">
                            (Duyệt bởi quản lý /
                            chăm sóc khách
                            hàng)
                        </div>
                    ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Giá cuối báo khách
                    </div>
                    <div className="text-base font-semibold tabular-nums flex items-center gap-1 text-amber-600">
                        <DollarSign className="h-4 w-4 text-amber-600" />
                        <span>
                            {fmtVND(
                                quote.final_price
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* 4. Thanh toán / Cọc */
function PaymentInfoCard({ payment, history = [], onOpenDeposit, onGenerateQr, isConsultant = false }) {
    const remain = Math.max(0, Number(payment.remaining || 0));
    const paid = Math.max(0, Number(payment.paid || 0));

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <BadgeDollarSign className="h-4 w-4 text-amber-600" />
                Thanh toán / Cọc
            </div>

            {/* Số liệu tóm tắt */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-amber-700">Đã thu</div>
                    <div className="text-lg font-bold tabular-nums text-amber-700 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{fmtVND(paid)}</span>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-amber-700">Còn lại</div>
                    <div className="text-lg font-bold tabular-nums text-amber-700 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{fmtVND(remain)}</span>
                    </div>
                </div>
            </div>

            {/* Trạng thái & ghi chú */}
            {remain <= 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Đã thanh toán đủ</span>
                </div>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600 leading-relaxed">
                    Khách sẽ thanh toán phần còn lại sau chuyến hoặc khi xuất hóa đơn.
                </div>
            )}

            {/* Nút hành động - Chỉ hiển thị khi còn tiền chưa thanh toán */}
            {remain > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            className="rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-[13px] px-4 py-2.5 shadow-sm flex items-center justify-center gap-2 transition-colors"
                            onClick={onOpenDeposit}
                        >
                            <BadgeDollarSign className="h-4 w-4" />
                            <span>{isConsultant ? "Yêu cầu đặt cọc" : "Ghi nhận thanh toán"}</span>
                        </button>

                        <button
                            type="button"
                            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[13px] px-4 py-2.5 shadow-sm flex items-center justify-center gap-2 transition-colors"
                            onClick={onGenerateQr}
                        >
                            <QrCode className="h-4 w-4 text-sky-600" />
                            <span>Tạo QR</span>
                        </button>
                    </div>

                    <div className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
                        {isConsultant
                            ? "Tạo yêu cầu thu cọc/thanh toán để kế toán xác nhận, hoặc gửi QR cho khách."
                            : "Ghi nhận tiền mặt/chuyển khoản hoặc gửi mã QR để khách tự thanh toán."}
                    </div>
                </>
            )}

            {/* Lịch sử thanh toán */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Lịch sử thanh toán</div>
                {history.length ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {history.map((item) => (
                            <div
                                key={item.invoiceId}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] space-y-1.5"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <span className="font-bold text-base text-slate-900 tabular-nums">{fmtVND(item.amount || 0)}</span>
                                    <span className="text-[11px] text-slate-500 whitespace-nowrap">{item.createdAt ? fmtDateTime(item.createdAt) : "--"}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-600">{item.paymentMethod || "Không có"}</span>
                                    <span
                                        className={cls(
                                            "font-semibold px-2 py-0.5 rounded-md",
                                            item.paymentStatus === "PAID"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : item.paymentStatus === "PENDING"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-slate-100 text-slate-700"
                                        )}
                                    >
                                        {item.paymentStatus === "PAID"
                                            ? "Đã thanh toán"
                                            : item.paymentStatus === "PENDING"
                                                ? "Chờ xác nhận"
                                                : item.paymentStatus === "UNPAID"
                                                    ? "Chưa thanh toán"
                                                    : item.paymentStatus || "Chưa thanh toán"}
                                    </span>
                                </div>
                                {item.note ? (
                                    <div className="text-[11px] text-slate-600 break-words leading-relaxed pt-1 border-t border-slate-200">{item.note}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-[12px] text-slate-500">
                        Chưa có khoản thanh toán nào.
                    </div>
                )}
            </div>
        </div>
    );
}

function QrPaymentModal({
                            open,
                            bookingCode,
                            customerName,
                            defaultAmount = 0,
                            onClose,
                            onGenerate,
                        }) {
    const [amountStr, setAmountStr] = React.useState("");
    const [note, setNote] = React.useState("");
    const [deposit, setDeposit] = React.useState(true);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [result, setResult] = React.useState(null);
    const [copied, setCopied] = React.useState(false);
    const [useFallbackImage, setUseFallbackImage] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const initAmount = Math.max(0, Number(defaultAmount || 0));
            setAmountStr(initAmount > 0 ? String(initAmount) : "");

            // Auto-generate note based on booking info
            const autoNote = deposit
                ? `Cọc đơn ${bookingCode || 'ORD'} - ${customerName || 'Khách hàng'}`
                : `Thanh toán ${bookingCode || 'ORD'} - ${customerName || 'Khách hàng'}`;
            setNote(autoNote);

            setDeposit(true);
            setResult(null);
            setError("");
            setCopied(false);
            setUseFallbackImage(false);
        }
    }, [open, defaultAmount, bookingCode, customerName, deposit]);

    if (!open) return null;

    const amount = Math.max(0, Number(amountStr || 0));

    const handleGenerate = async () => {
        if (!amount || amount <= 0) {
            setError("Vui lòng nhập số tiền hợp lệ");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await (onGenerate?.({ amount, note, deposit }));
            setResult(response || null);
        } catch (err) {
            const apiMessage = err?.data?.message || err?.message;
            setError(apiMessage || "Không thể tạo QR thanh toán");
        } finally {
            setLoading(false);
        }
    };

    const copyQrText = async () => {
        if (!result?.qrText) return;
        try {
            await navigator?.clipboard?.writeText(result.qrText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setCopied(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40"
                onClick={onClose}
            />
            <div
                className="relative z-[1001] w-full max-w-xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - fixed */}
                <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-200 shrink-0">
                    <div>
                        <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500 flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-sky-600" />
                            Tạo mã QR thanh toán
                        </div>
                        <div className="text-base font-semibold text-slate-900">
                            {bookingCode ? `Đơn ${bookingCode}` : "Đơn hàng"}
                        </div>
                        {customerName ? (
                            <div className="text-[12px] text-slate-500">
                                {customerName}
                            </div>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-medium text-slate-600">
                            Số tiền (VND)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="Nhập số tiền cần thu"
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                        />
                        <div className="text-[11px] text-slate-500">
                            Gợi ý: {fmtVND(defaultAmount || 0)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-medium text-slate-600">
                            Nội dung hiển thị
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                            placeholder="Ví dụ: Cọc đơn ORDx"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        <div className="text-[11px] text-slate-500">
                            Tự động tạo dựa trên thông tin đơn hàng. Bạn có thể chỉnh sửa nếu cần.
                        </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={deposit}
                            onChange={(e) => {
                                const isDeposit = e.target.checked;
                                setDeposit(isDeposit);
                                // Auto-update note when deposit status changes
                                const autoNote = isDeposit
                                    ? `Cọc đơn ${bookingCode || 'ORD'} - ${customerName || 'Khách hàng'}`
                                    : `Thanh toán ${bookingCode || 'ORD'} - ${customerName || 'Khách hàng'}`;
                                setNote(autoNote);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        Đánh dấu là khoản đặt cọc
                    </label>

                    {error ? (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                            {error}
                        </div>
                    ) : null}

                    {/* Chỉ hiển thị nút khi chưa tạo QR */}
                    {!result && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                className="text-[13px] font-medium text-slate-500 hover:text-slate-700"
                                onClick={onClose}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-sky-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60"
                                onClick={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? "Đang tạo..." : "Tạo QR"}
                            </button>
                        </div>
                    )}

                    {result ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 mt-4">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Mã QR đã tạo
                            </div>

                            {(() => {
                                const fallbackImageUrl = result?.qrText
                                    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
                                        result.qrText
                                    )}`
                                    : null;
                                const qrImgSrc =
                                    useFallbackImage || !result?.qrImageUrl
                                        ? fallbackImageUrl
                                        : result?.qrImageUrl;
                                if (qrImgSrc) {
                                    return (
                                        <div className="flex flex-col items-center gap-2">
                                            <img
                                                src={qrImgSrc}
                                                alt="QR thanh toán"
                                                className="w-full max-h-[280px] object-contain rounded-lg border border-white shadow-sm bg-white"
                                                onError={() => {
                                                    if (!useFallbackImage) {
                                                        setUseFallbackImage(true);
                                                    }
                                                }}
                                            />
                                            {useFallbackImage && (
                                                <span className="text-[11px] text-slate-500">
                                                    Đang sử dụng ảnh QR dự phòng.
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-[12px] text-slate-500">
                                        Không có hình ảnh QR, dùng chuỗi bên dưới để thanh toán.
                                    </div>
                                );
                            })()}

                            <div className="grid sm:grid-cols-2 gap-3 text-[12px] text-slate-600">
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Số tiền
                                    </div>
                                    <div className="text-base font-semibold text-slate-900">
                                        {fmtVND(result.amount || 0)}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Hiệu lực đến
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {result.expiresAt ? fmtDateTime(result.expiresAt) : "Không giới hạn"}
                                    </div>
                                </div>
                            </div>

                            {result.note ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                        Ghi chú
                                    </div>
                                    <div className="break-words">
                                        {result.note}
                                    </div>
                                </div>
                            ) : null}

                            {result.qrText ? (
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 flex flex-col gap-2">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                        Chuỗi QR
                                    </div>
                                    <div className="break-all text-slate-800">
                                        {result.qrText}
                                    </div>
                                    <button
                                        type="button"
                                        className="self-start inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-100"
                                        onClick={copyQrText}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copied ? "Đã sao chép" : "Sao chép"}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/* 5. Điều phối */
function DispatchInfoCard({ dispatch, onAssignClick, showAssignButton = false }) {
    const hasAssign =
        dispatch &&
        (dispatch.driver_name ||
            dispatch.driver_phone ||
            dispatch.vehicle_plate);

    if (!hasAssign) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <Truck className="h-4 w-4 text-sky-600" />
                    Thông tin điều phối
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-800 flex items-start gap-2 leading-relaxed">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                        Chưa gán tài xế/xe. Đơn đang chờ điều phối hoặc chưa xác nhận.
                    </div>
                </div>

                {/* Button gán chuyến cho Coordinator */}
                {showAssignButton && (
                    <button
                        onClick={onAssignClick}
                        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Truck className="h-4 w-4" />
                        Gán chuyến
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <Truck className="h-4 w-4 text-sky-600" />
                Thông tin điều phối
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                {/* Tài xế */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Tài xế
                    </div>
                    <div className="font-medium text-slate-900 leading-tight">
                        {dispatch.driver_name ||
                            "—"}
                    </div>
                    <div className="text-[12px] text-slate-600 flex items-center gap-2 break-all leading-relaxed">
                        <Phone className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        <a
                            className="text-sky-600 hover:underline"
                            href={
                                "tel:" +
                                (dispatch.driver_phone ||
                                    "")
                            }
                        >
                            {dispatch.driver_phone ||
                                "—"}
                        </a>
                    </div>
                </div>

                {/* Biển số xe */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Biển số xe
                    </div>
                    <div className="font-medium text-slate-900">
                        {dispatch.vehicle_plate ||
                            "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 leading-relaxed">
                        <CarFront className="h-3.5 w-3.5 text-amber-600" />
                        <span>
                            Xe đã gán cho
                            chuyến
                        </span>
                    </div>
                </div>

                {/* Trạng thái điều phối */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-1">
                    <div className="text-[11px] uppercase tracking-wide font-medium text-slate-500">
                        Trạng thái điều
                        phối
                    </div>
                    <div className="text-sm font-medium text-amber-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                        <span>
                            Đã phân xe
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                        Hệ thống đã gửi
                        thông tin chuyến
                        cho tài xế.
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- MAIN PAGE ---------- */
export default function OrderDetailPage() {
    const { toasts, push } = useToasts();
    const { orderId } = useParams();

    // Check role - ẩn phần thanh toán cho Consultant và Accountant
    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const isConsultant = currentRole === ROLES.CONSULTANT;
    const isAccountant = currentRole === ROLES.ACCOUNTANT;
    const isCoordinator = currentRole === ROLES.COORDINATOR;

    const [order, setOrder] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [paymentHistory, setPaymentHistory] = React.useState([]);
    const [qrModalOpen, setQrModalOpen] = React.useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);

    const mapBookingToOrder = (b) => {
        if (!b) return null;
        const firstTrip = Array.isArray(b.trips) && b.trips.length ? b.trips[0] : {};
        const vehicleCount = Array.isArray(b.vehicles) ? b.vehicles.reduce((sum, v) => sum + (v.quantity || 0), 0) : 0;
        const vehicleCategory = Array.isArray(b.vehicles) && b.vehicles.length ? b.vehicles[0].categoryName : "";
        // Tính tổng sức chứa từ vehicles
        const totalCapacity = Array.isArray(b.vehicles)
            ? b.vehicles.reduce((sum, v) => sum + ((v.capacity || 0) * (v.quantity || 1)), 0)
            : 0;
        // Chi tiết các loại xe
        const vehicleDetails = Array.isArray(b.vehicles)
            ? b.vehicles.map(v => ({
                name: v.categoryName || '',
                quantity: v.quantity || 1,
                capacity: v.capacity || 0,
            }))
            : [];
        const discount = Number(b.discountAmount || 0);
        const basePrice = Number(b.estimatedCost || 0);
        const finalPrice = Number(b.totalCost || 0);
        return {
            id: b.id,
            code: `ORD-${b.id}`,
            status: b.status === 'CONFIRMED' ? 'ASSIGNED' : (b.status || 'PENDING'),
            branchId: b.branchId,
            customerId: b.customer?.id,
            customer: {
                name: b.customer?.fullName || '',
                phone: b.customer?.phone || '',
                email: b.customer?.email || '',
            },
            trip: {
                id: firstTrip.id || firstTrip.tripId || null,
                pickup: firstTrip.startLocation || '',
                dropoff: firstTrip.endLocation || '',
                pickup_time: firstTrip.startTime || '',
                dropoff_eta: firstTrip.endTime || '',
                pax_count: totalCapacity, // Tổng sức chứa
                vehicle_category: vehicleCategory,
                vehicle_count: vehicleCount,
                vehicle_details: vehicleDetails, // Chi tiết các loại xe
                distance: firstTrip.distance || null,
            },
            // Thông tin hình thức thuê
            hireTypeName: b.hireTypeName || '',
            useHighway: b.useHighway || false,
            quote: {
                base_price: basePrice,
                discount_amount: discount,
                final_price: finalPrice,
            },
            payment: {
                paid: Number(b.paidAmount || 0),
                remaining: Number(b.remainingAmount || 0),
            },
            dispatch: {
                driver_name: firstTrip.driverName || '',
                driver_phone: '',
                vehicle_plate: firstTrip.vehicleLicensePlate || '',
            },
            notes_internal: b.note || '',
            branch_name: b.branchName || b.branch?.name || '',
        };
    };

    const fetchOrder = React.useCallback(async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const data = await getBooking(orderId);
            const mapped = mapBookingToOrder(data);
            setOrder(mapped);
        } catch (e) {
            push('Không tải được chi tiết đơn hàng', 'error');
        } finally {
            setLoading(false);
        }
    }, [orderId, push]);

    React.useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const fetchPayments = React.useCallback(async () => {
        if (!order?.id) return;
        try {
            const list = await listBookingPayments(order.id);
            setPaymentHistory(Array.isArray(list) ? list : []);
        } catch (e) {
            push('Không tải được lịch sử thanh toán', 'error');
        }
    }, [order?.id, push]);

    React.useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // modal thanh toán/cọc
    const [depositOpen, setDepositOpen] = React.useState(false);

    const openDeposit = () => {
        setDepositOpen(true);
    };

    const openQrModal = () => {
        setQrModalOpen(true);
    };

    const openAssignDialog = () => {
        setAssignDialogOpen(true);
    };

    const handleAssignSuccess = async () => {
        try {
            await fetchOrder();
            push("Đã gán chuyến thành công", "success");
        } catch (e) {
            push("Không thể tải lại dữ liệu", "error");
        }
    };

    // callback khi ghi nhận thanh toán thành công (DepositModal đã xử lý API call)
    const handleDepositSubmitted = async (payload, ctx) => {
        // DepositModal đã gọi createDeposit/recordPayment bên trong
        // Chỉ cần refresh data và hiển thị thông báo
        try {
            await fetchOrder();
            await fetchPayments();
            push(`Đã ghi nhận thanh toán +${Number(payload.amount || 0).toLocaleString('vi-VN')}đ cho đơn ${order.id}`, 'success');
        } catch (e) {
            push('Không thể tải lại dữ liệu', 'error');
        }
    };

    const handleQrGenerate = React.useCallback(
        async ({ amount, note, deposit }) => {
            const bookingId = order?.id ?? orderId;
            if (!bookingId) {
                throw new Error('ORDER_NOT_READY');
            }
            try {
                const response = await generateBookingQrPayment(bookingId, {
                    amount,
                    note,
                    deposit,
                });
                await fetchPayments();
                push('Đã tạo yêu cầu thanh toán QR', 'success');
                return response;
            } catch (e) {
                push('Tạo QR thanh toán thất bại', 'error');
                throw e;
            }
        },
        [order?.id, orderId, fetchPayments, push]
    );

    // header summary numbers
    const finalPrice = order?.quote?.final_price || 0;
    const paid = order?.payment?.paid || 0;
    const remain = Math.max(0, finalPrice - paid);

    if (loading || !order) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
                <Toasts toasts={toasts} />
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Đang tải chi tiết đơn hàng...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2">
                    {/* title row */}
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-amber-600" />
                            <span>
                                Đơn hàng {order.code}
                            </span>
                        </div>

                        <OrderStatusPill status={order.status} />
                    </div>

                    {/* meta row */}
                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600 leading-relaxed">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-slate-700">
                                {order.trip.pickup}{" "}
                                <ChevronRight className="h-3 w-3 text-slate-400 inline-block" />{" "}
                                {order.trip.dropoff}
                            </span>
                        </div>

                        <div className="hidden sm:block text-slate-400">
                            •
                        </div>

                        <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-700">
                                Đón lúc{" "}
                                <span className="font-medium text-slate-900 tabular-nums">
                                    {fmtDateTime(
                                        order.trip.pickup_time
                                    )}
                                </span>
                            </span>
                        </div>

                        <div className="hidden sm:block text-slate-400">
                            •
                        </div>

                        <div className="flex items-center gap-1 text-slate-700">
                            <CarFront className="h-3.5 w-3.5 text-amber-600" />
                            <span>
                                {order.trip.vehicle_category} ·{" "}
                                {order.trip.vehicle_count} xe
                            </span>
                        </div>
                    </div>

                    {/* cảnh báo nếu huỷ / nháp */}
                    {(order.status === "CANCELLED" ||
                        order.status === "DRAFT") && (
                        <div className="flex max-w-fit items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="leading-relaxed">
                                    Đơn chưa xác nhận. Cần
                                    chốt lại với khách.
                                </span>
                        </div>
                    )}
                </div>

                {/* Bỏ bảng thanh toán summary - thông tin đã có trong PaymentInfoCard */}
            </div>

            {/* BODY GRID */}
            <div className="grid xl:grid-cols-2 gap-5 mb-5">
                <CustomerInfoCard
                    customer={order.customer}
                />
                <TripInfoCard
                    trip={order.trip}
                    hireTypeName={order.hireTypeName}
                    useHighway={order.useHighway}
                />
            </div>

            <div className={`grid ${isAccountant ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-5 mb-5`}>
                <QuoteInfoCard quote={order.quote} />
                {!isAccountant && (
                    <PaymentInfoCard
                        payment={order.payment}
                        history={paymentHistory}
                        onOpenDeposit={openDeposit}
                        onGenerateQr={openQrModal}
                        isConsultant={isConsultant}
                    />
                )}
            </div>

            <div className="grid xl:grid-cols-2 gap-5">
                <DispatchInfoCard
                    dispatch={order.dispatch}
                    onAssignClick={openAssignDialog}
                    showAssignButton={isCoordinator}
                />

                {/* ghi chú nội bộ */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 text-sm shadow-sm">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Ghi chú nội bộ
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700 whitespace-pre-line">
                        {order.notes_internal ||
                            "Không có ghi chú."}
                    </div>

                    <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                        <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                            Ghi chú chỉ nội bộ,
                            KH không thấy.
                        </span>
                    </div>
                </div>
            </div>

            {/* Assign Driver Dialog - cho Coordinator */}
            {isCoordinator && order && (
                <AssignDriverDialog
                    open={assignDialogOpen}
                    order={{
                        id: order.id,
                        bookingId: order.id,
                        tripId: order.trip?.id,
                        code: order.code,
                        pickup_time: order.trip?.pickup_time,
                        vehicle_type: order.trip?.vehicle_category,
                        branch_name: order.branch_name,
                    }}
                    onClose={() => setAssignDialogOpen(false)}
                    onAssigned={handleAssignSuccess}
                />
            )}

            {/* Payment modals - ẩn với Accountant */}
            {!isAccountant && (
                <>
                    <QrPaymentModal
                        open={qrModalOpen}
                        bookingCode={order.code}
                        customerName={order.customer.name}
                        defaultAmount={remain}
                        onClose={() => setQrModalOpen(false)}
                        onGenerate={handleQrGenerate}
                    />

                    {/* Deposit / Payment modal */}
                    <DepositModal
                        open={depositOpen}
                        context={{
                            type: "order",
                            id: order.id,
                            branchId: order.branchId,
                            customerId: order.customerId,
                            title:
                                order.customer.name +
                                " · " +
                                order.trip.pickup +
                                " → " +
                                order.trip.dropoff,
                        }}
                        /* Tổng & Đã trả truyền cho modal light */
                        totals={{
                            total: order.quote.final_price,
                            paid: order.payment.paid,
                        }}
                        /* Số mặc định = phần còn lại */
                        defaultAmount={Math.max(
                            0,
                            order.quote.final_price -
                            order.payment.paid
                        )}
                        modeLabel="Thanh toán"
                        allowOverpay={false}
                        onClose={() => setDepositOpen(false)}
                        onSubmitted={handleDepositSubmitted}
                    />
                </>
            )}
        </div>
    );
}
