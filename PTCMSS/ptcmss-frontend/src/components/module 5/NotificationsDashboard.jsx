import React from "react";
import {
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Car,
    FileText,
    DollarSign,
    Calendar,
    Loader2,
    RefreshCw,
    Bell,
    CheckCheck,
    X,
} from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getBranchByUserId, listBranches } from "../../api/branches";
import { apiFetch } from "../../api/http";

/**
 * NotificationsDashboard - Dashboard cảnh báo & phê duyệt
 *
 * Hiển thị:
 * - Alerts: Xe sắp hết đăng kiểm, bằng lái hết hạn, xung đột lịch, etc.
 * - Pending Approvals: Nghỉ phép tài xế, yêu cầu tạm ứng, giảm giá, etc.
 */
export default function NotificationsDashboard() {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [dashboard, setDashboard] = React.useState(null);
    const [processedApprovals, setProcessedApprovals] = React.useState([]);
    const [loadingProcessed, setLoadingProcessed] = React.useState(false);
    const [branches, setBranches] = React.useState([]);
    const [selectedBranchId, setSelectedBranchId] = React.useState(null);
    const [userBranchId, setUserBranchId] = React.useState(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogType, setDialogType] = React.useState(""); // "approve" or "reject"
    const [selectedApprovalId, setSelectedApprovalId] = React.useState(null);
    const [dialogNote, setDialogNote] = React.useState("");

    // Detail dialog state
    const [detailDialogOpen, setDetailDialogOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState(null);
    const [selectedItemType, setSelectedItemType] = React.useState(""); // "alert", "pending", "processed"

    // Local state để lưu note sau khi duyệt (hiển thị trên card)
    const [approvalNotes, setApprovalNotes] = React.useState({});

    const role = getCurrentRole();
    const userId = getStoredUserId();
    const isAdmin = role === ROLES.ADMIN;

    // Load user's branch
    React.useEffect(() => {
        if (isAdmin) return;

        async function loadUserBranch() {
            try {
                const branch = await getBranchByUserId(userId);
                const branchId = branch?.id || branch?.branchId;
                setUserBranchId(branchId);
                setSelectedBranchId(branchId);
            } catch (err) {
                console.error("Failed to load user branch:", err);
            }
        }

        if (userId) {
            loadUserBranch();
        }
    }, [userId, isAdmin]);

    // Load branches for admin
    React.useEffect(() => {
        if (!isAdmin) return;

        async function loadBranches() {
            try {
                const data = await listBranches({ size: 100 });
                const branchList = data?.content || data || [];
                setBranches(branchList);

                if (branchList.length > 0 && !selectedBranchId) {
                    setSelectedBranchId(branchList[0].id);
                }
            } catch (err) {
                console.error("Failed to load branches:", err);
            }
        }

        loadBranches();
    }, [isAdmin]);

    // Load dashboard
    React.useEffect(() => {
        if (!selectedBranchId && !isAdmin) return;

        async function loadDashboard() {
            setLoading(true);
            setError("");
            try {
                const params = selectedBranchId ? `?branchId=${selectedBranchId}` : "";
                const data = await apiFetch(`/api/notifications/dashboard${params}`);
                setDashboard(data);
            } catch (err) {
                console.error("Failed to load dashboard:", err);
                setError("Không thể tải dashboard");
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, [selectedBranchId, isAdmin]);

    // Load processed approvals (đã duyệt/từ chối)
    React.useEffect(() => {
        if (!selectedBranchId && !isAdmin) return;

        async function loadProcessedApprovals() {
            setLoadingProcessed(true);
            try {
                const params = new URLSearchParams();
                if (selectedBranchId) params.append("branchId", selectedBranchId);
                params.append("limit", "50"); // Lấy 50 mục gần nhất

                const data = await apiFetch(`/api/notifications/approvals/processed?${params}`);
                setProcessedApprovals(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load processed approvals:", err);
                setProcessedApprovals([]);
            } finally {
                setLoadingProcessed(false);
            }
        }

        loadProcessedApprovals();
    }, [selectedBranchId, isAdmin]);

    const handleRefresh = () => {
        setSelectedBranchId(selectedBranchId); // Trigger reload
        // Reload processed approvals too
        setLoadingProcessed(true);
        (async () => {
            try {
                const params = new URLSearchParams();
                if (selectedBranchId) params.append("branchId", selectedBranchId);
                params.append("limit", "50");
                const data = await apiFetch(`/api/notifications/approvals/processed?${params}`);
                setProcessedApprovals(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to reload processed approvals:", err);
            } finally {
                setLoadingProcessed(false);
            }
        })();
    };

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await apiFetch(`/api/notifications/alerts/${alertId}/acknowledge`, {
                method: "POST",
                body: { userId: Number(userId) },
            });
            handleRefresh();
        } catch (err) {
            console.error("Failed to acknowledge alert:", err);
            alert("Không thể xác nhận cảnh báo");
        }
    };

    const handleApproveClick = (historyId, e) => {
        e?.stopPropagation(); // Prevent triggering detail dialog
        setSelectedApprovalId(historyId);
        setDialogType("approve");
        setDialogNote("");
        setDialogOpen(true);
    };

    const handleRejectClick = (historyId, e) => {
        e?.stopPropagation(); // Prevent triggering detail dialog
        setSelectedApprovalId(historyId);
        setDialogType("reject");
        setDialogNote("");
        setDialogOpen(true);
    };

    const handleViewDetail = (item, type) => {
        setSelectedItem(item);
        setSelectedItemType(type);
        setDetailDialogOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedApprovalId) return;

        try {
            await apiFetch(`/api/notifications/approvals/${selectedApprovalId}/approve`, {
                method: "POST",
                body: { userId: Number(userId), note: dialogNote || null },
            });

            // Lưu note vào state để hiển thị trên card
            setApprovalNotes(prev => ({
                ...prev,
                [selectedApprovalId]: { note: dialogNote, type: "approved", timestamp: new Date().toISOString() }
            }));

            setDialogOpen(false);
            handleRefresh();
        } catch (err) {
            console.error("Failed to approve:", err);
            alert("Không thể phê duyệt");
        }
    };

    const handleReject = async () => {
        if (!selectedApprovalId) return;

        if (!dialogNote || !dialogNote.trim()) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }

        try {
            await apiFetch(`/api/notifications/approvals/${selectedApprovalId}/reject`, {
                method: "POST",
                body: { userId: Number(userId), note: dialogNote },
            });

            // Lưu note vào state để hiển thị trên card
            setApprovalNotes(prev => ({
                ...prev,
                [selectedApprovalId]: { note: dialogNote, type: "rejected", timestamp: new Date().toISOString() }
            }));

            setDialogOpen(false);
            handleRefresh();
        } catch (err) {
            console.error("Failed to reject:", err);
            alert("Không thể từ chối");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="h-6 w-6 text-sky-600" />
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900">
                                    Cảnh báo & Chờ duyệt
                                </h1>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Quản lý cảnh báo hệ thống và yêu cầu phê duyệt
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </button>
                    </div>

                    {/* Branch selector for Admin */}
                    {isAdmin && branches.length > 0 && (
                        <div className="mt-4">
                            <select
                                value={selectedBranchId || ""}
                                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                                className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="">-- Tất cả chi nhánh --</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.branchName || branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">{error}</div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        <span className="ml-3 text-slate-600">Đang tải...</span>
                    </div>
                ) : dashboard ? (
                    <>
                        {/* Stats */}
                        <StatsCards stats={dashboard.stats} />

                        {/* 3 Columns Layout: Alerts | Pending Approvals | Processed Approvals */}
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Column 1: Cảnh báo hệ thống */}
                            <div className="flex flex-col">
                                <h2 className="text-base font-semibold text-slate-900 mb-3">
                                    Cảnh báo hệ thống
                                </h2>
                                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-3 min-h-[350px] max-h-[500px] overflow-y-auto">
                                    {dashboard.alerts && dashboard.alerts.length > 0 ? (
                                        <div className="space-y-2">
                                            {dashboard.alerts.map((alert) => (
                                                <AlertCard
                                                    key={alert.id}
                                                    alert={alert}
                                                    onAcknowledge={handleAcknowledgeAlert}
                                                    onClick={() => handleViewDetail(alert, "alert")}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                                            <p className="text-sm text-slate-600">Không có cảnh báo nào</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Yêu cầu chờ duyệt */}
                            <div className="flex flex-col">
                                <h2 className="text-base font-semibold text-slate-900 mb-3">
                                    Yêu cầu chờ duyệt
                                </h2>
                                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-3 min-h-[350px] max-h-[500px] overflow-y-auto">
                                    {dashboard.pendingApprovals && dashboard.pendingApprovals.length > 0 ? (
                                        <div className="space-y-2">
                                            {dashboard.pendingApprovals.map((approval) => (
                                                <ApprovalCard
                                                    key={approval.id}
                                                    approval={approval}
                                                    onApprove={handleApproveClick}
                                                    onReject={handleRejectClick}
                                                    canApprove={isAdmin || role === ROLES.MANAGER}
                                                    approvalNote={approvalNotes[approval.id]}
                                                    onClick={() => handleViewDetail(approval, "pending")}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                                            <p className="text-sm text-slate-600">Không có yêu cầu chờ duyệt</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 3: Thông báo đã duyệt */}
                            <div className="flex flex-col">
                                <h2 className="text-base font-semibold text-slate-900 mb-3">
                                    Thông báo đã duyệt
                                </h2>
                                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-3 min-h-[350px] max-h-[500px] overflow-y-auto">
                                    {loadingProcessed ? (
                                        <div className="h-full flex flex-col items-center justify-center py-6">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                            <span className="mt-2 text-slate-600 text-xs">Đang tải...</span>
                                        </div>
                                    ) : processedApprovals && processedApprovals.length > 0 ? (
                                        <div className="space-y-2">
                                            {processedApprovals.map((approval) => (
                                                <ProcessedApprovalCard
                                                    key={approval.id}
                                                    approval={approval}
                                                    onClick={() => handleViewDetail(approval, "processed")}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                            <Info className="h-10 w-10 text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-600">Chưa có yêu cầu nào đã được xử lý</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>

            {/* Approval Dialog */}
            {dialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDialogOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                {dialogType === "approve" ? "Phê duyệt yêu cầu" : "Từ chối yêu cầu"}
                            </h3>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {dialogType === "approve" ? "Ghi chú phê duyệt (tùy chọn):" : "Lý do từ chối:"}
                                </label>
                                <textarea
                                    value={dialogNote}
                                    onChange={(e) => setDialogNote(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    rows={3}
                                    placeholder={dialogType === "approve" ? "Nhập ghi chú (nếu có)..." : "Nhập lý do từ chối..."}
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setDialogOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={dialogType === "approve" ? handleApprove : handleReject}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                                        dialogType === "approve"
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-red-600 hover:bg-red-700"
                                    }`}
                                >
                                    {dialogType === "approve" ? "Duyệt" : "Từ chối"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Dialog */}
            {detailDialogOpen && selectedItem && (
                <DetailDialog
                    item={selectedItem}
                    type={selectedItemType}
                    onClose={() => setDetailDialogOpen(false)}
                    onAcknowledge={selectedItemType === "alert" ? handleAcknowledgeAlert : undefined}
                    onApprove={selectedItemType === "pending" ? handleApproveClick : undefined}
                    onReject={selectedItemType === "pending" ? handleRejectClick : undefined}
                    canApprove={selectedItemType === "pending" && (isAdmin || role === ROLES.MANAGER)}
                />
            )}
        </div>
    );
}

function StatsCards({ stats }) {
    if (!stats) return null;

    const cards = [
        {
            label: "Tổng cảnh báo",
            value: stats.totalAlerts,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            label: "Cảnh báo khẩn cấp",
            value: stats.criticalAlerts,
            icon: AlertCircle,
            color: "text-red-600",
            bg: "bg-red-50",
        },
        {
            label: "Chờ duyệt",
            value: stats.totalPendingApprovals,
            icon: Clock,
            color: "text-sky-600",
            bg: "bg-sky-50",
        },
        {
            label: "Nghỉ phép",
            value: stats.driverDayOffRequests,
            icon: Calendar,
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">{card.label}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                        </div>
                        <div className={`${card.bg} p-3 rounded-lg`}>
                            <card.icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AlertCard({ alert, onAcknowledge, onClick }) {
    const severityConfig = {
        CRITICAL: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
        HIGH: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
        MEDIUM: { icon: Info, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
        LOW: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    };

    const config = severityConfig[alert.severity] || severityConfig.MEDIUM;
    const Icon = config.icon;

    return (
        <div
            className={`bg-white rounded-lg border ${config.border} p-2.5 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={onClick}
        >
            <div className="flex items-start gap-2">
                <div className={`${config.bg} p-1.5 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h3 className="font-medium text-slate-900 text-sm">{alert.title}</h3>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.message}</p>

                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                                <span>{alert.branchName}</span>
                                <span>•</span>
                                <span>{new Date(alert.createdAt).toLocaleString("vi-VN")}</span>
                            </div>
                        </div>

                        {!alert.isAcknowledged && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAcknowledge(alert.id);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors shrink-0"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Xác nhận
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProcessedApprovalCard({ approval, onClick }) {
    const typeConfig = {
        DRIVER_DAY_OFF: { icon: Calendar, label: "Nghỉ phép", color: "text-purple-600" },
        EXPENSE_REQUEST: { icon: DollarSign, label: "Tạm ứng", color: "text-green-600" },
        DISCOUNT_REQUEST: { icon: FileText, label: "Giảm giá", color: "text-blue-600" },
    };

    const config = typeConfig[approval.approvalType] || { icon: FileText, label: "Yêu cầu", color: "text-slate-600" };
    const Icon = config.icon;

    const isApproved = approval.status === "APPROVED";
    const isRejected = approval.status === "REJECTED";
    const processedAt = approval.processedAt || approval.approvedAt;

    return (
        <div
            className={`bg-white rounded-lg border p-2.5 cursor-pointer hover:shadow-md transition-shadow ${
                isApproved ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
            }`}
            onClick={onClick}
        >
            <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                    isApproved ? "bg-green-100" : "bg-red-100"
                }`}>
                    <Icon className={`h-4 w-4 ${
                        isApproved ? "text-green-600" : "text-red-600"
                    }`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-slate-900 text-sm">{config.label}</h3>
                                {isApproved ? (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-medium rounded">
                                        Đã duyệt
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-medium rounded">
                                        Đã từ chối
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    <span className="line-clamp-1">Người yêu cầu: <strong>{approval.requestedByName}</strong></span>
                                </div>

                                {approval.requestReason && (
                                    <div className="mt-1 line-clamp-1">
                                        <span className="text-slate-500">Lý do:</span> {approval.requestReason}
                                    </div>
                                )}

                                {approval.details && (
                                    <div className="mt-1.5 p-1.5 bg-slate-50 rounded text-[10px]">
                                        {approval.approvalType === "DRIVER_DAY_OFF" && (
                                            <div>
                                                <div><strong>Tài xế:</strong> {approval.details.driverName}</div>
                                                <div><strong>Từ:</strong> {approval.details.startDate}</div>
                                                <div><strong>Đến:</strong> {approval.details.endDate}</div>
                                            </div>
                                        )}
                                        {approval.approvalType === "EXPENSE_REQUEST" && (
                                            <div>
                                                <div><strong>Loại:</strong> {approval.details.type}</div>
                                                <div><strong>Số tiền:</strong> {approval.details.amount?.toLocaleString()} VNĐ</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hiển thị note phê duyệt/từ chối */}
                                {approval.approvalNote && (
                                    <div className={`mt-1.5 p-1.5 rounded text-[10px] ${
                                        isApproved
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-red-50 border border-red-200"
                                    }`}>
                                        <div className="flex items-start gap-1.5">
                                            {isApproved ? (
                                                <CheckCircle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 line-clamp-2">
                                                {approval.approvalNote}
                                            </div>
                                        </div>
                                        {approval.approvedByName && (
                                            <div className="mt-1 text-[10px] opacity-75">
                                                Bởi: {approval.approvedByName}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-1.5 text-[10px] text-slate-500">
                                    {new Date(approval.requestedAt).toLocaleString("vi-VN")}
                                    {processedAt && (
                                        <> • {new Date(processedAt).toLocaleString("vi-VN")}</>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ApprovalCard({ approval, onApprove, onReject, canApprove, approvalNote, onClick }) {
    const typeConfig = {
        DRIVER_DAY_OFF: { icon: Calendar, label: "Nghỉ phép", color: "text-purple-600" },
        EXPENSE_REQUEST: { icon: DollarSign, label: "Tạm ứng", color: "text-green-600" },
        DISCOUNT_REQUEST: { icon: FileText, label: "Giảm giá", color: "text-blue-600" },
    };

    const config = typeConfig[approval.approvalType] || { icon: FileText, label: "Yêu cầu", color: "text-slate-600" };
    const Icon = config.icon;

    // Kiểm tra xem đã có note từ state local chưa
    const hasNote = approvalNote && approvalNote.note;
    const isApproved = approvalNote?.type === "approved";
    const isRejected = approvalNote?.type === "rejected";

    return (
        <div
            className="bg-white rounded-lg border border-slate-200 p-2.5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <div className="flex items-start gap-2">
                <div className="bg-slate-50 p-1.5 rounded-lg shrink-0">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-slate-900 text-sm">{config.label}</h3>
                                {isApproved ? (
                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-medium rounded">
                                        Đã duyệt
                                    </span>
                                ) : isRejected ? (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-medium rounded">
                                        Đã từ chối
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-medium rounded">
                                        Chờ duyệt
                                    </span>
                                )}
                            </div>

                            <div className="mt-1.5 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    <span className="line-clamp-1">Người yêu cầu: <strong>{approval.requestedByName}</strong></span>
                                </div>

                                {approval.requestReason && (
                                    <div className="mt-1 line-clamp-1">
                                        <span className="text-slate-500">Lý do:</span> {approval.requestReason}
                                    </div>
                                )}

                                {approval.details && (
                                    <div className="mt-1.5 p-1.5 bg-slate-50 rounded text-[10px]">
                                        {approval.approvalType === "DRIVER_DAY_OFF" && (
                                            <div>
                                                <div><strong>Tài xế:</strong> {approval.details.driverName}</div>
                                                <div><strong>Từ:</strong> {approval.details.startDate}</div>
                                                <div><strong>Đến:</strong> {approval.details.endDate}</div>
                                            </div>
                                        )}
                                        {approval.approvalType === "EXPENSE_REQUEST" && (
                                            <div>
                                                <div><strong>Loại:</strong> {approval.details.type}</div>
                                                <div><strong>Số tiền:</strong> {approval.details.amount?.toLocaleString()} VNĐ</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hiển thị note sau khi duyệt/từ chối */}
                                {hasNote && (
                                    <div className={`mt-1.5 p-1.5 rounded text-[10px] ${
                                        isApproved
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-red-50 border border-red-200"
                                    }`}>
                                        <div className="flex items-start gap-1.5">
                                            {isApproved ? (
                                                <CheckCircle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 line-clamp-2">
                                                {approvalNote.note || "(Không có ghi chú)"}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-1.5 text-[10px] text-slate-500">
                                    {new Date(approval.requestedAt).toLocaleString("vi-VN")}
                                </div>
                            </div>
                        </div>

                        {canApprove && !hasNote && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onApprove(approval.id, e);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                                >
                                    <CheckCircle className="h-3 w-3" />
                                    Duyệt
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReject(approval.id, e);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                >
                                    <XCircle className="h-3 w-3" />
                                    Từ chối
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailDialog({ item, type, onClose, onAcknowledge, onApprove, onReject, canApprove }) {
    if (!item) return null;

    // Alert detail
    if (type === "alert") {
        const severityConfig = {
            CRITICAL: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
            HIGH: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
            MEDIUM: { icon: Info, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
            LOW: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
        };
        const config = severityConfig[item.severity] || severityConfig.MEDIUM;
        const Icon = config.icon;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`${config.bg} p-3 rounded-lg`}>
                                    <Icon className={`h-6 w-6 ${config.color}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{item.branchName}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nội dung cảnh báo</label>
                                <p className="mt-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{item.message}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Mức độ</label>
                                    <p className="mt-1 text-sm text-slate-600">{item.severity}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Thời gian</label>
                                    <p className="mt-1 text-sm text-slate-600">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                                </div>
                            </div>

                            {!item.isAcknowledged && onAcknowledge && (
                                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        onClick={() => {
                                            onAcknowledge(item.id);
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                        Xác nhận đã biết
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Approval detail (pending or processed)
    const typeConfig = {
        DRIVER_DAY_OFF: { icon: Calendar, label: "Nghỉ phép", color: "text-purple-600" },
        EXPENSE_REQUEST: { icon: DollarSign, label: "Tạm ứng", color: "text-green-600" },
        DISCOUNT_REQUEST: { icon: FileText, label: "Giảm giá", color: "text-blue-600" },
    };
    const config = typeConfig[item.approvalType] || { icon: FileText, label: "Yêu cầu", color: "text-slate-600" };
    const Icon = config.icon;

    const isApproved = item.status === "APPROVED";
    const isRejected = item.status === "REJECTED";
    const isPending = !isApproved && !isRejected;
    const processedAt = item.processedAt || item.approvedAt;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <Icon className={`h-6 w-6 ${config.color}`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{config.label}</h3>
                                {isApproved ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded mt-1 inline-block">
                                        Đã duyệt
                                    </span>
                                ) : isRejected ? (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded mt-1 inline-block">
                                        Đã từ chối
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded mt-1 inline-block">
                                        Chờ duyệt
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Người yêu cầu</label>
                                <p className="mt-1 text-sm text-slate-600">{item.requestedByName}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Thời gian yêu cầu</label>
                                <p className="mt-1 text-sm text-slate-600">{new Date(item.requestedAt).toLocaleString("vi-VN")}</p>
                            </div>
                        </div>

                        {item.requestReason && (
                            <div>
                                <label className="text-sm font-medium text-slate-700">Lý do</label>
                                <p className="mt-1 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{item.requestReason}</p>
                            </div>
                        )}

                        {item.details && (
                            <div>
                                <label className="text-sm font-medium text-slate-700">Chi tiết</label>
                                <div className="mt-1 bg-slate-50 p-3 rounded-lg text-sm">
                                    {item.approvalType === "DRIVER_DAY_OFF" && (
                                        <div className="space-y-2">
                                            <div><strong>Tài xế:</strong> {item.details.driverName}</div>
                                            <div><strong>Từ ngày:</strong> {item.details.startDate}</div>
                                            <div><strong>Đến ngày:</strong> {item.details.endDate}</div>
                                        </div>
                                    )}
                                    {item.approvalType === "EXPENSE_REQUEST" && (
                                        <div className="space-y-2">
                                            <div><strong>Người yêu cầu:</strong> {item.details.requesterName}</div>
                                            <div><strong>Loại chi phí:</strong> {item.details.type}</div>
                                            <div><strong>Số tiền:</strong> {item.details.amount?.toLocaleString()} VNĐ</div>
                                            {item.details.note && (
                                                <div><strong>Ghi chú:</strong> {item.details.note}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Hiển thị note phê duyệt/từ chối */}
                        {item.approvalNote && (
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    {isApproved ? "Ghi chú phê duyệt" : "Lý do từ chối"}
                                </label>
                                <div className={`mt-1 p-3 rounded-lg text-sm ${
                                    isApproved
                                        ? "bg-green-50 border border-green-200 text-green-800"
                                        : "bg-red-50 border border-red-200 text-red-800"
                                }`}>
                                    <div className="flex items-start gap-2">
                                        {isApproved ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p>{item.approvalNote}</p>
                                            {item.approvedByName && (
                                                <p className="mt-2 text-xs opacity-75">
                                                    Xử lý bởi: {item.approvedByName}
                                                </p>
                                            )}
                                            {processedAt && (
                                                <p className="mt-1 text-xs opacity-75">
                                                    Thời gian: {new Date(processedAt).toLocaleString("vi-VN")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t">
                            {isPending && canApprove && onApprove && onReject ? (
                                <>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onApprove(item.id, e);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Duyệt
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReject(item.id, e);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Từ chối
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"
                                >
                                    Đóng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
