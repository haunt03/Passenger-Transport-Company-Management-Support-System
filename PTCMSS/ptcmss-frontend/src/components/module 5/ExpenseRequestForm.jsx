import React from "react";
import {
    ReceiptText,
    Upload,
    Car,
    ClipboardList,
    Check,
    X,
    Loader2,
    AlertCircle,
    ShieldCheck,
} from "lucide-react";

/**
 * ExpenseRequestForm – light theme (giống AdminBranchListPage)
 * - EXPENSE_TYPES & VEHICLES cứng
 * - Submit POST /api/v1/expenses (multipart nếu có files)
 * - Toàn bộ màu sắc, button, card theo hệ sáng sky-600 / slate-200
 */

const EXPENSE_TYPES = [
    { value: "MAINTENANCE", label: "Bảo dưỡng" },
    { value: "INSURANCE", label: "Bảo hiểm" },
    { value: "INSPECTION", label: "Đăng kiểm" },
    { value: "PARKING", label: "Chi phí bến bãi" },
    { value: "OTHER", label: "Khác" },
];

const VEHICLES = [
    { id: 55, plate: "29A-123.45" },
    { id: 58, plate: "30G-678.90" },
    { id: 60, plate: "88C-000.11" },
];

export default function ExpenseRequestForm() {
    const [type, setType] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");
    const [amountInput, setAmountInput] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [files, setFiles] = React.useState([]);

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");

    // ===== Helpers =====
    const parseAmount = (raw) => {
        const digits = (raw || "").replace(/[^0-9]/g, "");
        return digits ? Number(digits) : 0;
    };

    const formatVND = (n) => {
        try {
            return new Intl.NumberFormat("vi-VN").format(n);
        } catch {
            return String(n);
        }
    };

    const onAmountChange = (e) => {
        setError("");
        setSuccess("");
        setAmountInput(e.target.value);
    };

    const onPickFiles = (e) => {
        const selected = Array.from(e.target.files || []);
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024; // 10MB

        const valid = [];
        let rejected = 0;

        for (const f of selected) {
            if (f.size <= maxSize && valid.length < maxFiles) {
                valid.push(f);
            } else {
                rejected++;
            }
        }

        setFiles(valid);

        if (rejected > 0) {
            setError(
                `${rejected} file bị bỏ qua (quá 10MB hoặc vượt quá ${maxFiles} file).`
            );
            setSuccess("");
        }
    };

    const resetForm = () => {
        setType("");
        setVehicleId("");
        setAmountInput("");
        setNotes("");
        setFiles([]);
        setError("");
        // giữ success để user vẫn thấy "đã gửi"
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const amount = parseAmount(amountInput);
        if (!type) {
            setError("Vui lòng chọn Loại chi phí.");
            return;
        }
        if (!amount || amount <= 0) {
            setError("Số tiền không hợp lệ.");
            return;
        }

        setSubmitting(true);
        try {
            const notesClean = notes.trim();

            if (files.length > 0) {
                // multipart/form-data
                const form = new FormData();
                form.append("type", type);
                if (vehicleId)
                    form.append("vehicle_id", String(vehicleId));
                form.append("amount", String(amount));
                if (notesClean) form.append("notes", notesClean);
                files.forEach((f) =>
                    form.append("attachments[]", f)
                );

                const r = await fetch("/api/v1/expenses", {
                    method: "POST",
                    body: form,
                });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
            } else {
                // JSON
                const payload = {
                    type,
                    amount,
                };
                if (vehicleId)
                    payload.vehicle_id = Number(vehicleId);
                if (notesClean) payload.notes = notesClean;

                const r = await fetch("/api/v1/expenses", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
            }

            setSuccess(
                `Đã gửi yêu cầu chi phí tới Kế toán duyệt (${new Date().toLocaleString(
                    "vi-VN"
                )}).`
            );
            resetForm();
        } catch (err) {
            console.error(err);
            setError(
                "Gửi yêu cầu thất bại. Vui lòng thử lại hoặc kiểm tra kết nối."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm overflow-hidden">
            {/* HEADER giống branch list header */}
            <div className="flex items-start gap-3 px-4 py-4 border-b border-slate-200 bg-slate-50">
                <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                    <ReceiptText className="h-5 w-5" />
                </div>

                <div className="flex flex-col">
                    <div className="text-[11px] text-slate-500 leading-none mb-1">
                        Gửi đề nghị chi tiêu nội bộ
                    </div>
                    <div className="text-slate-900 font-semibold leading-tight">
                        Tạo yêu cầu chi phí
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="p-4 space-y-4 text-sm"
            >
                {/* Loại chi phí */}
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Loại chi phí{" "}
                        <span className="text-rose-500">*</span>
                    </div>
                    <div className="relative">
                        <ClipboardList className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={type}
                            onChange={(e) => {
                                setError("");
                                setSuccess("");
                                setType(e.target.value);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                        >
                            <option value="">
                                -- Chọn loại chi phí --
                            </option>
                            {EXPENSE_TYPES.map((t) => (
                                <option
                                    key={t.value}
                                    value={t.value}
                                >
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Xe (optional) */}
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Áp dụng cho xe (tùy chọn)
                    </div>
                    <div className="relative">
                        <Car className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={vehicleId}
                            onChange={(e) => {
                                setError("");
                                setSuccess("");
                                setVehicleId(
                                    e.target.value
                                );
                            }}
                            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                        >
                            <option value="">
                                -- Không chọn --
                            </option>
                            {VEHICLES.map((v) => (
                                <option
                                    key={v.id}
                                    value={v.id}
                                >
                                    {v.plate} (#{v.id})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Nếu chi phí không gắn cho xe cụ thể
                        (ví dụ chi phí bến bãi chung), có thể bỏ
                        trống.
                    </div>
                </div>

                {/* Số tiền */}
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Số tiền (VND){" "}
                        <span className="text-rose-500">*</span>
                    </div>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ví dụ: 2.000.000 hoặc 2000000"
                        value={amountInput}
                        onChange={onAmountChange}
                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                    <div className="text-[11px] text-slate-500 mt-1">
                        Giá trị sẽ gửi:{" "}
                        <span className="text-slate-900 font-mono tabular-nums">
                            {formatVND(
                                parseAmount(amountInput)
                            )}
                        </span>{" "}
                        VND
                    </div>
                </div>

                {/* Ghi chú */}
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Ghi chú
                    </div>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => {
                            setError("");
                            setSuccess("");
                            setNotes(e.target.value);
                        }}
                        placeholder="Nội dung chi tiết, ví dụ: Bảo dưỡng 5 vạn km"
                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                </div>

                {/* Upload chứng từ */}
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Upload chứng từ (tối đa 5 file, mỗi file ≤
                        10MB)
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer transition-colors">
                            <Upload className="h-4 w-4 text-slate-500" />
                            <span>Chọn file</span>
                            <input
                                type="file"
                                multiple
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={onPickFiles}
                            />
                        </label>

                        {files.length > 0 && (
                            <div className="text-[11px] text-slate-500">
                                Đã chọn {files.length} file
                            </div>
                        )}
                    </div>

                    {files.length > 0 && (
                        <ul className="mt-2 text-[12px] leading-4 text-slate-700 space-y-1">
                            {files.map((f, i) => (
                                <li
                                    key={`${f.name}-${i}`}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <span className="truncate">
                                        {f.name} ·{" "}
                                        {(f.size / 1024).toFixed(
                                            0
                                        )}{" "}
                                        KB
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFiles(
                                                (arr) =>
                                                    arr.filter(
                                                        (
                                                            _,
                                                            idx
                                                        ) =>
                                                            idx !==
                                                            i
                                                    )
                                            )
                                        }
                                        className="text-slate-400 hover:text-slate-600 text-[11px]"
                                        title="Bỏ file này"
                                    >
                                        <X className="inline-block h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-3 py-2 text-sm shadow-sm">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <div className="leading-relaxed text-slate-700">
                            {error}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-md px-3 py-2 text-sm shadow-sm">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="leading-relaxed text-slate-700">
                            {success}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {/* Reset form */}
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={submitting}
                        className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors ${
                            submitting
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                        }`}
                    >
                        <X className="h-4 w-4 text-slate-500" />
                        <span>Xoá form</span>
                    </button>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
                            submitting
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                        }`}
                    >
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Check className="h-4 w-4 text-white" />
                        )}
                        <span>Gửi yêu cầu</span>
                    </button>
                </div>

                {/* Debug preview (QA) */}
                <div className="text-[11px] text-slate-500 font-mono leading-relaxed break-all bg-slate-50 border border-slate-200 rounded-md p-3 shadow-inner">
                    POST /api/v1/expenses{"\n"}
                    {JSON.stringify(
                        {
                            type,
                            vehicle_id:
                                vehicleId || undefined,
                            amount: parseAmount(
                                amountInput
                            ),
                            notes:
                                notes.trim() ||
                                undefined,
                            attachments: files.map(
                                (f) => f.name
                            ),
                        },
                        null,
                        2
                    )}
                </div>
            </form>
        </div>
    );
}
