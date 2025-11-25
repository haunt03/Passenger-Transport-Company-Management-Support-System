import React from "react";
import {
    BadgeDollarSign,
    Calendar,
    CreditCard,
    X,
    Info,
    Paperclip,
} from "lucide-react";
import { recordPayment } from "../../api/invoices";
import { createDeposit } from "../../api/deposits";
import { getCookie } from "../../utils/cookies";

/**
 * DepositModal (LIGHT THEME REWORK, FIXED PRESET CALC)
 *
 * Vẫn giữ toàn bộ UI light ERP bạn đưa.
 * Sửa phần tính % để không bị nhảy về 0 khi bấm 30% / 50% / Tất cả.
 *
 * Điểm thay đổi chính:
 *  - normalizeMoney(): ép mọi giá trị tiền về số nguyên sạch, bỏ dấu . , khoảng trắng...
 *  - total / paid / remaining đều dùng normalizeMoney()
 *  - defaultAmount cũng dùng normalizeMoney()
 */

const cls = (...a) => a.filter(Boolean).join(" ");
const todayISO = () => new Date().toISOString().slice(0, 10);
const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// Chuẩn hoá tiền tệ về số
function normalizeMoney(v) {
    if (v == null) return 0;
    if (typeof v === "number") return Math.floor(v); // Chỉ lấy phần nguyên

    const str = String(v);

    // Xử lý format Việt Nam: "12.000.000,50 đ" hoặc "12.000.000 đ"
    // hoặc format số thập phân: "12000000.50" hoặc "12000000"

    // Loại bỏ chữ "đ" và khoảng trắng
    let cleaned = str.replace(/[đ\s]/gi, "");

    // Kiểm tra xem có dấu phẩy không (format Việt)
    if (cleaned.includes(",")) {
        // Format Việt: "811.646,68" -> loại bỏ dấu chấm (phân cách nghìn) và dấu phẩy (thập phân)
        cleaned = cleaned.replace(/\./g, "").replace(/,.*$/, "");
    } else {
        // Format số thập phân Mỹ: "811646.68" -> loại bỏ phần thập phân
        cleaned = cleaned.replace(/\..*$/, "");
    }

    // Chỉ giữ lại số
    const digits = cleaned.replace(/[^0-9]/g, "");
    const n = Number(digits || "0");
    return isNaN(n) ? 0 : n;
}

// Format hiển thị VND
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    );

export default function DepositModal({
                                         open,
                                         context, // { type: 'order'|'invoice', id, title? }
                                         totals = { total: 0, paid: 0 }, // { total, paid } có thể là số hoặc chuỗi "12.000.000"
                                         defaultAmount = 0,
                                         defaultMethod = "CASH",
                                         defaultDate,
                                         modeLabel = "Thanh toán",
                                         allowOverpay = false,
                                         onClose,
                                         onSubmitted,
                                     }) {
    // ----- STATE -----
    const [amountStr, setAmountStr] = React.useState("");
    const [preset, setPreset] = React.useState("CUSTOM"); // "30" | "50" | "ALL" | "CUSTOM"

    const [method, setMethod] = React.useState(defaultMethod);
    const [date, setDate] = React.useState(defaultDate || todayISO());
    const [kind, setKind] = React.useState("PAYMENT"); // "PAYMENT" | "DEPOSIT"
    const [note, setNote] = React.useState("");

    // bank info
    const [bankName, setBankName] = React.useState("");
    const [bankAccount, setBankAccount] = React.useState("");
    const [bankRef, setBankRef] = React.useState("");

    // chứng từ mock
    const [files, setFiles] = React.useState([]);

    // status
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    // ----- DERIVED VALUES (đã normalize) -----
    const total = Math.max(0, normalizeMoney(totals.total));
    const paid = Math.max(0, normalizeMoney(totals.paid));
    const remaining = Math.max(0, total - paid); // số tiền còn lại phải thu

    // amountStr có thể là chuỗi số "300000", mình chuyển về number sạch:
    const cleanDigits = (s) =>
        String(s || "").replace(/[^0-9]/g, "");
    const amount = normalizeMoney(amountStr); // dùng normalizeMoney cho chắc, tương đương cleanDigits -> Number

    const newBalance = Math.max(0, total - (paid + (amount || 0)));
    const overpay = amount > remaining;

    const baseValid =
        amount > 0 &&
        (method === "CASH" || method === "BANK_TRANSFER") &&
        isISODate(date);

    const bankValid =
        method === "BANK_TRANSFER"
            ? String(bankAccount).trim().length > 0
            : true;

    const valid =
        baseValid && bankValid && (allowOverpay || !overpay);

    // ----- EFFECT: reset khi open -----
    React.useEffect(() => {
        if (open) {
            // số tiền khởi tạo:
            // ưu tiên defaultAmount nếu truyền vào, nếu không thì mặc định = remaining
            const initAmountRaw =
                defaultAmount != null
                    ? normalizeMoney(defaultAmount)
                    : remaining;
            const initAmount = Math.max(0, initAmountRaw);

            setAmountStr(String(initAmount));

            // preset ban đầu:
            // nếu initAmount == remaining -> chọn "ALL"
            if (remaining > 0 && initAmount === remaining) {
                setPreset("ALL");
            } else {
                setPreset("CUSTOM");
            }

            setMethod(defaultMethod);
            setDate(defaultDate || todayISO());
            setKind("PAYMENT");
            setNote("");
            setBankName("");
            setBankAccount("");
            setBankRef("");
            setFiles([]);
            setError("");
        }
    }, [
        open,
        defaultAmount,
        defaultMethod,
        defaultDate,
        remaining,
    ]);

    // ----- EFFECT: phím tắt ESC/ENTER -----
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose && onClose();
            if (e.key === "Enter" && valid) submit();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, valid, amountStr, method, date, kind, note, bankName, bankAccount, bankRef, files, onClose]);

    // ----- HANDLERS -----
    const handleManualAmountChange = (e) => {
        const v = cleanDigits(e.target.value); // giữ lại chỉ số
        setAmountStr(v);
        setPreset("CUSTOM");
    };

    // Format hiển thị trong input với dấu phân cách (chỉ số nguyên, không có đ)
    const displayAmount = amountStr
        ? new Intl.NumberFormat("vi-VN", {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(Math.floor(Number(amountStr)))
        : "";

    // chọn preset % (30 / 50)
    const applyPresetPercent = (ratio) => {
        // remaining đã normalize thành số chuẩn
        const base = remaining * (ratio / 100); // ví dụ 30% còn lại
        // làm tròn đến nghìn:
        const rounded = Math.round(base / 1000) * 1000;
        const finalVal = Math.max(0, rounded);

        setAmountStr(String(finalVal));
        setPreset(String(ratio)); // "30" / "50"
    };

    // chọn preset ALL (tất cả còn lại)
    const applyPresetAll = () => {
        const finalVal = Math.max(0, remaining);
        setAmountStr(String(finalVal));
        setPreset("ALL");
    };

    // user bấm "Tùy chỉnh"
    const activateCustomPresetOnly = () => {
        setPreset("CUSTOM");
        // không động vào amountStr
    };

    // file chứng từ
    const onFileChange = (e) => {
        const list = Array.from(e.target.files || []).map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
        }));
        setFiles(list);
    };

    async function submit() {
        if (!valid) {
            setError("Vui lòng nhập dữ liệu hợp lệ");
            return;
        }

        setLoading(true);
        setError("");

        const payload = {
            amount,
            payment_method: method,
            payment_date: date,
            kind, // "DEPOSIT" | "PAYMENT"
            note: note || undefined,
            bank:
                method === "BANK_TRANSFER"
                    ? {
                        name: bankName || undefined,
                        account: bankAccount || undefined,
                        reference: bankRef || undefined,
                    }
                    : undefined,
            attachments: files && files.length ? files : undefined,
        };

        try {
            // Get user info from cookies
            const userId = getCookie("userId");
            const branchId = context?.branchId || getCookie("branchId");
            const customerId = context?.customerId;

            console.log("[DepositModal] Context:", context);
            console.log("[DepositModal] userId:", userId, "branchId:", branchId, "customerId:", customerId);
            console.log("[DepositModal] amount:", amount, "method:", method, "date:", date);

            if (context?.type === "order") {
                // Create deposit for booking
                const depositPayload = {
                    branchId: branchId ? parseInt(branchId) : undefined,
                    customerId: customerId ? parseInt(customerId) : undefined,
                    amount,
                    paymentMethod: method,
                    paymentDate: date,
                    kind, // "DEPOSIT" | "PAYMENT"
                    note: note || undefined,
                    bankName: method === "BANK_TRANSFER" ? bankName : undefined,
                    bankAccount: method === "BANK_TRANSFER" ? bankAccount : undefined,
                    referenceNumber: method === "BANK_TRANSFER" ? bankRef : undefined,
                    cashierName: method === "CASH" ? undefined : undefined,
                    receiptNumber: method === "CASH" ? undefined : undefined,
                    createdBy: userId ? parseInt(userId) : undefined,
                };
                console.log("[DepositModal] Deposit payload:", depositPayload);
                await createDeposit(context.id, depositPayload);
            } else {
                // Record payment for invoice
                const paymentPayload = {
                    amount,
                    paymentMethod: method,
                    bankName: method === "BANK_TRANSFER" ? bankName : undefined,
                    bankAccount: method === "BANK_TRANSFER" ? bankAccount : undefined,
                    referenceNumber: method === "BANK_TRANSFER" ? bankRef : undefined,
                    cashierName: method === "CASH" ? undefined : undefined,
                    receiptNumber: method === "CASH" ? undefined : undefined,
                    note: note || undefined,
                    createdBy: userId ? parseInt(userId) : undefined,
                };
                console.log("[DepositModal] Payment payload:", paymentPayload);
                await recordPayment(context.id, paymentPayload);
            }

            if (typeof onSubmitted === "function") {
                onSubmitted(payload, context);
            }

            onClose && onClose();
        } catch (err) {
            console.error("Error submitting payment:", err);
            console.error("Error status:", err.status);
            console.error("Error data:", err.data);
            const errorMsg = err.data?.message || err.message || "Unknown error";
            setError("Không thể ghi nhận thanh toán: " + errorMsg);
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                    <div className="rounded-md bg-emerald-600 text-white p-1.5 shadow-[0_8px_24px_rgba(16,185,129,.4)]">
                        <BadgeDollarSign className="h-4 w-4" />
                    </div>

                    <div className="font-semibold text-slate-900 text-sm md:text-base leading-tight">
                        {modeLabel} ·{" "}
                        {context?.type === "order" ? "Đơn hàng" : "Hóa đơn"} #
                        {String(context?.id ?? "—")}
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-500"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 text-sm text-slate-700 leading-relaxed">
                    {context?.title ? (
                        <div className="text-[13px] text-slate-600">
                            <span className="text-slate-400">Thông tin: </span>
                            <span className="text-slate-700">
                                {context.title}
                            </span>
                        </div>
                    ) : null}

                    {/* Tổng / Đã thanh toán / Còn lại / Sau khi ghi nhận */}
                    {total > 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-2 gap-3 text-[13px] leading-relaxed">
                            <div>
                                <span className="text-slate-500">
                                    Giá trị đơn hàng:
                                </span>{" "}
                                <span className="tabular-nums font-semibold text-slate-900">
                                    {fmtVND(total)} đ
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">
                                    Đã thu:
                                </span>{" "}
                                <span className="tabular-nums text-emerald-700 font-medium">
                                    {fmtVND(paid)} đ
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">
                                    Còn lại:
                                </span>{" "}
                                <span className="tabular-nums text-amber-700 font-medium">
                                    {fmtVND(remaining)} đ
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">
                                    Sau ghi nhận:
                                </span>{" "}
                                <span className="tabular-nums text-slate-700">
                                    {fmtVND(newBalance)} đ
                                </span>
                            </div>
                        </div>
                    ) : null}

                    {/* Chọn loại ghi nhận */}
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <label
                            className={cls(
                                "px-3 py-1.5 rounded-lg border cursor-pointer text-[13px] font-medium shadow-sm transition-colors",
                                kind === "DEPOSIT"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <input
                                type="radio"
                                name="kind"
                                className="hidden"
                                checked={kind === "DEPOSIT"}
                                onChange={() => setKind("DEPOSIT")}
                            />{" "}
                            Tiền cọc
                        </label>

                        <label
                            className={cls(
                                "px-3 py-1.5 rounded-lg border cursor-pointer text-[13px] font-medium shadow-sm transition-colors",
                                kind === "PAYMENT"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <input
                                type="radio"
                                name="kind"
                                className="hidden"
                                checked={kind === "PAYMENT"}
                                onChange={() => setKind("PAYMENT")}
                            />{" "}
                            Thanh toán
                        </label>
                    </div>

                    {/* Số tiền + preset buttons */}
                    <div>
                        <div className="text-[12px] text-slate-500 mb-1">
                            Số tiền {modeLabel.toLowerCase()}
                        </div>

                        <input
                            value={displayAmount}
                            onChange={handleManualAmountChange}
                            inputMode="numeric"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 tabular-nums text-slate-900 shadow-sm outline-none placeholder-slate-400"
                            placeholder="Nhập số tiền"
                        />

                        {/* Preset row */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] text-slate-500">
                                Gợi ý:
                            </span>

                            {/* 30% */}
                            <button
                                type="button"
                                onClick={() => applyPresetPercent(30)}
                                className={cls(
                                    "px-2 py-1 rounded-lg border text-[12px] font-medium shadow-sm transition-colors",
                                    preset === "30"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                30%
                            </button>

                            {/* 50% */}
                            <button
                                type="button"
                                onClick={() => applyPresetPercent(50)}
                                className={cls(
                                    "px-2 py-1 rounded-lg border text-[12px] font-medium shadow-sm transition-colors",
                                    preset === "50"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                50%
                            </button>

                            {/* ALL */}
                            <button
                                type="button"
                                onClick={applyPresetAll}
                                className={cls(
                                    "px-2 py-1 rounded-lg border text-[12px] font-medium shadow-sm transition-colors whitespace-nowrap",
                                    preset === "ALL"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                Tất cả còn lại
                            </button>

                            {/* CUSTOM */}
                            <button
                                type="button"
                                onClick={activateCustomPresetOnly}
                                className={cls(
                                    "px-2 py-1 rounded-lg border text-[12px] font-medium shadow-sm transition-colors",
                                    preset === "CUSTOM"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                Tùy chỉnh
                            </button>

                            <span className="ml-auto text-[12px] text-slate-500">
                                Xem trước:{" "}
                                <span className="text-slate-900 font-medium tabular-nums">
                                    {fmtVND(amount)} đ
                                </span>
                            </span>
                        </div>

                        {/* Overpay warning */}
                        {overpay ? (
                            <div className="mt-1 text-[11px] text-rose-600 leading-relaxed">
                                Số tiền lớn hơn phần còn lại ({fmtVND(remaining)} đ).
                                {allowOverpay
                                    ? " Bạn vẫn có thể xác nhận (cho phép overpay)."
                                    : " Không được phép overpay."}
                            </div>
                        ) : null}
                    </div>

                    {/* Phương thức thanh toán */}
                    <div>
                        <div className="text-[12px] text-slate-500 mb-1">
                            Phương thức thanh toán
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setMethod("CASH")}
                                className={cls(
                                    "rounded-lg border px-3 py-2 flex items-center justify-center gap-2 text-[13px] font-medium shadow-sm transition-colors",
                                    method === "CASH"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <CreditCard className="h-4 w-4" /> Tiền mặt
                            </button>

                            <button
                                type="button"
                                onClick={() => setMethod("BANK_TRANSFER")}
                                className={cls(
                                    "rounded-lg border px-3 py-2 flex items-center justify-center gap-2 text-[13px] font-medium shadow-sm transition-colors text-center",
                                    method === "BANK_TRANSFER"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <CreditCard className="h-4 w-4" /> Chuyển khoản
                            </button>
                        </div>
                    </div>

                    {/* Thông tin ngân hàng nếu BANK_TRANSFER */}
                    {method === "BANK_TRANSFER" ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <div className="text-[12px] text-slate-500 mb-1">
                                    Ngân hàng
                                </div>
                                <input
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none placeholder-slate-400"
                                    placeholder="VD: Vietcombank"
                                />
                            </div>

                            <div>
                                <div className="text-[12px] text-slate-500 mb-1">
                                    Số tài khoản (bắt buộc)
                                </div>
                                <input
                                    value={bankAccount}
                                    onChange={(e) => setBankAccount(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none placeholder-slate-400"
                                    placeholder="123456789"
                                />
                            </div>

                            <div>
                                <div className="text-[12px] text-slate-500 mb-1">
                                    Mã tham chiếu
                                </div>
                                <input
                                    value={bankRef}
                                    onChange={(e) => setBankRef(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none placeholder-slate-400"
                                    placeholder="FT123..."
                                />
                            </div>
                        </div>
                    ) : null}

                    {/* Ngày thanh toán */}
                    <div>
                        <div className="text-[12px] text-slate-500 mb-1">
                            Ngày thanh toán
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent outline-none text-[13px] text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Ghi chú + chứng từ */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <div>
                            <div className="text-[12px] text-slate-500 mb-1">
                                Ghi chú
                            </div>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 shadow-sm outline-none placeholder-slate-400"
                                placeholder="Ví dụ: Cọc trước 50% theo thoả thuận"
                            />
                        </div>

                        <div>
                            <div className="text-[12px] text-slate-500 mb-1">
                                Chứng từ (tuỳ chọn)
                            </div>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors">
                                <Paperclip className="h-4 w-4 text-slate-600" />
                                Chọn file
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={onFileChange}
                                />
                            </label>

                            {files && files.length ? (
                                <div className="mt-2 text-[12px] text-slate-600 space-y-1 max-h-24 overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i}>
                                            {f.name}{" "}
                                            <span className="text-slate-400">
                                                ({Math.round(f.size / 1024)} KB)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Tips + error */}
                    <div className="flex items-start gap-2 text-[12px] text-slate-500 leading-relaxed">
                        <Info className="h-4 w-4 text-slate-400 mt-0.5" />
                        <div>
                            Điền đầy đủ thông tin. Nếu chọn chuyển khoản, bắt buộc
                            nhập{" "}
                            <b className="text-slate-700">Số tài khoản</b>. Số
                            tiền phải &gt; 0.
                            {!allowOverpay
                                ? " Không được vượt quá phần còn lại."
                                : " Nếu vượt quá phần còn lại, hệ thống vẫn cho xác nhận (demo)."}
                        </div>
                    </div>

                    {error ? (
                        <div className="text-rose-600 text-[12px]">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3 justify-between">
                    <div className="text-[11px] text-slate-500 leading-relaxed flex-1 min-w-0">
                        {context?.type === "order"
                            ? "Tạo deposit cho booking"
                            : "Ghi nhận thanh toán cho invoice"}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                            Huỷ
                        </button>

                        <button
                            onClick={submit}
                            disabled={!valid || loading}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[13px] font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? "Đang xử lý..."
                                : "Xác nhận thanh toán"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}