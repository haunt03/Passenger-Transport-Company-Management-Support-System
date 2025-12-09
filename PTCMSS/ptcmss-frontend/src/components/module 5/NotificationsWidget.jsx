import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    CreditCard,
    MapPin,
    Phone,
    ChevronRight,
    CarFront,
    CheckCircle,
} from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getBranchByUserId } from "../../api/branches";
import { apiFetch } from "../../api/http";
import { useNotifications } from "../../hooks/useNotifications";
import { getBookingsPendingDeposit, pageBookings } from "../../api/bookings";
import { getDriverSchedule } from "../../api/drivers";
import { unassignTrip } from "../../api/dispatch";
import { deleteNotification, deleteNotificationByApproval, dismissApproval } from "../../api/notifications";

/**
 * NotificationsWidget – Hiển thị cảnh báo & yêu cầu chờ duyệt
 * 
 * UI: 
 * - Widget mode: Icon chuông với badge, click vào mới hiển thị dropdown chi tiết
 * - Page mode: Tự động hiển thị full content (khi route = /dispatch/notifications)
 */
export default function NotificationsWidget() {
    const location = useLocation();
    const navigate = useNavigate();
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
    
    // Consultant-specific: bookings pending deposit
    const [pendingDepositBookings, setPendingDepositBookings] = React.useState([]);
    const [loadingDeposit, setLoadingDeposit] = React.useState(false);
    
    // Conflict resolution modal for driver day-off
    const [showConflictModal, setShowConflictModal] = React.useState(false);
    const [conflictData, setConflictData] = React.useState(null);

    const role = getCurrentRole();
    const userId = getStoredUserId();
    const isAdmin = role === ROLES.ADMIN;
    const isManager = role === ROLES.MANAGER;
    const isConsultant = role === ROLES.CONSULTANT;

    // WebSocket real-time notifications
    const { connected, notifications: wsNotifications, unreadCount, markAsRead, clearNotification } = useNotifications();

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

    const loadingRef = React.useRef(false);
    
    const fetchAll = React.useCallback(async () => {
        // Skip for roles không tham gia phê duyệt/điều phối (DRIVER, MANAGER, ADMIN)
        if (role === ROLES.DRIVER || role === ROLES.MANAGER || role === ROLES.ADMIN) {
            console.log('[NotificationsWidget] Skipping dashboard fetch for role:', role);
            setDashboard(null);
            setLoading(false);
            return;
        }

        // Prevent multiple simultaneous calls using ref (avoid re-render loop)
        if (loadingRef.current) {
            console.log('[NotificationsWidget] Already loading, skipping...');
            return;
        }

        loadingRef.current = true;
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
            loadingRef.current = false;
            setLoading(false);
        }
    }, [branchId, role]);

    // Fetch pending deposit bookings for consultant
    const fetchPendingDeposit = React.useCallback(async () => {
        if (!isConsultant && !isAdmin) return;
        
        setLoadingDeposit(true);
        try {
            // Try the dedicated endpoint first
            let data;
            try {
                data = await getBookingsPendingDeposit({ consultantId: isConsultant ? userId : undefined });
            } catch {
                // Fallback: fetch bookings and filter client-side
                // Get bookings that are PENDING or CONFIRMED but not yet deposited, within 48h
                const now = new Date();
                const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                
                const result = await pageBookings({
                    status: 'PENDING,CONFIRMED,QUOTATION_SENT',
                    consultantId: isConsultant ? userId : undefined,
                    size: 100,
                });
                
                const bookings = result?.content || result?.data || result || [];
                
                // Filter: trip starts within 48h AND no deposit yet
                data = bookings.filter(b => {
                    const trip = b.trips?.[0];
                    if (!trip?.startTime) return false;
                    
                    const tripStart = new Date(trip.startTime);
                    const isWithin48h = tripStart <= in48h && tripStart > now;
                    
                    // Check if deposit is missing
                    const depositAmount = b.depositAmount || 0;
                    const hasDeposit = depositAmount > 0;
                    
                    return isWithin48h && !hasDeposit;
                });
            }
            
            setPendingDepositBookings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load pending deposit bookings:", err);
            setPendingDepositBookings([]);
        } finally {
            setLoadingDeposit(false);
        }
    }, [isConsultant, isAdmin, userId]);

    // Fetch when dropdown opens OR when in page mode
    React.useEffect(() => {
        if ((showDropdown || isPageMode) && (isAdmin || branchLoaded)) {
            fetchAll();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showDropdown, isPageMode, isAdmin, branchLoaded]);

    // Fetch pending deposit for consultant when dropdown opens
    React.useEffect(() => {
        if (showDropdown && (isConsultant || isAdmin)) {
            fetchPendingDeposit();
        }
    }, [showDropdown, isConsultant, isAdmin, fetchPendingDeposit]);

    // Auto-open dropdown when in page mode
    React.useEffect(() => {
        if (isPageMode) {
            setShowDropdown(true);
        }
    }, [isPageMode]);

    // Auto-refresh when receiving NEW WebSocket notifications (not on initial load)
    const prevNotifCountRef = React.useRef(0);
    React.useEffect(() => {
        // Only trigger if we have MORE notifications than before (new one arrived)
        // This prevents triggering on initial load from DB
        if (wsNotifications.length > prevNotifCountRef.current && showDropdown) {
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
        prevNotifCountRef.current = wsNotifications.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsNotifications.length, showDropdown]);

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
    
    const showConflictResolutionModal = (conflicts, driverId, approval) => {
        return new Promise((resolve) => {
            setConflictData({
                conflicts,
                driverId,
                approval,
                onResolve: (confirmed) => {
                    setShowConflictModal(false);
                    setConflictData(null);
                    resolve(confirmed);
                }
            });
            setShowConflictModal(true);
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
            pushToast("Không thể xác nhận cảnh báo. Vui lòng thử lại.", "error");
        } finally {
            setIdBusy(`alert-${alertId}`, false);
        }
    };

    const handleApprove = async (historyId) => {
        // Find the approval to check if it's a day off request
        const approval = dashboard?.pendingApprovals?.find(a => a.id === historyId);
        
        let replacements = {};
        
        // If it's a driver day off request, check for conflicting trips first
        if (approval?.approvalType === "DRIVER_DAY_OFF" && approval?.details) {
            const driverId = approval.details.driverId || approval.driverId || approval.requestedByUserId;
            const startDate = approval.details.startDate;
            const endDate = approval.details.endDate || startDate;
            
            if (driverId && startDate) {
                try {
                    // Get driver schedule
                    const schedule = await getDriverSchedule(driverId);
                    const scheduleList = Array.isArray(schedule) ? schedule : [];
                    
                    // Parse date range
                    const leaveStart = new Date(startDate);
                    const leaveEnd = new Date(endDate);
                    leaveStart.setHours(0, 0, 0, 0);
                    leaveEnd.setHours(23, 59, 59, 999);
                    
                    // Find conflicting trips
                    const conflicts = scheduleList.filter(trip => {
                        const tripDate = new Date(trip.startTime || trip.start_time);
                        if (isNaN(tripDate.getTime())) return false;
                        
                        const status = trip.status || trip.tripStatus;
                        if (status === "COMPLETED" || status === "CANCELLED") return false;
                        
                        return tripDate >= leaveStart && tripDate <= leaveEnd;
                    });
                    
                    if (conflicts.length > 0) {
                        // Show modal with conflict trips and driver suggestions
                        const result = await showConflictResolutionModal(conflicts, driverId, approval);
                        
                        if (!result || !result.confirmed) {
                            // User chose to reject
                            const rejectNote = prompt("Lý do từ chối (tài xế có chuyến trong ngày nghỉ):");
                            if (rejectNote === null) return;
                            
                            setIdBusy(`approval-${historyId}`, true);
                            try {
                                await apiFetch(`/api/notifications/approvals/${historyId}/reject`, {
                                    method: "POST",
                                    body: { userId: Number(userId), note: rejectNote },
                                });
                                pushToast("Đã từ chối yêu cầu nghỉ phép", "success");
                                fetchAll();
                            } catch (err) {
                                console.error("Failed to reject:", err);
                                pushToast("Không thể từ chối. Vui lòng thử lại.", "error");
                            } finally {
                                setIdBusy(`approval-${historyId}`, false);
                            }
                            return;
                        }
                        
                        // User confirmed - get replacements
                        replacements = result.replacements || {};
                    }
                } catch (err) {
                    console.error("Failed to check driver trips:", err);
                    // Continue with approval even if check fails
                }
            }
        }
        
        // Proceed with approval
        const note = prompt("Ghi chú phê duyệt (tùy chọn):");
        if (note === null) return;

        setIdBusy(`approval-${historyId}`, true);
        try {
            // First approve the day-off request
            await apiFetch(`/api/notifications/approvals/${historyId}/approve`, {
                method: "POST",
                body: { userId: Number(userId), note },
            });
            
            // Then reassign trips with replacement drivers if any
            if (Object.keys(replacements).length > 0) {
                const { reassignTrips } = await import("../../api/dispatch");
                const reassignPromises = [];
                for (const [tripId, newDriverId] of Object.entries(replacements)) {
                    if (!tripId || !newDriverId) continue;
                    try {
                        // Get trip detail to get bookingId
                        const { getTripDetail } = await import("../../api/dispatch");
                        const tripDetail = await getTripDetail(Number(tripId));
                        const bookingId = tripDetail?.bookingId || tripDetail?.booking?.id;
                        
                        reassignPromises.push(
                            reassignTrips({
                                bookingId: bookingId ? Number(bookingId) : undefined,
                                tripIds: [Number(tripId)],
                                driverId: Number(newDriverId),
                                note: "Tài xế thay thế do tài xế cũ nghỉ phép"
                            }).catch(err => {
                                console.error(`Failed to reassign trip ${tripId}:`, err);
                                return { tripId, error: err };
                            })
                        );
                    } catch (err) {
                        console.error(`Failed to get trip detail for ${tripId}:`, err);
                    }
                }
                
                const results = await Promise.allSettled(reassignPromises);
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                const failCount = results.length - successCount;
                
                if (failCount > 0) {
                    pushToast(
                        `Đã phê duyệt. Gán thành công ${successCount}/${results.length} tài xế thay thế.`,
                        failCount === results.length ? "error" : "success"
                    );
                } else {
                    pushToast(
                        `Đã phê duyệt thành công! Đã gán ${successCount} tài xế thay thế.`,
                        "success"
                    );
                }
            } else {
                pushToast(
                    "Đã phê duyệt thành công! Hệ thống đã tự động xóa tài xế khỏi các chuyến xung đột.",
                    "success"
                );
            }
            
            fetchAll();
        } catch (err) {
            console.error("Failed to approve:", err);
            
            // Check if error message contains conflict info from backend
            const errMsg = err.message || err.toString();
            if (errMsg.includes("chuyến") || errMsg.includes("conflict")) {
                pushToast(`Lỗi khi phê duyệt: ${errMsg}`, "error");
            } else {
                pushToast("Không thể phê duyệt. Vui lòng thử lại.", "error");
            }
        } finally {
            setIdBusy(`approval-${historyId}`, false);
        }
    };

    const handleReject = async (historyId) => {
        const note = prompt("Lý do từ chối:");
        if (!note) {
            pushToast("Vui lòng nhập lý do từ chối", "error");
            return;
        }

        setIdBusy(`approval-${historyId}`, true);
        try {
            await apiFetch(`/api/notifications/approvals/${historyId}/reject`, {
                method: "POST",
                body: { userId: Number(userId), note },
            });
            pushToast("Đã từ chối yêu cầu", "success");
            fetchAll();
        } catch (err) {
            console.error("Failed to reject:", err);
            pushToast("Không thể từ chối. Vui lòng thử lại.", "error");
        } finally {
            setIdBusy(`approval-${historyId}`, false);
        }
    };

    // Toast notification system
    const [toasts, setToasts] = React.useState([]);
    const pushToast = React.useCallback((msg, kind = "info", ttl = 3000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((a) => [...a, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((a) => a.filter((t) => t.id !== id));
        }, ttl);
    }, []);

    const handleDeleteNotification = async (approval) => {
        const deleteKey = `delete-${approval.id}`;
        setIdBusy(deleteKey, true);
        try {
            // Xóa approval history (sẽ tự động xóa notification liên quan)
            await dismissApproval(approval.id, userId);
            
            // Đợi một chút để đảm bảo backend đã xóa xong
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Reload dashboard để cập nhật danh sách
            await fetchAll();
            
            // Thông báo toast sau khi xóa thành công
            pushToast("Đã xóa thông báo", "success");
        } catch (err) {
            console.error("Failed to delete notification:", err);
            pushToast("Không thể xóa thông báo. Vui lòng thử lại.", "error");
        } finally {
            setIdBusy(deleteKey, false);
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
            MEDIUM: { icon: Info, color: "text-primary-600", bg: "bg-info-50" },
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
        
        // Coordinator chỉ được duyệt nghỉ phép, Admin/Manager duyệt tất cả
        const isCoordinator = role === ROLES.COORDINATOR;
        const canApprove = isAdmin || role === ROLES.MANAGER || 
            (isCoordinator && approval.approvalType === "DRIVER_DAY_OFF");

        return (
            <div className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200 group">
                <div className="mt-0.5 p-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm transition-transform group-hover:scale-110">
                    <Icon className={cls("h-4 w-4", config.color)} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-900 font-semibold text-sm">{config.label}</span>
                        <span className="px-2 py-0.5 bg-info-100 text-info-800 text-[10px] font-bold rounded-full border border-info-200">
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
                                {approval.details.requesterName} · <span className="font-semibold text-primary-600">{approval.details.amount?.toLocaleString()} VNĐ</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    {canApprove && (
                        <>
                            <button
                                disabled={working}
                                onClick={() => handleApprove(approval.id)}
                                className={cls(
                                    "inline-flex items-center gap-1.5 rounded-lg border-2 border-sky-500 bg-white text-sky-700 hover:bg-sky-50 hover:shadow-md px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
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
                        </>
                    )}
                    
                    {/* Nút X để xóa thông báo */}
                    <button
                        disabled={busyIds.has(`delete-${approval.id}`)}
                        onClick={() => handleDeleteNotification(approval)}
                        className={cls(
                            "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 px-2 py-1.5 text-[12px] transition-all duration-200",
                            busyIds.has(`delete-${approval.id}`) ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                        )}
                        title="Xóa thông báo"
                    >
                        {busyIds.has(`delete-${approval.id}`) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <XCircle className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const alerts = dashboard?.alerts || [];
    const pending = dashboard?.pendingApprovals || [];
    const totalCount = alerts.length + pending.length;

    // Calculate unread count (alerts not acknowledged + pending approvals)
    const unreadAlerts = alerts.filter(a => !a.isAcknowledged).length;
    
    // For DRIVER role, use filtered WebSocket unreadCount (only driver-relevant notifications)
    // For CONSULTANT role, use pending deposit bookings count
    // For other roles, use alerts + pending count (dashboard notifications)
    const badgeCount = role === ROLES.DRIVER 
        ? wsNotifications.filter(n => {
            // Filter: chỉ đếm thông báo liên quan đến tài xế
            const driverNotificationTypes = [
                'TRIP_ASSIGNED', 'TRIP_ASSIGNMENT', 'ASSIGN_TRIP', // Chuyến mới được nhận
                'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_REQUEST_APPROVED', 'EXPENSE_REQUEST_REJECTED', // Duyệt chi phí
                'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED', // Duyệt thanh toán
                'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_APPROVAL', 'DRIVER_DAY_OFF_APPROVED', 'DRIVER_DAY_OFF_REJECTED', // Duyệt nghỉ phép
            ];
            // Chỉ đếm thông báo chưa đọc
            if (n.read) return false;
            // Nếu có type, kiểm tra type
            if (n.type) {
                return driverNotificationTypes.some(t => n.type.includes(t) || t.includes(n.type));
            }
            // Nếu không có type nhưng có message, kiểm tra message
            if (n.message) {
                const msg = n.message.toLowerCase();
                return msg.includes('chuyến') || 
                       msg.includes('chi phí') || 
                       msg.includes('thanh toán') || 
                       msg.includes('nghỉ phép') ||
                       msg.includes('duyệt') ||
                       msg.includes('trip') ||
                       msg.includes('expense') ||
                       msg.includes('payment') ||
                       msg.includes('leave');
            }
            // Nếu không có type và message không rõ, đếm nếu từ user-specific channel
            return true; // Đếm tất cả từ /topic/notifications/{userId}
        }).length
        : role === ROLES.CONSULTANT
            ? pendingDepositBookings.length + wsNotifications.filter(n => {
                // Consultant nhận thông báo khi kế toán duyệt payment request
                if (n.read) return false;
                // Filter payment approval/rejection notifications
                const paymentNotificationTypes = [
                    'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 
                    'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED',
                    'PAYMENT_UPDATE'
                ];
                // Kiểm tra type
                if (n.type) {
                    return paymentNotificationTypes.some(t => 
                        n.type.includes(t) || t.includes(n.type) || 
                        n.type === 'PAYMENT_UPDATE'
                    );
                }
                // Kiểm tra message
                if (n.message) {
                    const msg = n.message.toLowerCase();
                    return msg.includes('thanh toán') || 
                           msg.includes('payment') ||
                           msg.includes('duyệt') ||
                           msg.includes('approve') ||
                           msg.includes('reject');
                }
                // Nếu từ user-specific channel và có liên quan đến payment
                return n.data?.paymentId || n.data?.requestId;
            }).length
            : (unreadAlerts + pending.length + pendingDepositBookings.length);

    // Helper to format time remaining
    const formatTimeRemaining = (startTime) => {
        const now = new Date();
        const start = new Date(startTime);
        const diffMs = start - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHours <= 0 && diffMins <= 0) return "Đã quá hạn";
        if (diffHours < 1) return `${diffMins} phút`;
        if (diffHours < 24) return `${diffHours}h ${diffMins}p`;
        return `${Math.floor(diffHours / 24)} ngày`;
    };

    // Pending deposit booking item component
    const PendingDepositItem = ({ booking }) => {
        const trip = booking.trips?.[0];
        const customer = booking.customer;
        const startTime = trip?.startTime;
        const timeRemaining = startTime ? formatTimeRemaining(startTime) : "";
        const isUrgent = startTime && (new Date(startTime) - new Date()) < 24 * 60 * 60 * 1000;
        
        return (
            <div 
                className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 hover:bg-gradient-to-r hover:from-info-50 hover:to-white transition-all duration-200 group cursor-pointer"
                onClick={() => {
                    setShowDropdown(false);
                    navigate(`/orders/${booking.bookingId || booking.id}`);
                }}
            >
                <div className={cls(
                    "mt-0.5 p-2 rounded-lg shadow-sm transition-transform group-hover:scale-110",
                    isUrgent ? "bg-red-50" : "bg-info-50"
                )}>
                    <CreditCard className={cls("h-4 w-4", isUrgent ? "text-red-600" : "text-primary-600")} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900 font-semibold text-sm">
                            #{booking.bookingId || booking.id}
                        </span>
                        <span className={cls(
                            "px-2 py-0.5 text-[10px] font-bold rounded-full border",
                            isUrgent 
                                ? "bg-red-100 text-red-800 border-red-200" 
                                : "bg-info-100 text-info-800 border-info-200"
                        )}>
                            Chưa cọc
                        </span>
                        {isUrgent && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                Khẩn cấp
                            </span>
                        )}
                    </div>

                    <div className="text-[12px] leading-5 text-slate-600 space-y-1">
                        {customer && (
                            <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span className="font-medium text-slate-700">{customer.fullName || customer.phone}</span>
                            </div>
                        )}
                        {trip?.startLocation && (
                            <div className="flex items-start gap-1.5 truncate" title={trip.startLocation}>
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                                <span className="truncate">{trip.startLocation}</span>
                            </div>
                        )}
                        {startTime && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>
                                    {new Date(startTime).toLocaleDateString('vi-VN')} {new Date(startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={cls(
                                    "ml-1 text-[10px] font-semibold",
                                    isUrgent ? "text-red-600" : "text-primary-600"
                                )}>
                                    (còn {timeRemaining})
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-info-500" />
                        Yêu cầu đặt cọc trước 48h - Tài xế/xe chưa giữ lịch
                    </div>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary-600 transition-colors shrink-0" />
            </div>
        );
    };

    // Toast component
    const ToastContainer = () => (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-lg border min-w-[280px] max-w-md",
                        t.kind === "success" &&
                            "bg-emerald-50 border-emerald-300 text-emerald-800",
                        t.kind === "error" &&
                            "bg-rose-50 border-rose-300 text-rose-800",
                        t.kind === "info" &&
                            "bg-blue-50 border-blue-300 text-blue-800"
                    )}
                >
                    <div className="flex items-center gap-2">
                        {t.kind === "success" && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {t.kind === "error" && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                        {t.kind === "info" && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
                        <span className="font-medium">{t.msg}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className={isPageMode ? "min-h-screen" : "relative"}>
            <ToastContainer />
            
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
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-info-500 border-2 border-white shadow-sm"></span>
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
                                            ? "bg-gradient-to-r from-info-50 to-info-100 text-info-700 border-2 border-info-300 shadow-sm"
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
                        {role === ROLES.DRIVER ? (
                            // Driver view - Only show relevant notifications
                            <div className="min-h-[300px] max-h-[calc(85vh-80px)] overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                <SectionHeader
                                    icon={<Bell className="h-4 w-4" />}
                                    title="Thông báo của bạn"
                                    count={wsNotifications.filter(n => {
                                        // Filter: chỉ hiển thị thông báo liên quan đến tài xế
                                        const driverNotificationTypes = [
                                            'TRIP_ASSIGNED', 'TRIP_ASSIGNMENT', 'ASSIGN_TRIP', // Chuyến mới được nhận
                                            'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_REQUEST_APPROVED', 'EXPENSE_REQUEST_REJECTED', // Duyệt chi phí
                                            'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED', // Duyệt thanh toán
                                            'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_APPROVAL', 'DRIVER_DAY_OFF_APPROVED', 'DRIVER_DAY_OFF_REJECTED', // Duyệt nghỉ phép
                                        ];
                                        // Nếu có type, kiểm tra type
                                        if (n.type) {
                                            return driverNotificationTypes.some(t => n.type.includes(t) || t.includes(n.type));
                                        }
                                        // Nếu không có type nhưng có message, kiểm tra message
                                        if (n.message) {
                                            const msg = n.message.toLowerCase();
                                            return msg.includes('chuyến') || 
                                                   msg.includes('chi phí') || 
                                                   msg.includes('thanh toán') || 
                                                   msg.includes('nghỉ phép') ||
                                                   msg.includes('duyệt') ||
                                                   msg.includes('trip') ||
                                                   msg.includes('expense') ||
                                                   msg.includes('payment') ||
                                                   msg.includes('leave');
                                        }
                                        // Nếu không có type và message không rõ, chỉ hiển thị nếu từ user-specific channel
                                        return true; // Hiển thị tất cả từ /topic/notifications/{userId}
                                    }).length}
                                />
                                
                                {/* Connection Status for Driver */}
                                <div className="px-4 py-2 mb-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        {connected ? (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                                <span className="text-green-600">Đã kết nối</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                                <span className="text-red-600">Mất kết nối</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Filter notifications for Driver */}
                                {(() => {
                                    const driverNotifications = wsNotifications.filter(n => {
                                        // Filter: chỉ hiển thị thông báo liên quan đến tài xế
                                        const driverNotificationTypes = [
                                            'TRIP_ASSIGNED', 'TRIP_ASSIGNMENT', 'ASSIGN_TRIP', // Chuyến mới được nhận
                                            'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_REQUEST_APPROVED', 'EXPENSE_REQUEST_REJECTED', // Duyệt chi phí
                                            'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED', // Duyệt thanh toán
                                            'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_APPROVAL', 'DRIVER_DAY_OFF_APPROVED', 'DRIVER_DAY_OFF_REJECTED', // Duyệt nghỉ phép
                                        ];
                                        // Nếu có type, kiểm tra type
                                        if (n.type) {
                                            return driverNotificationTypes.some(t => n.type.includes(t) || t.includes(n.type));
                                        }
                                        // Nếu không có type nhưng có message, kiểm tra message
                                        if (n.message) {
                                            const msg = n.message.toLowerCase();
                                            return msg.includes('chuyến') || 
                                                   msg.includes('chi phí') || 
                                                   msg.includes('thanh toán') || 
                                                   msg.includes('nghỉ phép') ||
                                                   msg.includes('duyệt') ||
                                                   msg.includes('trip') ||
                                                   msg.includes('expense') ||
                                                   msg.includes('payment') ||
                                                   msg.includes('leave');
                                        }
                                        // Nếu không có type và message không rõ, chỉ hiển thị nếu từ user-specific channel
                                        return true; // Hiển thị tất cả từ /topic/notifications/{userId}
                                    });

                                    if (driverNotifications.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                    <Inbox className="h-8 w-8 text-slate-400" />
                                                </div>
                                                <div className="text-sm font-medium text-slate-600 mb-1">Không có thông báo mới</div>
                                                <div className="text-xs text-slate-500">Bạn sẽ nhận được thông báo khi có chuyến mới, duyệt chi phí/thanh toán, hoặc duyệt nghỉ phép!</div>
                                            </div>
                                        );
                                    }

                                    return driverNotifications.map((notif) => {
                                        // Determine icon and color based on notification type
                                        let Icon = Bell;
                                        let iconBg = notif.read ? "bg-slate-100" : "bg-sky-50";
                                        let iconColor = notif.read ? "text-slate-400" : "text-sky-600";
                                        
                                        if (notif.type) {
                                            if (notif.type.includes('TRIP') || notif.type.includes('ASSIGN')) {
                                                Icon = CarFront;
                                                iconBg = notif.read ? "bg-info-50" : "bg-info-100";
                                                iconColor = notif.read ? "text-info-500" : "text-primary-600";
                                            } else if (notif.type.includes('EXPENSE')) {
                                                Icon = DollarSign;
                                                iconBg = notif.read ? "bg-emerald-50" : "bg-emerald-100";
                                                iconColor = notif.read ? "text-emerald-500" : "text-emerald-600";
                                            } else if (notif.type.includes('PAYMENT')) {
                                                Icon = CreditCard;
                                                iconBg = notif.read ? "bg-blue-50" : "bg-blue-100";
                                                iconColor = notif.read ? "text-blue-500" : "text-blue-600";
                                            } else if (notif.type.includes('LEAVE') || notif.type.includes('DAY_OFF')) {
                                                Icon = CalendarDays;
                                                iconBg = notif.read ? "bg-purple-50" : "bg-purple-100";
                                                iconColor = notif.read ? "text-purple-500" : "text-purple-600";
                                            }
                                        }

                                        return (
                                            <div 
                                                key={notif.id} 
                                                className={cls(
                                                    "flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 transition-colors cursor-pointer group",
                                                    notif.read 
                                                        ? "bg-slate-50/50 hover:bg-slate-100/50" 
                                                        : "bg-white hover:bg-sky-50/50"
                                                )}
                                                onClick={() => {
                                                    if (!notif.read) {
                                                        markAsRead(notif.id);
                                                    }
                                                }}
                                            >
                                                <div className={cls(
                                                    "mt-0.5 p-2 rounded-lg shadow-sm",
                                                    iconBg
                                                )}>
                                                    <Icon className={cls(
                                                        "h-4 w-4",
                                                        iconColor
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={cls(
                                                        "text-sm mb-1",
                                                        notif.read 
                                                            ? "font-medium text-slate-600" 
                                                            : "font-semibold text-slate-900"
                                                    )}>
                                                        {notif.title}
                                                        {!notif.read && (
                                                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-sky-500"></span>
                                                        )}
                                                    </div>
                                                    <div className={cls(
                                                        "text-xs leading-relaxed",
                                                        notif.read ? "text-slate-500" : "text-slate-600"
                                                    )}>
                                                        {notif.message}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(notif.timestamp).toLocaleString('vi-VN')}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearNotification(notif.id);
                                                    }}
                                                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Xóa thông báo"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        ) : role === ROLES.CONSULTANT ? (
                            // Consultant view - Show pending deposit bookings + payment approval notifications
                            <div className="min-h-[300px] max-h-[calc(85vh-80px)] overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                {/* Payment Approval Notifications Section */}
                                {(() => {
                                    const paymentNotifications = wsNotifications.filter(n => {
                                        if (n.read) return false;
                                        const paymentNotificationTypes = [
                                            'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 
                                            'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED',
                                            'PAYMENT_UPDATE'
                                        ];
                                        if (n.type) {
                                            return paymentNotificationTypes.some(t => 
                                                n.type.includes(t) || t.includes(n.type) || 
                                                n.type === 'PAYMENT_UPDATE'
                                            );
                                        }
                                        if (n.message) {
                                            const msg = n.message.toLowerCase();
                                            return msg.includes('thanh toán') || 
                                                   msg.includes('payment') ||
                                                   msg.includes('duyệt') ||
                                                   msg.includes('approve') ||
                                                   msg.includes('reject');
                                        }
                                        return n.data?.paymentId || n.data?.requestId;
                                    });
                                    
                                    return paymentNotifications.length > 0 ? (
                                        <>
                                            <SectionHeader
                                                icon={<DollarSign className="h-4 w-4 text-green-600" />}
                                                title="Duyệt thanh toán"
                                                count={paymentNotifications.length}
                                            />
                                            {paymentNotifications.map((notif) => {
                                                const isApproved = notif.type?.includes('APPROVED') || 
                                                                  notif.message?.toLowerCase().includes('duyệt') ||
                                                                  notif.message?.toLowerCase().includes('approve');
                                                const isRejected = notif.type?.includes('REJECTED') || 
                                                                  notif.message?.toLowerCase().includes('từ chối') ||
                                                                  notif.message?.toLowerCase().includes('reject');
                                                
                                                return (
                                                    <div
                                                        key={notif.id}
                                                        className={cls(
                                                            "mx-4 mt-3 px-4 py-3 rounded-lg border shadow-sm",
                                                            isApproved && "bg-green-50 border-green-200",
                                                            isRejected && "bg-red-50 border-red-200",
                                                            !isApproved && !isRejected && "bg-slate-50 border-slate-200"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {isApproved ? (
                                                                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                                                    ) : isRejected ? (
                                                                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                                                    ) : (
                                                                        <Info className="h-4 w-4 text-slate-600 shrink-0" />
                                                                    )}
                                                                    <span className={cls(
                                                                        "text-xs font-semibold",
                                                                        isApproved && "text-green-700",
                                                                        isRejected && "text-red-700",
                                                                        !isApproved && !isRejected && "text-slate-700"
                                                                    )}>
                                                                        {isApproved ? "Đã duyệt" : isRejected ? "Đã từ chối" : "Cập nhật thanh toán"}
                                                                    </span>
                                                                </div>
                                                                <div className={cls(
                                                                    "text-sm leading-5",
                                                                    isApproved && "text-green-800",
                                                                    isRejected && "text-red-800",
                                                                    !isApproved && !isRejected && "text-slate-700"
                                                                )}>
                                                                    {notif.message || notif.title || "Cập nhật thanh toán"}
                                                                </div>
                                                                {notif.timestamp && (
                                                                    <div className="text-xs text-slate-500 mt-1">
                                                                        {new Date(notif.timestamp).toLocaleString('vi-VN')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {!notif.read && (
                                                                    <button
                                                                        onClick={() => markAsRead(notif.id)}
                                                                        className="p-1 rounded hover:bg-white/50 transition-colors"
                                                                        title="Đánh dấu đã đọc"
                                                                    >
                                                                        <Check className="h-3.5 w-3.5 text-slate-400" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => clearNotification(notif.id)}
                                                                    className="p-1 rounded hover:bg-white/50 transition-colors"
                                                                    title="Xóa"
                                                                >
                                                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : null;
                                })()}
                                
                                <SectionHeader
                                    icon={<CreditCard className="h-4 w-4 text-primary-600" />}
                                    title="Đơn chưa đặt cọc"
                                    count={pendingDepositBookings.length}
                                    right={
                                        <button
                                            onClick={fetchPendingDeposit}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                            title="Làm mới"
                                        >
                                            <RefreshCw className={cls("h-3.5 w-3.5 text-slate-500", loadingDeposit && "animate-spin")} />
                                        </button>
                                    }
                                />

                                {/* Info banner */}
                                <div className="mx-4 mt-3 px-3 py-2.5 text-[11px] leading-5 text-info-800 bg-gradient-to-r from-info-50 to-info-100 border border-info-200 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold mb-0.5">Yêu cầu đặt cọc trước 48 giờ</div>
                                        <span>Đơn chưa cọc coi như chưa xác nhận. Tài xế - xe chưa giữ lịch.</span>
                                    </div>
                                </div>

                                {loadingDeposit && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12">
                                        <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
                                        <div className="text-sm text-slate-600 font-medium">Đang tải...</div>
                                    </div>
                                )}

                                {!loadingDeposit && pendingDepositBookings.length === 0 && (
                                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                                        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                            <Check className="h-8 w-8 text-emerald-600" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-600 mb-1">Không có đơn nào chờ cọc</div>
                                        <div className="text-xs text-slate-500">Tất cả đơn trong 48h tới đều đã đặt cọc!</div>
                                    </div>
                                )}

                                {!loadingDeposit && pendingDepositBookings.map((booking) => (
                                    <PendingDepositItem key={booking.bookingId || booking.id} booking={booking} />
                                ))}
                            </div>
                        ) : (
                            // Coordinator/Manager/Admin view - Show alerts and pending approvals
                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 max-h-[calc(85vh-80px)] overflow-hidden">
                                {/* Cột Cảnh báo */}
                                <div className="min-h-[300px] max-h-[calc(85vh-80px)] overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                    <SectionHeader
                                        icon={<ShieldAlert className="h-4 w-4" />}
                                        title="Cảnh báo"
                                        count={alerts.length}
                                    />

                                    {error && (
                                        <div className="mx-4 mt-3 px-4 py-3 text-[12px] leading-5 text-info-800 bg-gradient-to-r from-info-50 to-info-100 border border-info-200 rounded-lg flex items-start gap-2 shadow-sm">
                                            <AlertTriangle className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <div className="font-semibold mb-1">Lỗi tải dữ liệu</div>
                                                <span>{error}</span>
                                            </div>
                                            <button
                                                onClick={fetchAll}
                                                className="shrink-0 text-info-700 hover:text-info-900 transition-colors"
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
                        )}
                    </div>
                </>
            )}
            
            {/* Conflict Resolution Modal */}
            {showConflictModal && conflictData && (
                <ConflictResolutionModal
                    conflicts={conflictData.conflicts}
                    driverId={conflictData.driverId}
                    approval={conflictData.approval}
                    onResolve={conflictData.onResolve}
                />
            )}
        </div>
    );
}

/**
 * Modal để xử lý conflict khi duyệt nghỉ phép có chuyến
 */
function ConflictResolutionModal({ conflicts, driverId, approval, onResolve }) {
    const [loading, setLoading] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState({});
    const [selectedReplacements, setSelectedReplacements] = React.useState({});
    
    React.useEffect(() => {
        // Load suggestions for each conflict trip
        async function loadSuggestions() {
            setLoading(true);
            const newSuggestions = {};
            
            for (const trip of conflicts) {
                const tripId = trip.tripId || trip.trip_id || trip.id;
                try {
                    const { getAssignmentSuggestions } = await import("../../api/dispatch");
                    const data = await getAssignmentSuggestions(tripId);
                    newSuggestions[tripId] = data?.drivers || [];
                } catch (err) {
                    console.error(`Failed to load suggestions for trip ${tripId}:`, err);
                    newSuggestions[tripId] = [];
                }
            }
            
            setSuggestions(newSuggestions);
            setLoading(false);
        }
        
        loadSuggestions();
    }, [conflicts]);
    
    const handleApproveWithReplacements = async () => {
        // Check if all trips have replacement selected
        const missingReplacements = conflicts.filter(trip => {
            const tripId = trip.tripId || trip.trip_id || trip.id;
            return !selectedReplacements[tripId];
        });
        
        if (missingReplacements.length > 0) {
            pushToast(`Vui lòng chọn tài xế thay thế cho ${missingReplacements.length} chuyến`, "error");
            return;
        }
        
        // User confirmed with replacements selected
        onResolve({ 
            confirmed: true, 
            replacements: selectedReplacements 
        });
    };
    
    const handleReject = () => {
        onResolve({ confirmed: false });
    };
    
    const handleApproveWithoutReplacement = () => {
        if (confirm('⚠️ Bạn chắc chắn muốn duyệt mà không chọn tài xế thay thế?\n\nHệ thống sẽ xóa tài xế khỏi các chuyến và tạo cảnh báo để bạn sắp xếp sau.')) {
            onResolve({ confirmed: true, replacements: {} });
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-info-50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-info-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Xử lý chuyến xung đột
                                </h3>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    Tài xế có {conflicts.length} chuyến trong thời gian nghỉ phép
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleReject}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                            <span className="ml-3 text-slate-600">Đang tải gợi ý tài xế...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {conflicts.map((trip, idx) => {
                                const tripId = trip.tripId || trip.trip_id || trip.id;
                                const tripSuggestions = suggestions[tripId] || [];
                                const selectedDriver = selectedReplacements[tripId];
                                
                                return (
                                    <div key={tripId} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-slate-900">
                                                        Chuyến #{tripId}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(trip.startTime || trip.start_time).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-600">
                                                    <MapPin className="h-3.5 w-3.5 inline mr-1" />
                                                    {trip.startLocation || trip.start_location} → {trip.endLocation || trip.end_location}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3">
                                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                                Chọn tài xế thay thế:
                                            </label>
                                            <select
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                                value={selectedDriver || ''}
                                                onChange={(e) => setSelectedReplacements(prev => ({
                                                    ...prev,
                                                    [tripId]: e.target.value ? Number(e.target.value) : null
                                                }))}
                                            >
                                                <option value="">-- Chọn tài xế --</option>
                                                {tripSuggestions.map(driver => (
                                                    <option key={driver.driverId} value={driver.driverId}>
                                                        {driver.driverName} (Còn {driver.todayTrips || 0} chuyến hôm nay)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <button
                        onClick={handleApproveWithoutReplacement}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Duyệt không chọn thay thế
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleReject}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Từ chối đơn nghỉ
                        </button>
                        <button
                            onClick={handleApproveWithReplacements}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Duyệt & Gán tài xế thay thế
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// tiny util
function cls(...a) {
    return a.filter(Boolean).join(" ");
}
