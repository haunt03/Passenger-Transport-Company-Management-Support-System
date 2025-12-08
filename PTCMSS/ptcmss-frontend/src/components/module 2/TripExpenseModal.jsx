import React from "react";
import {
    Receipt,
    DollarSign,
    Paperclip,
    Upload,
    X,
    Info,
} from "lucide-react";

/**
 * TripExpenseModal – M2.S7 (light theme)
 *
 * Mục đích:
 *  - Tài xế báo cáo chi phí phát sinh trong chuyến đi (xăng, cầu đường, gửi xe...)
 *  - Gửi lên kế toán / điều phối để duyệt hoàn tiền
 *
 * Props:
 *  - open: boolean
 *  - tripId: number | string
 *  - tripLabel?: string
 *  - onClose: () => void
 *  - onSubmitted?: (payload, ctx) => void
 *
 * API dự kiến:
 *  POST /api/driver/trips/{tripId}/expenses
 *    FormData:
 *      type=FUEL
 *      amount=500000
 *      notes="..."
 *      receipt_image[0]=<file>
 */

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

export default function TripExpenseModal({
                                             open,
                                             tripId,
                                             tripLabel,
                                             vehicleId,
                                             onClose,
                                             onSubmitted,
                                         }) {
    const [costType, setCostType] = React.useState("FUEL"); // FUEL | TOLL | PARKING | REPAIR
    const [amountStr, setAmountStr] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [files, setFiles] = React.useState([]); // [{file, name, size, type}]
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    // reset form khi modal mở lại
    React.useEffect(() => {
        if (open) {
            setCostType("FUEL");
            setAmountStr("");
            setNotes("");
            setFiles([]);
            setLoading(false);
            setError("");
        }
    }, [open]);

    if (!open) return null;

    // chỉ nhận số
    const cleanDigits = (s) => String(s || "").replace(/[^0-9]/g, "");
    const amount = Number(cleanDigits(amountStr || ""));
    const valid = costType && amount > 0;

    const COST_TYPE_LABEL = {
        FUEL: "Xăng / Dầu",
        TOLL: "Phí cầu đường",
        PARKING: "Gửi xe / Bến bãi",
        REPAIR: "Sửa chữa nhỏ",
    };

    // thêm file chứng từ (giữ các file trước đó)
    const onFileChange = (e) => {
        const list = Array.from(e.target.files || []).map((f) => ({
            file: f,
            name: f.name,
            size: f.size,
            type: f.type,
        }));
        setFiles((prev) => [...prev, ...list]);
    };

    const removeFile = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    async function handleSubmit() {
        if (!valid) {
            setError("Vui lòng nhập loại chi phí và số tiền hợp lệ.");
            return;
        }

        setLoading(true);
        setError("");

        // build FormData như backend mong đợi
        const fd = new FormData();
        fd.append("type", costType);
        fd.append("amount", String(amount));
        fd.append("notes", notes || "");
        files.forEach((fObj, i) => {
            fd.append("receipt_image[" + i + "]", fObj.file);
        });

        try {
            // Import API function
            const { createExpenseRequest } = await import("../../api/expenses");
            const { getStoredUserId } = await import("../../utils/session");
            const { getBranchByUserId } = await import("../../api/branches");
            
            // Get user context
            const userId = getStoredUserId();
            if (!userId) {
                throw new Error("Bạn cần đăng nhập để gửi yêu cầu chi phí");
            }
            
            // Get branch from user
            let branchId = null;
            try {
                const branch = await getBranchByUserId(userId);
                branchId = branch?.branchId || branch?.id;
            } catch (err) {
                console.warn("Could not get branch:", err);
            }
            
            if (!branchId) {
                throw new Error("Không thể xác định chi nhánh. Vui lòng thử lại.");
            }
            
            // Build FormData for ExpenseRequestController
            // Expected fields: type, amount, note, branchId, vehicleId (optional), requesterUserId
            const expenseFormData = new FormData();
            expenseFormData.append("type", costType);
            expenseFormData.append("amount", String(amount));
            expenseFormData.append("note", notes || "");
            expenseFormData.append("branchId", String(branchId));
            if (userId) {
                expenseFormData.append("requesterUserId", String(userId));
            }
            // Add vehicleId from trip context if available
            if (vehicleId != null) {
                expenseFormData.append("vehicleId", String(vehicleId));
            }
            
            // Add files (ExpenseRequestController expects "files" parameter)
            files.forEach((fObj) => {
                expenseFormData.append("files", fObj.file);
            });

            const data = await createExpenseRequest(expenseFormData);

            if (typeof onSubmitted === "function") {
                onSubmitted(
                    {
                        type: costType,
                        amount,
                        notes,
                        attachments: files.map((f) => ({
                            name: f.name,
                            size: f.size,
                            type: f.type,
                        })),
                    },
                    {
                        tripId,
                        expenseRequestId: data?.id || data?.expenseRequestId,
                    }
                );
            }

            if (typeof onClose === "function") onClose();
        } catch (err) {
            console.error("Error submitting trip expense:", err);
            setError(
                err.message || "Không thể gửi yêu cầu chi phí. Vui lòng thử lại."
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
                    <div className="flex-none rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-600 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                        <Receipt className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 leading-none">
                            Báo cáo chi phí phát sinh
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                            Chuyến #{String(tripId ?? "—")}
                            {tripLabel ? " · " + tripLabel : ""}
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
                    {/* Loại chi phí */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 font-medium">
                            Loại chi phí
                        </div>
                        <select
                            value={costType}
                            onChange={(e) => setCostType(e.target.value)}
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900"
                            )}
                        >
                            <option value="FUEL">{COST_TYPE_LABEL.FUEL}</option>
                            <option value="TOLL">{COST_TYPE_LABEL.TOLL}</option>
                            <option value="PARKING">{COST_TYPE_LABEL.PARKING}</option>
                            <option value="REPAIR">{COST_TYPE_LABEL.REPAIR}</option>
                        </select>
                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Chọn đúng nhóm chi phí để kế toán xử lý nhanh hơn.
                        </div>
                    </div>

                    {/* Số tiền */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[12px] text-slate-600 font-medium">
                                Số tiền
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
                            onChange={(e) =>
                                setAmountStr(cleanDigits(e.target.value))
                            }
                            inputMode="numeric"
                            placeholder="0"
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 tabular-nums text-base outline-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                            )}
                        />
                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            Nhập số tiền thực tế bạn đã chi.
                        </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 font-medium">
                            Ghi chú (tuỳ chọn)
                        </div>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ví dụ: Đổ dầu tại Km34, có hoá đơn VAT"
                            className={cls(
                                "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none resize-none shadow-sm",
                                "focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                            )}
                        />
                    </div>

                    {/* Upload chứng từ */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="text-[12px] text-slate-600 font-medium">
                                Ảnh chứng từ / hoá đơn
                            </div>
                            <div className="text-[10px] text-slate-500 bg-slate-100 border border-slate-300 rounded px-1.5 py-[2px]">
                                khuyến khích
                            </div>
                        </div>

                        <label
                            className={cls(
                                "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-medium",
                                "text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-sm"
                            )}
                        >
                            <Upload className="h-4 w-4 text-amber-600" />
                            <span>Tải ảnh / Chụp hoá đơn</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={onFileChange}
                            />
                        </label>

                        {files.length > 0 ? (
                            <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50/70 text-[13px] divide-y divide-slate-200 shadow-inner">
                                {files.map((f, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-2 px-3 py-2 text-slate-700"
                                    >
                                        <div className="flex-none rounded-md bg-white border border-slate-300 p-2 shadow-sm">
                                            <Paperclip className="h-4 w-4 text-slate-500" />
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-slate-800 font-medium truncate leading-tight">
                                                {f.name}
                                            </div>
                                            <div className="text-[10px] text-slate-500 leading-tight">
                                                {Math.round(f.size / 1024)}KB ·{" "}
                                                {f.type || "image"}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => removeFile(i)}
                                            className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-400 hover:text-slate-600"
                                            title="Xoá file"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                Chụp vé cầu đường, hoá đơn xăng, biên lai gửi xe...
                            </div>
                        )}
                    </div>

                    {/* Hint / Error */}
                    {!valid ? (
                        <div className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
                            <Info className="h-4 w-4 mt-0.5 text-slate-400" />
                            <div>
                                Điền đầy đủ <b>Loại chi phí</b> và{" "}
                                <b>Số tiền</b> trước khi gửi.
                            </div>
                        </div>
                    ) : null}

                    {error ? (
                        <div className="text-rose-600 text-[11px] leading-relaxed">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center gap-3 justify-between bg-slate-50 rounded-b-2xl flex-shrink-0">
                    {/* <div className="text-[11px] text-slate-500 leading-snug break-all">
                        Endpoint dự kiến:
                        <br />
                        <code className="text-slate-700">
                            /api/driver/trips/{String(tripId ?? "—")}/expenses
                        </code>
                    </div> */}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm"
                        >
                            Huỷ
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={!valid || loading}
                            className={cls(
                                "rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm",
                                "bg-sky-600 hover:bg-sky-500",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
