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
    Building2,
    DollarSign,
    FileText,
} from "lucide-react";
import { createExpenseRequest } from "../../api/expenses";
import { listVehiclesByBranch } from "../../api/vehicles";
import { listBranches, getBranchByUserId } from "../../api/branches";
import { getDriverProfileByUser } from "../../api/drivers";
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
    const [driverId, setDriverId] = React.useState(null);

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

                    // Nếu là Driver, lấy driverId để filter xe
                    if (role === ROLES.DRIVER) {
                        try {
                            const driverProfile = await getDriverProfileByUser(Number(userId));
                            if (cancelled) return;
                            if (driverProfile?.driverId) {
                                setDriverId(driverProfile.driverId);
                            }
                        } catch (err) {
                            console.warn("Could not get driver profile:", err);
                            // Không throw error, chỉ log warning
                        }
                    }
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
    }, [branchScoped, userId, role]);

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
                // Nếu là Driver và có driverId, chỉ lấy xe mà driver đã lái
                const list = await listVehiclesByBranch(Number(branchId), driverId || null);
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
    }, [branchId, driverId]);

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header Section */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <ReceiptText className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Yêu cầu thanh toán chi phí</h1>
                        <p className="text-sm text-slate-600 mt-1">Gửi đề nghị chi tiêu nội bộ để kế toán xử lý</p>
                    </div>
                </div>

                {/* Branch Info Card */}
                {branchName && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Chi nhánh</div>
                                <div className="text-sm font-semibold text-slate-900">
                                    {branchLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    ) : (
                                        branchName
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {branchError && (
                    <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                        <div className="flex items-center gap-2 text-sm text-rose-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{branchError}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
                <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Thông tin yêu cầu</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Expense Type */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-slate-500" />
                            Loại chi phí <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={type}
                            onChange={(e) => {
                                setError("");
                                setSuccess("");
                                setType(e.target.value);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                            <option value="">-- Chọn loại chi phí --</option>
                            {EXPENSE_TYPES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vehicle Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Car className="h-4 w-4 text-slate-500" />
                            Áp dụng cho xe <span className="text-xs text-slate-500 font-normal">(tùy chọn)</span>
                        </label>
                        <select
                            value={vehicleId}
                            onChange={(e) => {
                                setError("");
                                setSuccess("");
                                setVehicleId(e.target.value);
                            }}
                            disabled={vehicleLoading || branchLoading}
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <option value="">-- Không chọn --</option>
                            {vehicleOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.plate}
                                </option>
                            ))}
                        </select>
                        <div className="text-xs text-slate-500 leading-relaxed">
                            {vehicleLoading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Đang tải danh sách xe...</span>
                                </div>
                            ) : (
                                "Nếu chi phí không gắn cho xe cụ thể (ví dụ chi phí bến bãi chung), có thể bỏ trống."
                            )}
                        </div>
                        {vehicleError && (
                            <div className="text-xs text-rose-600 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{vehicleError}</span>
                            </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-slate-500" />
                            Số tiền (VND) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ví dụ: 2.000.000 hoặc 2000000"
                            value={amountInput}
                            onChange={onAmountChange}
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="text-xs text-emerald-700 mb-1">Giá trị sẽ gửi:</div>
                            <div className="text-lg font-bold text-emerald-900 tabular-nums">
                                {formatVND(parseAmount(amountInput))} <span className="text-sm font-normal">VND</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            Ghi chú <span className="text-xs text-slate-500 font-normal">(tùy chọn)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => {
                                setError("");
                                setSuccess("");
                                setNotes(e.target.value);
                            }}
                            rows={4}
                            placeholder="Nội dung chi tiết, ví dụ: bảo dưỡng 5 vạn km"
                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-rose-900 mb-1">Lỗi</div>
                                    <div className="text-sm text-rose-800 leading-relaxed">{error}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-emerald-900 mb-1">Thành công</div>
                                    <div className="text-sm text-emerald-800 leading-relaxed">{success}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={submitting}
                            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                <span>Đặt lại</span>
                            </div>
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || branchLoading}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                        >
                            {submitting ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Đang gửi...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    <span>Gửi yêu cầu</span>
                                </div>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
