import React from "react";
import {
    ReceiptText,
    Car,
    ClipboardList,
    Check,
    X,
    Loader2,
    AlertCircle,
    ShieldCheck,
} from "lucide-react";
import { createExpenseRequest } from "../../api/expenses";
import { listVehiclesByBranch } from "../../api/vehicles";
import { listBranches, getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

const EXPENSE_TYPES = [
    { value: "MAINTENANCE", label: "Bảo dưỡng" },
    { value: "INSURANCE", label: "Bảo hiểm" },
    { value: "INSPECTION", label: "Đăng kiểm" },
    { value: "PARKING", label: "Chi phí bến bãi" },
    { value: "FUEL", label: "Nhiên liệu" },
    { value: "OTHER", label: "Khác" },
];

const BRANCH_SCOPED_ROLES = new Set([
    ROLES.MANAGER,
    ROLES.CONSULTANT,
    ROLES.COORDINATOR,
    ROLES.DRIVER,
]);

const mapBranchRecord = (raw) => {
    if (!raw) return null;
    const id = raw.branchId ?? raw.id ?? null;
    if (!id) return null;
    return {
        id: String(id),
        name: raw.branchName || raw.name || `Chi nhánh #${id}`,
    };
};

const extractBranchItems = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload)) return payload;
    return [];
};

export default function ExpenseRequestForm() {
    const role = React.useMemo(() => getCurrentRole(), []);
    const userId = React.useMemo(() => getStoredUserId(), []);
    const branchScoped = React.useMemo(
        () => BRANCH_SCOPED_ROLES.has(role),
        [role]
    );

    const [type, setType] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");
    const [vehicleOptions, setVehicleOptions] = React.useState([]);
    const [vehicleLoading, setVehicleLoading] = React.useState(false);
    const [vehicleError, setVehicleError] = React.useState("");

    const [amountInput, setAmountInput] = React.useState("");
    const [notes, setNotes] = React.useState("");
    const [branchId, setBranchId] = React.useState("");
    const [branchName, setBranchName] = React.useState("");
    const [branchLoading, setBranchLoading] = React.useState(true);
    const [branchError, setBranchError] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [success, setSuccess] = React.useState("");

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

    React.useEffect(() => {
        let cancelled = false;
        async function loadBranch() {
            setBranchLoading(true);
            setBranchError("");
            try {
                if (branchScoped) {
                    if (!userId) {
                        throw new Error("Không xác định người dùng.");
                    }
                    const detail = await getBranchByUserId(Number(userId));
                    if (cancelled) return;
                    const mapped = mapBranchRecord(detail);
                    if (!mapped) {
                        throw new Error("Không tìm thấy chi nhánh phụ trách.");
                    }
                    setBranchId(mapped.id);
                    setBranchName(mapped.name);
                } else {
                    const res = await listBranches({ page: 0, size: 100 });
                    if (cancelled) return;
                    const options = extractBranchItems(res)
                        .map(mapBranchRecord)
                        .filter(Boolean);
                    const first = options[0] || null;
                    setBranchId(first?.id || "");
                    setBranchName(first?.name || "");
                    if (!first) {
                        throw new Error("Chưa có chi nhánh khả dụng.");
                    }
                }
            } catch (err) {
                if (cancelled) return;
                setBranchId("");
                setBranchName("");
                setBranchError(
                    err?.data?.message ||
                    err?.message ||
                    "Không tải được chi nhánh."
                );
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        }
        loadBranch();
        return () => {
            cancelled = true;
        };
    }, [branchScoped, userId]);

    React.useEffect(() => {
        if (!branchId) {
            setVehicleOptions([]);
            setVehicleId("");
            return;
        }
        let cancelled = false;
        async function loadVehicles() {
            setVehicleError("");
            setVehicleLoading(true);
            try {
                const list = await listVehiclesByBranch(Number(branchId));
                if (cancelled) return;
                const mapped = (Array.isArray(list) ? list : []).map((v) => ({
                    id: String(v.id ?? v.vehicleId ?? ""),
                    plate:
                        v.licensePlate ||
                        v.plate ||
                        v.license_plate ||
                        `VEH-${v.id ?? ""}`,
                }));
                setVehicleOptions(mapped);
            } catch (err) {
                if (cancelled) return;
                setVehicleOptions([]);
                setVehicleError(
                    err?.data?.message ||
                    err?.message ||
                    "Không tải được danh sách xe."
                );
            } finally {
                if (!cancelled) setVehicleLoading(false);
            }
        }
        loadVehicles();
        return () => {
            cancelled = true;
        };
    }, [branchId]);

    const onAmountChange = (e) => {
        setError("");
        setSuccess("");
        setAmountInput(e.target.value);
    };

    const resetForm = () => {
        setType("");
        setVehicleId("");
        setAmountInput("");
        setNotes("");
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (branchLoading) {
            setError("Đang xác định chi nhánh. Vui lòng chờ.");
            return;
        }
        if (!branchId) {
            setError(branchError || "Chưa xác định chi nhánh gửi yêu cầu.");
            return;
        }
        const amount = parseAmount(amountInput);
        if (!type) {
            setError("Vui lòng chọn loại chi phí.");
            return;
        }
        if (!amount || amount <= 0) {
            setError("Số tiền không hợp lệ.");
            return;
        }

        setSubmitting(true);
        try {
            const noteClean = notes.trim();
            const payload = {
                type,
                amount,
                branchId: Number(branchId),
                vehicleId: vehicleId ? Number(vehicleId) : undefined,
                note: noteClean || undefined,
                requesterUserId: userId ? Number(userId) : undefined,
            };

            await createExpenseRequest(payload);
            setSuccess(
                `Đã gửi yêu cầu chi phí lúc ${new Date().toLocaleString(
                    "vi-VN"
                )}. Kế toán sẽ duyệt sớm.`
            );
            resetForm();
        } catch (err) {
            setError(
                err?.data?.message ||
                err?.message ||
                "Không gửi được yêu cầu. Vui lòng thử lại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 max-w-3xl mx-auto">
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
                    <div className="text-[11px] text-slate-500 mt-1">
                        Chi nhánh:{" "}
                        {branchLoading
                            ? "Đang tải..."
                            : branchName || branchError || "Chưa xác định"}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 text-sm">
                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Loại chi phí <span className="text-rose-500">*</span>
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
                            <option value="">-- Chọn loại chi phí --</option>
                            {EXPENSE_TYPES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

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
                                setVehicleId(e.target.value);
                            }}
                            disabled={vehicleLoading || branchLoading}
                            className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 disabled:opacity-60"
                        >
                            <option value="">-- Không chọn --</option>
                            {vehicleOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.plate}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {vehicleLoading
                            ? "Đang tải danh sách xe..."
                            : "Nếu chi phí không gắn cho xe cụ thể (ví dụ chi phí bến bãi chung), có thể bỏ trống."}
                    </div>
                    {vehicleError && (
                        <div className="text-[11px] text-rose-500 mt-1">
                            {vehicleError}
                        </div>
                    )}
                </div>

                <div>
                    <div className="text-xs text-slate-600 mb-1">
                        Số tiền (VND) <span className="text-rose-500">*</span>
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
                            {formatVND(parseAmount(amountInput))}
                        </span>{" "}
                        VND
                    </div>
                </div>

                <div>
                    <div className="text-xs text-slate-600 mb-1">Ghi chú</div>
                    <textarea
                        value={notes}
                        onChange={(e) => {
                            setError("");
                            setSuccess("");
                            setNotes(e.target.value);
                        }}
                        rows={3}
                        placeholder="Nội dung chi tiết, ví dụ: bảo dưỡng 5 vạn km"
                        className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                </div>

                {error && (
                    <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md px-3 py-2 text-sm shadow-sm">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <div className="leading-relaxed text-slate-700">
                            {error}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2 text-sm shadow-sm">
                        <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="leading-relaxed text-slate-700">
                            {success}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={submitting}
                        className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors ${
                            submitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        <X className="h-4 w-4 text-slate-500" />
                        <span>Xoá form</span>
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium shadow-sm transition-colors ${
                            submitting ? "opacity-50 cursor-not-allowed" : ""
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

            </form>
        </div>
    );
}