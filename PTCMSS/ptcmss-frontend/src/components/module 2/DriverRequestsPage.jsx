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
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import { getDriverProfileByUser, getDriverRequests, cancelDayOffRequest } from "../../api/drivers";

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

function RequestCard({ request, onCancel, cancellingId }) {
    // Validate request
    if (!request) {
        console.error("RequestCard: request is null or undefined");
        return null;
    }

    const typeMap = {
        LEAVE: {
            icon: Calendar,
            label: "Xin nghỉ phép",
            color: "text-sky-600",
            bgColor: "bg-sky-50",
        },
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

    const type = typeMap[request.type] || typeMap.LEAVE;
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
                {request.type === "LEAVE" && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Từ ngày:</span>
                            <span className="font-medium">{fmtDate(request.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Đến ngày:</span>
                            <span className="font-medium">{fmtDate(request.endDate)}</span>
                        </div>
                        {request.reason && (
                            <div className="flex items-start gap-2">
                                <span className="text-slate-500">Lý do:</span>
                                <span className="flex-1">{request.reason}</span>
                            </div>
                        )}
                    </>
                )}

                {request.type === "PAYMENT" && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Số tiền:</span>
                            <span className="font-semibold text-amber-700">
                                {Number(request.amount || 0).toLocaleString("vi-VN")}đ
                            </span>
                        </div>
                        {request.tripId && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Chuyến:</span>
                                <span className="font-medium">#{request.tripId}</span>
                            </div>
                        )}
                        {request.description && (
                            <div className="flex items-start gap-2">
                                <span className="text-slate-500">Mô tả:</span>
                                <span className="flex-1">{request.description}</span>
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
            </div>

            {/* Cancel button for PENDING or APPROVED leave requests */}
            {request.type === "LEAVE" &&
                (request.status === "PENDING" || request.status === "APPROVED") &&
                onCancel && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <button
                            onClick={() => onCancel(request)}
                            disabled={cancellingId === request.id}
                            className="w-full px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {cancellingId === request.id ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang hủy...
                                </>
                            ) : (
                                "Hủy yêu cầu nghỉ phép"
                            )}
                        </button>
                    </div>
                )}
        </div>
    );
}

export default function DriverRequestsPage() {
    const [loading, setLoading] = React.useState(true);
    const [requests, setRequests] = React.useState([]);
    const [error, setError] = React.useState("");
    const [cancellingId, setCancellingId] = React.useState(null);
    const [driverId, setDriverId] = React.useState(null);

    // Tách logic load thành function riêng để tái sử dụng
    const loadRequests = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const uid = getCookie("userId");
            if (!uid) throw new Error("Không xác định được tài khoản tài xế.");

            const profile = await getDriverProfileByUser(uid);
            if (!profile || !profile.driverId) {
                throw new Error("Không tìm thấy thông tin tài xế.");
            }
            setDriverId(profile.driverId);

            // Get day-off requests (LEAVE type) and expense requests (PAYMENT type)
            try {
                const { getDayOffHistory } = await import("../../api/drivers");
                const { getDriverExpenseRequests } = await import("../../api/expenses");

                // Load day-off requests
                let leaveRequests = [];
                try {
                    const dayOffList = await getDayOffHistory(profile.driverId);
                    console.log("📅 Day-off list:", dayOffList);
                    leaveRequests = (Array.isArray(dayOffList) ? dayOffList : []).map(item => {
                        try {
                            return {
                                id: `leave-${item.dayOffId || item.id}`,
                                dayOffId: item.dayOffId || item.id, // Store original ID for cancel API
                                type: "LEAVE",
                                status: item.status || "PENDING",
                                createdAt: item.requestDate || item.createdAt,
                                startDate: item.startDate,
                                endDate: item.endDate,
                                reason: item.reason,
                                rejectionReason: item.rejectionReason || item.rejectReason,
                            };
                        } catch (mapErr) {
                            console.error("Error mapping day-off item:", mapErr, item);
                            return null;
                        }
                    }).filter(Boolean);
                } catch (leaveErr) {
                    console.warn("Could not load day-off requests:", leaveErr);
                }

                // Load expense requests
                let paymentRequests = [];
                try {
                    const expenseList = await getDriverExpenseRequests(profile.driverId);
                    console.log("💰 Expense list:", expenseList);
                    const expenses = expenseList?.data || expenseList || [];
                    paymentRequests = (Array.isArray(expenses) ? expenses : []).map(item => {
                        try {
                            return {
                                id: `payment-${item.id}`,
                                type: "PAYMENT",
                                status: item.status || "PENDING",
                                createdAt: item.createdAt,
                                amount: item.amount,
                                tripId: item.tripId,
                                description: item.description || item.reason,
                                rejectionReason: item.rejectionReason || item.rejectReason,
                            };
                        } catch (mapErr) {
                            console.error("Error mapping expense item:", mapErr, item);
                            return null;
                        }
                    }).filter(Boolean);
                } catch (expenseErr) {
                    console.warn("Could not load expense requests:", expenseErr);
                }

                setRequests([...leaveRequests, ...paymentRequests]);
            } catch (requestErr) {
                console.warn("Could not load driver requests:", requestErr);
                setRequests([]);
            }
        } catch (err) {
            console.error("Error in loadRequests:", err);
            setError(
                err?.data?.message ||
                err?.message ||
                "Không tải được danh sách yêu cầu."
            );
            setRequests([]); // Đảm bảo requests luôn là array
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

    const handleCancelLeaveRequest = async (request) => {
        if (!request.dayOffId || !driverId) {
            alert("Không thể xác định yêu cầu nghỉ phép để hủy.");
            return;
        }

        // Confirm before canceling
        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn hủy yêu cầu nghỉ phép này? " +
            "Sau khi hủy, yêu cầu sẽ không được tính vào số ngày nghỉ đã dùng và trạng thái của bạn sẽ được cập nhật."
        );

        if (!confirmed) return;

        setCancellingId(request.id);
        try {
            await cancelDayOffRequest(driverId, request.dayOffId);

            // Reload lại toàn bộ danh sách từ server để đảm bảo đồng bộ
            try {
                await loadRequests();
            } catch (reloadErr) {
                console.error("Failed to reload requests after cancel:", reloadErr);
                // Vẫn hiển thị thông báo thành công nếu hủy thành công
            }

            alert("Đã hủy yêu cầu nghỉ phép thành công.");
        } catch (err) {
            console.error("Failed to cancel leave request:", err);
            alert(
                err?.data?.message ||
                err?.message ||
                "Không thể hủy yêu cầu nghỉ phép. Vui lòng thử lại."
            );
        } finally {
            setCancellingId(null);
        }
    };

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
                    Theo dõi trạng thái các yêu cầu nghỉ phép và thanh toán của bạn
                </p>
            </div>

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
                                        onCancel={handleCancelLeaveRequest}
                                        cancellingId={cancellingId}
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
