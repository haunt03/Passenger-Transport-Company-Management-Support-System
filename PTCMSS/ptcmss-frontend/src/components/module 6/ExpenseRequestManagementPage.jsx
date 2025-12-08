import React from "react";
import {
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Car,
    Building2,
    User,
    Calendar,
    AlertCircle,
    FileText,
    Loader2,
} from "lucide-react";
import {
    getPendingExpenseRequests,
    listExpenseRequests,
    approveExpenseRequest,
    rejectExpenseRequest,
} from "../../api/expenses";
import { getCurrentRole, ROLES, getStoredUserId } from "../../utils/session";
import { getBranchByUserId } from "../../api/branches";

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

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

const STATUS_COLORS = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-300",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-300",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-300",
};

const STATUS_LABELS = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
};

function StatusBadge({ status }) {
    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border",
                STATUS_COLORS[status] || "bg-gray-50 text-gray-700 border-gray-300"
            )}
        >
            {status === "PENDING" && <Clock className="h-3 w-3" />}
            {status === "APPROVED" && <CheckCircle className="h-3 w-3" />}
            {status === "REJECTED" && <XCircle className="h-3 w-3" />}
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback((msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((a) => [...a, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((a) => a.filter((t) => t.id !== id));
        }, ttl);
    }, []);
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-lg px-3 py-2 text-sm shadow border min-w-[220px] bg-white text-gray-800 border-gray-200",
                        t.kind === "success" &&
                            "bg-emerald-50 border-emerald-400 text-emerald-700",
                        t.kind === "error" &&
                            "bg-rose-50 border-rose-400 text-rose-700",
                        t.kind === "info" &&
                            "bg-white border-gray-200 text-gray-800"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

export default function ExpenseRequestManagementPage() {
    const { toasts, push } = useToasts();
    const role = getCurrentRole();
    const userId = getStoredUserId();
    const isAccountant = role === ROLES.ACCOUNTANT;
    const isManager = role === ROLES.MANAGER || role === ROLES.ADMIN;

    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [expenseRequests, setExpenseRequests] = React.useState([]);
    const [statusFilter, setStatusFilter] = React.useState("PENDING"); // Mặc định chỉ xem chờ duyệt
    const [branchId, setBranchId] = React.useState(null);
    const [branchName, setBranchName] = React.useState("");

    // Modal approve/reject
    const [modalOpen, setModalOpen] = React.useState(false);
    const [modalAction, setModalAction] = React.useState(null); // "approve" | "reject"
    const [selectedRequest, setSelectedRequest] = React.useState(null);
    const [modalNote, setModalNote] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    // Load branch for Accountant
    const [branchLoaded, setBranchLoaded] = React.useState(false);
    React.useEffect(() => {
        if (isAccountant && userId) {
            (async () => {
                try {
                    const branch = await getBranchByUserId(Number(userId));
                    if (branch?.branchId || branch?.id) {
                        setBranchId(branch.branchId || branch.id);
                        setBranchName(branch.branchName || branch.name || "");
                    }
                    setBranchLoaded(true);
                } catch (err) {
                    console.warn("Could not get branch:", err);
                    setBranchLoaded(true); // Vẫn set true để không block load requests
                }
            })();
        } else {
            setBranchLoaded(true); // Không phải Accountant thì không cần đợi
        }
    }, [isAccountant, userId]);

    // Load expense requests
    const loadExpenseRequests = React.useCallback(async () => {
        // Nếu là Accountant và chưa có branchId, đợi một chút
        if (isAccountant && !branchId && statusFilter === "PENDING" && !branchLoaded) {
            // Chờ branchId được load
            return;
        }

        setLoading(true);
        try {
            let requests = [];
            if (statusFilter === "PENDING") {
                // Lấy danh sách chờ duyệt
                const response = await getPendingExpenseRequests(isAccountant ? branchId : null);
                // apiFetch đã unwrap ResponseData, nhưng kiểm tra cả 2 trường hợp
                if (response) {
                    if (Array.isArray(response)) {
                        requests = response;
                    } else if (response?.data && Array.isArray(response.data)) {
                        requests = response.data;
                    } else if (response?.content && Array.isArray(response.content)) {
                        requests = response.content;
                    }
                }
            } else {
                // Lấy tất cả với filter
                const params = { status: statusFilter };
                if (isAccountant && branchId) {
                    params.branchId = branchId;
                }
                const response = await listExpenseRequests(params);
                // apiFetch đã unwrap ResponseData, nhưng kiểm tra cả 2 trường hợp
                if (response) {
                    if (Array.isArray(response)) {
                        requests = response;
                    } else if (response?.data && Array.isArray(response.data)) {
                        requests = response.data;
                    } else if (response?.content && Array.isArray(response.content)) {
                        requests = response.content;
                    }
                }
            }

            // Đảm bảo requests là array
            if (!Array.isArray(requests)) {
                requests = [];
            }

            // Filter theo branch nếu là Accountant (fallback nếu backend chưa filter)
            if (isAccountant && branchId && statusFilter !== "PENDING") {
                requests = requests.filter(
                    (req) => req && (req.branchId === branchId || req.branchId === Number(branchId))
                );
            }

            setExpenseRequests(requests);
        } catch (err) {
            console.error("Error loading expense requests:", err);
            push(
                "Lỗi khi tải danh sách yêu cầu: " + (err?.message || "Lỗi không xác định"),
                "error"
            );
            setExpenseRequests([]);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [statusFilter, branchId, isAccountant, branchLoaded, push]);

    // Chỉ load khi branch đã được load (nếu là Accountant)
    React.useEffect(() => {
        if (branchLoaded) {
            loadExpenseRequests();
        }
    }, [loadExpenseRequests, branchLoaded]);

    const handleApprove = (request) => {
        setSelectedRequest(request);
        setModalAction("approve");
        setModalNote("");
        setModalOpen(true);
    };

    const handleReject = (request) => {
        setSelectedRequest(request);
        setModalAction("reject");
        setModalNote("");
        setModalOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedRequest) return;

        setSubmitting(true);
        try {
            if (modalAction === "approve") {
                await approveExpenseRequest(selectedRequest.id, modalNote);
                push(`Đã duyệt yêu cầu chi phí #${selectedRequest.id}`, "success");
            } else if (modalAction === "reject") {
                await rejectExpenseRequest(selectedRequest.id, modalNote);
                push(`Đã từ chối yêu cầu chi phí #${selectedRequest.id}`, "success");
            }
            setModalOpen(false);
            setSelectedRequest(null);
            setModalNote("");
            
            // Reload list sau khi đóng modal
            setTimeout(() => {
                loadExpenseRequests();
            }, 300);
        } catch (err) {
            console.error("Error processing request:", err);
            push(
                "Lỗi khi xử lý yêu cầu: " + (err?.data?.message || err?.message || "Lỗi không xác định"),
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        loadExpenseRequests();
        push("Đã làm mới danh sách", "info");
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-5">
            <Toasts toasts={toasts} />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <DollarSign
                    className="h-6 w-6"
                    style={{ color: "#0079BC" }}
                />
                <h1 className="text-2xl font-semibold text-gray-900">
                    Quản lý yêu cầu thanh toán chi phí
                </h1>
                {isAccountant && branchName && (
                    <div className="ml-auto text-sm text-gray-600">
                        Chi nhánh: <span className="font-medium">{branchName}</span>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status filter */}
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent outline-none text-sm text-gray-800"
                        >
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Đã từ chối</option>
                            <option value="">Tất cả</option>
                        </select>
                    </div>

                    <div className="ml-auto" />

                    {/* Refresh */}
                    <button
                        onClick={onRefresh}
                        className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium shadow-sm flex items-center gap-1"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-gray-500",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" style={{ color: "#0079BC" }} />
                    Danh sách yêu cầu thanh toán chi phí
                </div>

                {initialLoading ? (
                    <div className="px-4 py-12 text-center text-gray-500 text-sm">
                        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        Đang tải dữ liệu...
                    </div>
                ) : expenseRequests.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-500">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <div className="text-sm font-medium text-gray-700">
                            {statusFilter === "PENDING"
                                ? "Không có yêu cầu nào đang chờ duyệt"
                                : "Không có yêu cầu nào"}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">ID</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Loại chi phí</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Số tiền</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Chi nhánh</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Xe</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Người yêu cầu</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Ngày tạo</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Trạng thái</th>
                                    <th className="px-3 py-2 font-medium text-gray-600 text-xs">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {expenseRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                                            #{req.id}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-800">
                                            {EXPENSE_TYPE_LABELS[req.type] || req.type}
                                        </td>
                                        <td className="px-3 py-2 text-sm font-semibold tabular-nums text-gray-900">
                                            {fmtVND(req.amount || 0)} đ
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-800">
                                            {req.branchName || `Chi nhánh #${req.branchId}`}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-800">
                                            {req.vehiclePlate || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-800">
                                            {req.requesterName || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                            {req.createdAt
                                                ? new Date(req.createdAt).toLocaleDateString("vi-VN")
                                                : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-3 py-2">
                                            {req.status === "PENDING" && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleApprove(req)}
                                                        className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                        <span>Duyệt</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(req)}
                                                        className="rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        <span>Từ chối</span>
                                                    </button>
                                                </div>
                                            )}
                                            {req.status !== "PENDING" && (
                                                <span className="text-xs text-gray-400 italic">
                                                    Đã xử lý
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="px-4 py-2 border-t border-gray-200 text-[11px] text-gray-500 bg-white">
                    Tổng: {expenseRequests.length} yêu cầu.
                    {isAccountant && branchName && ` Chỉ hiển thị yêu cầu của chi nhánh ${branchName}.`}
                </div>
            </div>

            {/* Approve/Reject Modal */}
            {modalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div
                            className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"
                            style={{ backgroundColor: "#0079BC" }}
                        >
                            <div className="text-white">
                                <h3 className="text-lg font-semibold">
                                    {modalAction === "approve" ? "Duyệt yêu cầu" : "Từ chối yêu cầu"}
                                </h3>
                                <p className="text-sm opacity-90 mt-1">
                                    Yêu cầu #{selectedRequest.id} · {fmtVND(selectedRequest.amount)} đ
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSelectedRequest(null);
                                    setModalNote("");
                                }}
                                className="text-white/80 hover:text-white"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Loại:</span>
                                    <span>{EXPENSE_TYPE_LABELS[selectedRequest.type] || selectedRequest.type}</span>
                                </div>
                                {selectedRequest.vehiclePlate && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-700">Xe:</span>
                                        <span>{selectedRequest.vehiclePlate}</span>
                                    </div>
                                )}
                                {selectedRequest.requesterName && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-700">Người yêu cầu:</span>
                                        <span>{selectedRequest.requesterName}</span>
                                    </div>
                                )}
                                {selectedRequest.note && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <span className="font-medium text-gray-700">Ghi chú:</span>
                                        <div className="text-gray-600 mt-1">{selectedRequest.note}</div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {modalAction === "approve" ? "Ghi chú duyệt (tùy chọn)" : "Lý do từ chối (tùy chọn)"}
                                </label>
                                <textarea
                                    value={modalNote}
                                    onChange={(e) => setModalNote(e.target.value)}
                                    rows={3}
                                    placeholder={
                                        modalAction === "approve"
                                            ? "Nhập ghi chú nếu cần..."
                                            : "Nhập lý do từ chối..."
                                    }
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSelectedRequest(null);
                                    setModalNote("");
                                }}
                                disabled={submitting}
                                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                disabled={submitting}
                                className={cls(
                                    "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-1",
                                    modalAction === "approve"
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-rose-600 hover:bg-rose-700",
                                    submitting && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : modalAction === "approve" ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                <span>
                                    {modalAction === "approve" ? "Duyệt" : "Từ chối"}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

