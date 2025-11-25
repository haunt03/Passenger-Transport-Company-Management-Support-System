import React from "react";
import { useLocation } from "react-router-dom";
import {
    Bell,
    ShieldAlert,
    AlertTriangle,
    AlertCircle,
    Info,
    CalendarDays,
    UserRound,
    BadgePercent,
    Check,
    X,
    RefreshCw,
    DollarSign,
    FileText,
    CheckCheck,
    Building2,
    Wifi,
    WifiOff,
    Loader2,
    Inbox,
    Clock,
    XCircle,
} from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getBranchByUserId } from "../../api/branches";
import { apiFetch } from "../../api/http";
import { useNotifications } from "../../hooks/useNotifications";

/**
 * NotificationsWidget – Hiển thị cảnh báo & yêu cầu chờ duyệt
 *
 * UI:
 * - Widget mode: Icon chuông với badge, click vào mới hiển thị dropdown chi tiết
 * - Page mode: Tự động hiển thị full content (khi route = /dispatch/notifications)
 */
export default function NotificationsWidget() {
    const location = useLocation();
    const isPageMode = location.pathname === "/dispatch/notifications";
    const [dashboard, setDashboard] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [busyIds, setBusyIds] = React.useState(new Set());
    const [branchId, setBranchId] = React.useState(null);
    const [branches, setBranches] = React.useState([]);
    const [showBranchSelector, setShowBranchSelector] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [branchLoaded, setBranchLoaded] = React.useState(false);

    const role = getCurrentRole();
    const userId = getStoredUserId();
    const isAdmin = role === ROLES.ADMIN;

    // WebSocket real-time notifications
    const { connected, notifications: wsNotifications, unreadCount } = useNotifications();

    // Load branches for admin
    React.useEffect(() => {
        if (!isAdmin) return;

        async function loadBranches() {
            try {
                const { listBranches } = await import("../../api/branches");
                const data = await listBranches({ size: 100 });
                const branchList = data?.content || data || [];
                setBranches(branchList);
            } catch (err) {
                console.error("Failed to load branches:", err);
            }
        }

        loadBranches();
    }, [isAdmin]);

    // Load user's branch (silently, don't block UI)
    React.useEffect(() => {
        // Disabled: Not all users have branch assigned, causing 500 errors
        // This feature is not critical for notifications widget
        setBranchLoaded(true);
        return;

        // if (isAdmin || branchLoaded) return;

        // async function loadUserBranch() {
        //     try {
        //         const branch = await getBranchByUserId(userId);
        //         const id = branch?.id || branch?.branchId;
        //         if (id) {
        //             setBranchId(id);
        //         }
        //     } catch (err) {
        //         // Silently ignore - user may not have a branch assigned yet
        //         // This is expected for some users (e.g., drivers without branch)
        //     } finally {
        //         setBranchLoaded(true);
        //     }
        // }

        // if (userId) {
        //     loadUserBranch();
        // } else {
        //     setBranchLoaded(true);
        // }
    }, [userId, isAdmin, branchLoaded]);

    const fetchAll = React.useCallback(async () => {
        // Prevent multiple simultaneous calls
        if (loading) {
            console.log('[NotificationsWidget] Already loading, skipping...');
            return;
        }

        setLoading(true);
        setError("");
        try {
            // Allow fetch without branchId (for admin or if branch not loaded yet)
            const params = branchId ? `?branchId=${branchId}` : "";
            const data = await apiFetch(`/api/notifications/dashboard${params}`);
            setDashboard(data);
        } catch (err) {
            console.error("Failed to load dashboard:", err);
            setError("Không lấy được dữ liệu thông báo");
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }, [branchId, loading]);

    // Fetch when dropdown opens OR when in page mode
    React.useEffect(() => {
        if ((showDropdown || isPageMode) && (isAdmin || branchLoaded)) {
            fetchAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showDropdown, isPageMode, isAdmin, branchLoaded]);

    // Auto-open dropdown when in page mode
    React.useEffect(() => {
        if (isPageMode) {
            setShowDropdown(true);
        }
    }, [isPageMode]);

    // Auto-refresh when receiving WebSocket notifications
    React.useEffect(() => {
        if (wsNotifications.length > 0 && showDropdown) {
            const latest = wsNotifications[0];
            if (
                latest.type === 'BOOKING_UPDATE' ||
                latest.type === 'PAYMENT_UPDATE' ||
                latest.type === 'DISPATCH_UPDATE' ||
                latest.type === 'ALERT' ||
                latest.type === 'APPROVAL_REQUEST'
            ) {
                fetchAll();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsNotifications, showDropdown]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        if (!showDropdown) return;

        const handleClickOutside = (event) => {
            const dropdown = document.querySelector('[data-notifications-dropdown]');
            const button = document.querySelector('[data-notifications-button]');

            if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
                setShowDropdown(false);
                setShowBranchSelector(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    const setIdBusy = (id, on) => {
        setBusyIds((s) => {
            const next = new Set(s);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    // ===== Hành động =====
    const handleAcknowledgeAlert = async (alertId) => {
        setIdBusy(`alert-${alertId}`, true);
        try {
            await apiFetch(`/api/notifications/alerts/${alertId}/acknowledge`, {
                method: "POST",
                body: { userId: Number(userId) },
            });
            fetchAll();
        } catch (err) {
            console.error("Failed to acknowledge alert:", err);
            alert("Không thể xác nhận cảnh báo");
        } finally {
            setIdBusy(`alert-${alertId}`, false);
        }
    };

    const handleApprove = async (historyId) => {
        const note = prompt("Ghi chú phê duyệt (tùy chọn):");
        if (note === null) return;

        setIdBusy(`approval-${historyId}`, true);
        try {
            await apiFetch(`/api/notifications/approvals/${historyId}/approve`, {
                method: "POST",
                body: { userId: Number(userId), note },
            });
            alert("Đã phê duyệt thành công");
            fetchAll();
        } catch (err) {
            console.error("Failed to approve:", err);
            alert("Không thể phê duyệt");
        } finally {
            setIdBusy(`approval-${historyId}`, false);
        }
    };

    const handleReject = async (historyId) => {
        const note = prompt("Lý do từ chối:");
        if (!note) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }

        setIdBusy(`approval-${historyId}`, true);
        try {
            await apiFetch(`/api/notifications/approvals/${historyId}/reject`, {
                method: "POST",
                body: { userId: Number(userId), note },
            });
            alert("Đã từ chối yêu cầu");
            fetchAll();
        } catch (err) {
            console.error("Failed to reject:", err);
            alert("Không thể từ chối");
        } finally {
            setIdBusy(`approval-${historyId}`, false);
        }
    };

    // ======= Render helpers =======
    const SectionHeader = ({ icon, title, count, right }) => (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white sticky top-0 z-10 text-slate-700 text-sm backdrop-blur-sm">
            <span className="text-slate-600 flex items-center transition-transform hover:scale-110">{icon}</span>
            <div className="font-semibold text-slate-900">{title}</div>
            <span className="ml-1.5 px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-medium rounded-full">{count}</span>
            <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
    );

    const AlertItem = ({ alert }) => {
        const severityConfig = {
            CRITICAL: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
            HIGH: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
            MEDIUM: { icon: Info, color: "text-amber-600", bg: "bg-amber-50" },
            LOW: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
        };

        const config = severityConfig[alert.severity] || severityConfig.MEDIUM;
        const Icon = config.icon;
        const idKey = `alert-${alert.id}`;
        const working = busyIds.has(idKey);

        return (
            <div className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 text-sm hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200 group">
                <div className={cls("mt-0.5 p-2 rounded-lg shadow-sm transition-transform group-hover:scale-110", config.bg)}>
                    <Icon className={cls("h-4 w-4", config.color)} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="text-slate-900 font-semibold text-sm mb-1" title={alert.title}>
                        {alert.title}
                    </div>
                    <div className="text-[12px] leading-5 text-slate-600">
                        {alert.message}
                    </div>
                    {alert.branchName && (
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {alert.branchName}
                        </div>
                    )}
                </div>

                {!alert.isAcknowledged && (
                    <button
                        disabled={working}
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className={cls(
                            "shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 hover:shadow-md px-3 py-1.5 text-[11px] font-semibold transition-all duration-200",
                            working ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                        )}
                        title="Xác nhận"
                    >
                        {working ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        OK
                    </button>
                )}
            </div>
        );
    };

    const PendingItem = ({ approval }) => {
        const typeConfig = {
            DRIVER_DAY_OFF: { icon: CalendarDays, label: "Nghỉ phép", color: "text-purple-600" },
            EXPENSE_REQUEST: { icon: DollarSign, label: "Tạm ứng", color: "text-green-600" },
            DISCOUNT_REQUEST: { icon: BadgePercent, label: "Giảm giá", color: "text-blue-600" },
        };

        const config = typeConfig[approval.approvalType] || { icon: FileText, label: "Yêu cầu", color: "text-slate-600" };
        const Icon = config.icon;
        const idKey = `approval-${approval.id}`;
        const working = busyIds.has(idKey);
        const canApprove = isAdmin || role === ROLES.MANAGER;

        return (
            <div className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200 group">
                <div className="mt-0.5 p-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm transition-transform group-hover:scale-110">
                    <Icon className={cls("h-4 w-4", config.color)} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-900 font-semibold text-sm">{config.label}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                            Chờ duyệt
                        </span>
                    </div>

                    <div className="text-[12px] leading-5 text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                            <UserRound className="h-3 w-3 text-slate-400" />
                            <span><strong className="text-slate-700">Người yêu cầu:</strong> {approval.requestedByName}</span>
                        </div>
                        {approval.requestReason && (
                            <div className="flex items-start gap-1.5 truncate" title={approval.requestReason}>
                                <FileText className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                <span><strong className="text-slate-700">Lý do:</strong> {approval.requestReason}</span>
                            </div>
                        )}

                        {approval.details && approval.approvalType === "DRIVER_DAY_OFF" && (
                            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                {approval.details.driverName} · {approval.details.startDate} → {approval.details.endDate}
                            </div>
                        )}

                        {approval.details && approval.approvalType === "EXPENSE_REQUEST" && (
                            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                                <DollarSign className="h-3 w-3" />
                                {approval.details.requesterName} · <span className="font-semibold text-emerald-600">{approval.details.amount?.toLocaleString()} VNĐ</span>
                            </div>
                        )}
                    </div>
                </div>

                {canApprove && (
                    <div className="shrink-0 flex items-center gap-2">
                        <button
                            disabled={working}
                            onClick={() => handleApprove(approval.id)}
                            className={cls(
                                "inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50 hover:shadow-md px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
                                working ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                            )}
                            title="Duyệt"
                        >
                            {working ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            Duyệt
                        </button>

                        <button
                            disabled={working}
                            onClick={() => handleReject(approval.id)}
                            className={cls(
                                "inline-flex items-center gap-1.5 rounded-lg border-2 border-rose-600 bg-white text-rose-700 hover:bg-rose-50 hover:shadow-md px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
                                working ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                            )}
                            title="Từ chối"
                        >
                            {working ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <X className="h-3.5 w-3.5" />
                            )}
                            Từ chối
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const alerts = dashboard?.alerts || [];
    const pending = dashboard?.pendingApprovals || [];
    const totalCount = alerts.length + pending.length;

    // Calculate unread count (alerts not acknowledged + pending approvals)
    const unreadAlerts = alerts.filter(a => !a.isAcknowledged).length;
    const badgeCount = unreadAlerts + pending.length;

    return (
        <div className={isPageMode ? "min-h-screen" : "relative"}>
            {/* Bell Icon Button - Only show in widget mode */}
            {!isPageMode && (
                <button
                    data-notifications-button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-sky-400 hover:shadow-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    title="Thông báo"
                >
                    <Bell className="h-5 w-5" />
                    {badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                            {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                    )}
                    {connected && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></span>
                    )}
                </button>
            )}

            {/* Dropdown Panel - Fixed position in widget mode, full page in page mode */}
            {showDropdown && (
                <>
                    {/* Backdrop - Only in widget mode */}
                    {!isPageMode && (
                        <div
                            className="fixed inset-0 bg-black/20 z-[9998]"
                            onClick={() => setShowDropdown(false)}
                        />
                    )}
                    <div
                        data-notifications-dropdown
                        className={isPageMode
                            ? "w-full max-w-7xl mx-auto bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden my-6"
                            : "fixed right-4 top-16 w-[90vw] sm:w-[600px] lg:w-[700px] max-h-[85vh] bg-white border-2 border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden"
                        }
                        style={!isPageMode ? {
                            transformOrigin: 'top right',
                            animation: 'slideInFromRight 0.2s ease-out'
                        } : {}}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-slate-50">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30">
                                <Bell className="h-5 w-5" />
                            </div>

                            <div className="flex flex-col flex-1">
                                <div className="text-[11px] text-slate-500 leading-none mb-1 font-medium">
                                    Trung tâm cảnh báo / phê duyệt
                                </div>
                                <div className="text-slate-900 font-bold text-base leading-tight">
                                    Thông báo điều phối
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* WebSocket status */}
                                <div
                                    className={cls(
                                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200",
                                        connected
                                            ? "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-2 border-emerald-300 shadow-sm"
                                            : "bg-slate-100 text-slate-500 border-2 border-slate-300"
                                    )}
                                    title={connected ? "WebSocket đã kết nối" : "WebSocket chưa kết nối"}
                                >
                                    {connected ? (
                                        <>
                                            <Wifi className="h-3.5 w-3.5 animate-pulse" />
                                            <span>Live</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="h-3.5 w-3.5" />
                                            <span>Offline</span>
                                        </>
                                    )}
                                </div>

                                {/* Branch selector for admin */}
                                {isAdmin && branches.length > 0 && (
                                    <div className="relative">
                                        <button
                                            data-branch-button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowBranchSelector(!showBranchSelector);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-200"
                                            title="Chọn chi nhánh"
                                        >
                                            <Building2 className="h-4 w-4 text-slate-600" />
                                            {branchId ? branches.find(b => b.id === branchId)?.branchName || "Chi nhánh" : "Tất cả"}
                                        </button>

                                        {showBranchSelector && (
                                            <div
                                                data-branch-selector
                                                className="absolute right-0 mt-2 w-64 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden"
                                            >
                                                <div className="py-2">
                                                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
                                                        Chọn chi nhánh
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setBranchId(null);
                                                            setShowBranchSelector(false);
                                                            fetchAll();
                                                        }}
                                                        className={cls(
                                                            "w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2",
                                                            branchId === null ? "bg-sky-50 text-sky-700 font-semibold border-l-4 border-sky-600" : "text-slate-700"
                                                        )}
                                                    >
                                                        <Building2 className="h-4 w-4" />
                                                        Tất cả chi nhánh
                                                    </button>
                                                    {branches.map((branch) => (
                                                        <button
                                                            key={branch.id}
                                                            onClick={() => {
                                                                setBranchId(branch.id);
                                                                setShowBranchSelector(false);
                                                                fetchAll();
                                                            }}
                                                            className={cls(
                                                                "w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2",
                                                                branchId === branch.id ? "bg-sky-50 text-sky-700 font-semibold border-l-4 border-sky-600" : "text-slate-700"
                                                            )}
                                                        >
                                                            <Building2 className="h-4 w-4" />
                                                            {branch.branchName || branch.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Refresh button */}
                                <button
                                    onClick={fetchAll}
                                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-200 hover:scale-105"
                                    title="Làm mới"
                                >
                                    <RefreshCw className={cls("h-4 w-4 text-slate-600", loading ? "animate-spin" : "")} />
                                </button>

                                {/* Close button - Only in widget mode */}
                                {!isPageMode && (
                                    <button
                                        onClick={() => setShowDropdown(false)}
                                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-200 hover:scale-105"
                                        title="Đóng"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 max-h-[calc(85vh-80px)] overflow-hidden">
                            {/* Cột Cảnh báo */}
                            <div className="min-h-[300px] max-h-[calc(85vh-80px)] overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                <SectionHeader
                                    icon={<ShieldAlert className="h-4 w-4" />}
                                    title="Cảnh báo"
                                    count={alerts.length}
                                />

                                {error && (
                                    <div className="mx-4 mt-3 px-4 py-3 text-[12px] leading-5 text-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg flex items-start gap-2 shadow-sm">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="font-semibold mb-1">Lỗi tải dữ liệu</div>
                                            <span>{error}</span>
                                        </div>
                                        <button
                                            onClick={fetchAll}
                                            className="shrink-0 text-amber-700 hover:text-amber-900 transition-colors"
                                            title="Thử lại"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                {alerts.length === 0 && !loading && !error && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                            <Inbox className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-600 mb-1">Không có cảnh báo</div>
                                        <div className="text-xs text-slate-500">Tất cả đều ổn!</div>
                                    </div>
                                )}

                                {alerts.map((a) => (
                                    <AlertItem key={a.id} alert={a} />
                                ))}

                                {loading && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12">
                                        <Loader2 className="h-8 w-8 text-sky-600 animate-spin mb-3" />
                                        <div className="text-sm text-slate-600 font-medium">Đang tải cảnh báo...</div>
                                    </div>
                                )}
                            </div>

                            {/* Cột Chờ duyệt */}
                            <div className="min-h-[300px] max-h-[calc(85vh-80px)] overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                <SectionHeader
                                    icon={<CalendarDays className="h-4 w-4" />}
                                    title="Chờ duyệt"
                                    count={pending.length}
                                />

                                {pending.length === 0 && !loading && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                            <Clock className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-600 mb-1">Không có mục chờ duyệt</div>
                                        <div className="text-xs text-slate-500">Tất cả đã được xử lý!</div>
                                    </div>
                                )}

                                {pending.map((p) => (
                                    <PendingItem key={p.id} approval={p} />
                                ))}

                                {loading && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12">
                                        <Loader2 className="h-8 w-8 text-sky-600 animate-spin mb-3" />
                                        <div className="text-sm text-slate-600 font-medium">Đang tải yêu cầu...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// tiny util
function cls(...a) {
    return a.filter(Boolean).join(" ");
}