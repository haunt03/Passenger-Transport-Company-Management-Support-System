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
    Clock,
    CheckCircle2,
    XCircle,
    StickyNote,
    PlusCircle,
    Upload,
} from "lucide-react";
import { createExpenseRequest, getDriverExpenseRequests } from "../../api/expenses";
import { listVehiclesByBranch } from "../../api/vehicles";
import { listBranches, getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getCookie } from "../../utils/cookies";

const cls = (...a) => a.filter(Boolean).join(" ");

const EXPENSE_TYPES = [
    { value: "MAINTENANCE", label: "Bảo dưỡng" },
    { value: "INSURANCE", label: "Bảo hiểm" },
    { value: "INSPECTION", label: "Đăng kiểm" },
    { value: "PARKING", label: "Chi phí bến bãi" },
    { value: "FUEL", label: "Nhiên liệu" },
    { value: "OTHER", label: "Khác" },
];

const EXPENSE_TYPE_LABELS = {
    FUEL: "Nhiên liệu",
    TOLL: "Phí cầu đường",
    PARKING: "Gửi xe / Bến bãi",
    MAINTENANCE: "Bảo dưỡng",
    INSURANCE: "Bảo hiểm",
    INSPECTION: "Đăng kiểm",
    REPAIR: "Sửa chữa nhỏ",
    OTHER: "Khác",
};

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

const fmtDate = (iso) => {
    if (!iso) return "--/--/----";
    try {
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        return "--/--/----";
    }
};

// Request Card Component
function RequestCard({ request }) {
    if (!request) return null;

    const statusMap = {
        PENDING: {
            icon: Clock,
            label: "Chờ duyệt",
            color: "bg-info-100 text-info-700",
        },
        APPROVED: {
            icon: CheckCircle2,
            label: "Đã duyệt",
            color: "bg-emerald-100 text-emerald-700",
        },
        REJECTED: {
            icon: XCircle,
            label: "Từ chối",
            color: "bg-rose-100 text-rose-700",
        },
        CANCELLED: {
            icon: XCircle,
            label: "Đã hủy",
            color: "bg-slate-100 text-slate-700",
        },
    };

    const status = statusMap[request.status] || statusMap.PENDING;
    const StatusIcon = status.icon;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-info-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            Yêu cầu thanh toán
                        </div>
                        <div className="text-xs text-slate-500">
                            {fmtDate(request.createdAt)}
                        </div>
                    </div>
                </div>

                <div className={cls("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", status.color)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span>{status.label}</span>
                </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                        <DollarSign className="h-3.5 w-3.5 text-info-500" />
                        Số tiền:
                    </span>
                    <span className="font-semibold text-info-700">
                        {Number(request.amount || 0).toLocaleString("vi-VN")}đ
                    </span>
                </div>

                {request.expenseType && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                            <ClipboardList className="h-3.5 w-3.5 text-sky-500" />
                            Loại chi phí:
                        </span>
                        <span className="font-medium">
                            {EXPENSE_TYPE_LABELS[request.expenseType] || request.expenseType}
                        </span>
                    </div>
                )}

                {request.vehiclePlate && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-slate-500">
                            <Car className="h-3.5 w-3.5 text-emerald-500" />
                            Xe áp dụng:
                        </span>
                        <span className="font-medium">{request.vehiclePlate}</span>
                    </div>
                )}

                {request.note && (
                    <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 text-slate-500 mt-0.5">
                            <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                            Ghi chú:
                        </span>
                        <span className="flex-1">{request.note}</span>
                    </div>
                )}

                {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                        <div className="flex items-start gap-1">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-medium">Lý do từ chối:</div>
                                <div>{request.rejectionReason}</div>
                            </div>
                        </div>
                    </div>
                )}

                {request.status === "APPROVED" && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                        <div className="flex items-start gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-medium">Đã được duyệt bởi kế toán</div>
                                {request.approvedAt && (
                                    <div className="text-[11px] mt-1">
                                        Ngày duyệt: {fmtDate(request.approvedAt)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CoordinatorExpenseManagementPage() {
    const [activeTab, setActiveTab] = React.useState("list"); // "create" or "list", mặc định xem danh sách

    const role = React.useMemo(() => getCurrentRole(), []);
    const userId = React.useMemo(() => getStoredUserId(), []);
    const branchScoped = React.useMemo(() => BRANCH_SCOPED_ROLES.has(role), [role]);

    // Form state (for Create tab)
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

    // List state (for List tab)
    const [loading, setLoading] = React.useState(false);
    const [requests, setRequests] = React.useState([]);
    const [listError, setListError] = React.useState("");

    // File attachments state
    const [files, setFiles] = React.useState([]); // [{ file, name, size, type }]

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

    // Load branch
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
    }, [branchScoped, userId, role]);

    // Load vehicles
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
                const list = await listVehiclesByBranch(Number(branchId), null);
                if (cancelled) return;
                const mapped = (Array.isArray(list) ? list : []).map((v) => ({
                    id: String(v.id ?? v.vehicleId ?? ""),
                    plate: v.licensePlate || v.plate || v.license_plate || `VEH-${v.id ?? ""}`,
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

    // Load requests (for List tab)
    const loadRequests = React.useCallback(async () => {
        setLoading(true);
        setListError("");
        try {
            const uid = getCookie("userId");
            if (!uid) throw new Error("Không xác định được tài khoản điều phối viên.");

            let paymentRequests = [];
            try {
                const expenseList = await getDriverExpenseRequests(Number(uid));
                const expenses = expenseList?.data || expenseList || [];
                paymentRequests = (Array.isArray(expenses) ? expenses : []).map(item => {
                    try {
                        const expenseType = item.type || item.expenseType;
                        const note = item.note || item.description || item.reason || item.expenseNote;

                        return {
                            id: `payment-${item.id}`,
                            type: "PAYMENT",
                            status: item.status || "PENDING",
                            createdAt: item.createdAt,
                            amount: item.amount,
                            expenseType,
                            vehiclePlate: item.vehiclePlate || item.licensePlate || item.vehiclePlateNumber,
                            note,
                            rejectionReason: item.rejectionReason || item.rejectReason,
                            approvedAt: item.approvedAt || item.approvedDate,
                        };
                    } catch (mapErr) {
                        console.error("Error mapping expense item:", mapErr, item);
                        return null;
                    }
                }).filter(Boolean);
            } catch (expenseErr) {
                console.warn("Could not load expense requests:", expenseErr);
                setListError("Không thể tải danh sách yêu cầu thanh toán: " + (expenseErr?.message || "Lỗi không xác định"));
            }

            setRequests([...paymentRequests]);
        } catch (err) {
            console.error("Error in loadRequests:", err);
            setListError(
                err?.data?.message ||
                err?.message ||
                "Không tải được danh sách yêu cầu."
            );
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load requests when switching to list tab
    React.useEffect(() => {
        if (activeTab === "list") {
            loadRequests();
        }
    }, [activeTab, loadRequests]);

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
        setFiles([]);
        setError("");
        setSuccess("");
    };

    const onFilesChange = (e) => {
        const incoming = Array.from(e.target.files || []).map((file) => ({
            file,
            name: file.name,
            size: file.size,
            type: file.type,
        }));
        if (!incoming.length) return;
        setFiles((prev) => [...prev, ...incoming]);
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
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

            // Build multipart FormData to gửi cho backend (kèm ảnh chứng từ)
            const formData = new FormData();
            formData.append("type", type);
            formData.append("amount", String(amount));
            formData.append("branchId", String(branchId));
            if (vehicleId) {
                formData.append("vehicleId", String(vehicleId));
            }
            if (noteClean) {
                formData.append("note", noteClean);
            }
            if (userId) {
                formData.append("requesterUserId", String(userId));
            }
            files.forEach((f) => {
                if (f && f.file) {
                    formData.append("files", f.file);
                }
            });

            await createExpenseRequest(formData);
            setSuccess(
                `Đã gửi yêu cầu chi phí lúc ${new Date().toLocaleString("vi-VN")}. Kế toán sẽ duyệt sớm.`
            );
            resetForm();
            // Tự động chuyển sang tab danh sách và reload
            setTimeout(() => {
                setActiveTab("list");
                loadRequests();
            }, 1500);
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

    const sortedRequests = React.useMemo(() => {
        if (!Array.isArray(requests)) return [];
        return [...requests].sort((a, b) => {
            try {
                const aTime = new Date(a?.createdAt || 0).getTime();
                const bTime = new Date(b?.createdAt || 0).getTime();
                return bTime - aTime;
            } catch (err) {
                console.error("Error sorting requests:", err);
                return 0;
            }
        });
    }, [requests]);

    const stats = React.useMemo(() => {
        const pending = sortedRequests.filter(r => r.status === "PENDING").length;
        const approved = sortedRequests.filter(r => r.status === "APPROVED").length;
        const rejected = sortedRequests.filter(r => r.status === "REJECTED").length;
        return { pending, approved, rejected, total: sortedRequests.length };
    }, [sortedRequests]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-[#0079BC] flex items-center justify-center shadow-lg">
                        <ReceiptText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Quản lý yêu cầu thanh toán
                        </h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Tạo và theo dõi các yêu cầu thanh toán chi phí
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-1 inline-flex">
                <button
                    onClick={() => {
                        setActiveTab("list");
                        if (requests.length === 0) loadRequests();
                    }}
                    className={cls(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                        activeTab === "list"
                            ? "bg-sky-50 text-sky-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <FileText className="h-4 w-4" />
                    Danh sách yêu cầu
                    {stats.pending > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-info-500 text-white rounded-full">
                            {stats.pending}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("create")}
                    className={cls(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                        activeTab === "create"
                            ? "bg-sky-50 text-sky-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                >
                    <PlusCircle className="h-4 w-4" />
                    Tạo yêu cầu
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "create" ? (
                <div className="max-w-3xl mx-auto">
                    {/* Branch Info Card */}
                    {branchName && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
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
                        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <div className="flex items-center gap-2 text-sm text-rose-700">
                                <AlertCircle className="h-4 w-4" />
                                <span>{branchError}</span>
                            </div>
                        </div>
                    )}

                    {/* Form Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-sky-600" />
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

                            {/* File attachments */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-slate-500" />
                                    Ảnh chứng từ gửi kế toán
                                    <span className="text-xs text-slate-500 font-normal">(tùy chọn)</span>
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50">
                                        <Upload className="h-4 w-4 text-sky-600" />
                                        <span>Thêm ảnh</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            multiple
                                            onChange={onFilesChange}
                                        />
                                    </label>
                                    {files.length > 0 && (
                                        <span className="text-xs text-slate-500">
                                            Đã chọn {files.length} file
                                        </span>
                                    )}
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 text-sm divide-y divide-slate-200">
                                        {files.map((f, idx) => (
                                            <div key={idx} className="flex items-center gap-3 px-3 py-2">
                                                <div className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-slate-800 truncate">{f.name}</div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {(f.size / 1024).toFixed(0)} KB
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                                    title="Xóa file"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
            ) : (
                <div>
                    {/* Stats */}
                    {!loading && stats.total > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="text-sm text-slate-600 mb-1">Tổng yêu cầu</div>
                                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                            </div>
                            <div className="rounded-xl border border-info-200 bg-info-50 p-4 shadow-sm">
                                <div className="text-sm text-info-700 mb-1">Chờ duyệt</div>
                                <div className="text-2xl font-bold text-info-700">{stats.pending}</div>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                                <div className="text-sm text-emerald-700 mb-1">Đã duyệt</div>
                                <div className="text-2xl font-bold text-emerald-700">{stats.approved}</div>
                            </div>
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                                <div className="text-sm text-rose-700 mb-1">Từ chối</div>
                                <div className="text-2xl font-bold text-rose-700">{stats.rejected}</div>
                            </div>
                        </div>
                    )}

                    {listError && (
                        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                            {listError}
                        </div>
                    )}

                    {loading && (
                        <div className="text-sm text-slate-500">
                            Đang tải danh sách yêu cầu...
                        </div>
                    )}

                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedRequests.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-slate-500">
                                    Bạn chưa có yêu cầu nào
                                </div>
                            ) : (
                                sortedRequests.map((request) => {
                                    try {
                                        if (!request || !request.id) {
                                            console.warn("Invalid request item:", request);
                                            return null;
                                        }
                                        return (
                                            <RequestCard key={request.id} request={request} />
                                        );
                                    } catch (err) {
                                        console.error("Error rendering RequestCard:", err, request);
                                        return (
                                            <div key={request?.id || Math.random()} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                                                <div className="text-sm text-rose-700">
                                                    Lỗi hiển thị yêu cầu
                                                </div>
                                            </div>
                                        );
                                    }
                                })
                            )}
                        </div>
                    )}

                    <div className="mt-6 text-xs text-slate-500 leading-relaxed">
                        Lưu ý: Các yêu cầu sẽ được xử lý trong vòng 24-48 giờ. Bạn sẽ nhận được
                        thông báo khi có cập nhật.
                    </div>
                </div>
            )}
        </div>
    );
}

