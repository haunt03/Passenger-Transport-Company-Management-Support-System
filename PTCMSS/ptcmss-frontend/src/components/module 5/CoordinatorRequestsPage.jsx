import React from "react";
import {
    Calendar,
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    Loader2,
    Car,
    ClipboardList,
    StickyNote,
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import { getEmployeeByUserId } from "../../api/employees";
import { getDriverExpenseRequests } from "../../api/expenses";

const cls = (...a) => a.filter(Boolean).join(" ");

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

// Map loại chi phí giống màn kế toán
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

function RequestCard({ request }) {
    // Validate request
    if (!request) {
        console.error("RequestCard: request is null or undefined");
        return null;
    }

    const typeMap = {
        PAYMENT: {
            icon: DollarSign,
            label: "Yêu cầu thanh toán",
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
    };

    const statusMap = {
        PENDING: {
            icon: Clock,
            label: "Chờ duyệt",
            color: "bg-amber-100 text-amber-700",
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

    const type = typeMap[request.type] || typeMap.PAYMENT;
    const status = statusMap[request.status] || statusMap.PENDING;
    const TypeIcon = type.icon;
    const StatusIcon = status.icon;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className={cls(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            type.bgColor
                        )}
                    >
                        <TypeIcon className={cls("h-5 w-5", type.color)} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            {type.label}
                        </div>
                        <div className="text-xs text-slate-500">
                            {fmtDate(request.createdAt)}
                        </div>
                    </div>
                </div>

                <div
                    className={cls(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                        status.color
                    )}
                >
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span>{status.label}</span>
                </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
                {request.type === "PAYMENT" && (
                    <>
                        {/* Số tiền */}
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-slate-500">
                                <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                                Số tiền:
                            </span>
                            <span className="font-semibold text-amber-700">
                                {Number(request.amount || 0).toLocaleString("vi-VN")}đ
                            </span>
                        </div>

                        {/* Loại chi phí */}
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

                        {/* Loại xe / Xe áp dụng */}
                        {request.vehiclePlate && (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                    <Car className="h-3.5 w-3.5 text-emerald-500" />
                                    Xe áp dụng:
                                </span>
                                <span className="font-medium">{request.vehiclePlate}</span>
                            </div>
                        )}

                        {/* Ghi chú chi tiết */}
                        {request.note && (
                            <div className="flex items-start gap-2">
                                <span className="inline-flex items-center gap-1 text-slate-500 mt-0.5">
                                    <StickyNote className="h-3.5 w-3.5 text-slate-400" />
                                    Ghi chú:
                                </span>
                                <span className="flex-1">{request.note}</span>
                            </div>
                        )}
                    </>
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

export default function CoordinatorRequestsPage() {
    const [loading, setLoading] = React.useState(true);
    const [requests, setRequests] = React.useState([]);
    const [error, setError] = React.useState("");

    // Tách logic load thành function riêng để tái sử dụng
    const loadRequests = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const uid = getCookie("userId");
            if (!uid) throw new Error("Không xác định được tài khoản điều phối viên.");

            // Load expense requests
            // Backend filter theo requesterUserId, nên truyền userId
            let paymentRequests = [];
            try {
                console.log("💰 [CoordinatorRequestsPage] Loading expense requests for userId:", uid);
                const expenseList = await getDriverExpenseRequests(Number(uid));
                console.log("💰 [CoordinatorRequestsPage] Expense list:", expenseList);
                const expenses = expenseList?.data || expenseList || [];
                paymentRequests = (Array.isArray(expenses) ? expenses : []).map(item => {
                    try {
                        const expenseType = item.type || item.expenseType;
                        const note =
                            item.note ||
                            item.description ||
                            item.reason ||
                            item.expenseNote;

                        return {
                            id: `payment-${item.id}`,
                            type: "PAYMENT",
                            status: item.status || "PENDING",
                            createdAt: item.createdAt,
                            amount: item.amount,
                            tripId: item.tripId,
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
                console.log("💰 [CoordinatorRequestsPage] Mapped payment requests:", paymentRequests);
            } catch (expenseErr) {
                console.warn("Could not load expense requests:", expenseErr);
                setError("Không thể tải danh sách yêu cầu thanh toán: " + (expenseErr?.message || "Lỗi không xác định"));
            }

            setRequests([...paymentRequests]);
        } catch (err) {
            console.error("Error in loadRequests:", err);
            setError(
                err?.data?.message ||
                err?.message ||
                "Không tải được danh sách yêu cầu."
            );
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        let mounted = true;
        loadRequests().catch(err => {
            if (mounted) {
                console.error("Error loading requests on mount:", err);
            }
        });
        return () => {
            mounted = false;
        };
    }, []); // Chỉ chạy 1 lần khi mount

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

    // Thống kê theo trạng thái
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
                    <FileText className="h-6 w-6 text-[#0079BC]" />
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Danh sách yêu cầu
                    </h1>
                </div>
                <p className="text-sm text-slate-600">
                    Theo dõi trạng thái các yêu cầu thanh toán của bạn
                </p>
            </div>

            {/* Stats */}
            {!loading && stats.total > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm text-slate-600 mb-1">Tổng yêu cầu</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <div className="text-sm text-amber-700 mb-1">Chờ duyệt</div>
                        <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
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

            {error && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {error}
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
                                    <RequestCard
                                        key={request.id}
                                        request={request}
                                    />
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
    );
}
