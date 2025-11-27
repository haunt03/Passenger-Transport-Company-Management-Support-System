// src/components/module7/ManagerDashboardPro.jsx
import React from "react";
import {
    RefreshCw,
    Building2,
    Calendar,
    TrendingUp,
    TrendingDown,
    Car,
    User,
    CheckCircle2,
    XCircle,
    Gauge,
    AlertTriangle,
    FileCheck,
    DollarSign,
    Clock,
} from "lucide-react";
import { getStoredUserId } from "../../utils/session";
import { getBranchByUserId } from "../../api/branches";
import {
    getManagerDashboard,
    getBranchRevenueTrend,
    getBranchDriverPerformance,
    getBranchVehicleUtilization,
    getBranchVehicleEfficiency,
    getBranchExpenseBreakdown,
    getBranchPendingApprovals,
    getBranchAlerts,
    approveDayOff,
    rejectDayOff,
    approveExpenseRequest,
    rejectExpenseRequest,
} from "../../api/dashboards";
import AlertsPanel from "./shared/AlertsPanel";
import TrendChart from "./shared/TrendChart";

/**
 * ManagerDashboardPro – LIGHT THEME
 *
 * Dashboard cấp chi nhánh (Manager nhìn thấy)
 * - Đồng bộ style với AdminBranchListPage + AdminDashboardPro (light):
 *   • bg-slate-50
 *   • Card trắng border-slate-200 shadow-sm
 *   • Text slate-900 / slate-600
 *   • Button bg-white border-slate-300 / primary sky-600
 *
 * Logic mock giữ nguyên.
 * Chưa nối API.
 */

/* -------------------- Helpers -------------------- */
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));
const fmtInt = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

/* -------------------- Toast system (light) -------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((a) => [...a, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((a) => a.filter((t) => t.id !== id));
        }, ttl);
    };
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-md px-3 py-2 text-sm shadow border",
                        t.kind === "success" &&
                        "bg-amber-50 border-amber-300 text-amber-700",
                        t.kind === "error" &&
                        "bg-rose-50 border-rose-300 text-rose-700",
                        t.kind === "info" &&
                        "bg-white border-slate-300 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

// Removed FALLBACK_METRICS and FALLBACK_TRIPS - chỉ dùng data từ API, báo lỗi nếu không fetch được

/* -------------------- KPI CARD (light style) -------------------- */
function KpiBlock({
                      label,
                      value,
                      sub,
                      deltaPct,
                      up,
                      icon,
                  }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
            {/* header row: label + delta chip */}
            <div className="flex items-start justify-between">
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    {icon}
                    <span className="text-slate-600">{label}</span>
                </div>

                {typeof deltaPct === "number" ? (
                    <span
                        className={cls(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border font-medium",
                            up
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-rose-50 text-rose-700 border-rose-300"
                        )}
                    >
                        {up ? (
                            <TrendingUp className="h-3 w-3" />
                        ) : (
                            <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(deltaPct).toFixed(1)}%
                    </span>
                ) : null}
            </div>

            {/* value / sub */}
            <div>
                <div className="text-xl font-semibold text-slate-900 tabular-nums leading-none">
                    {value}
                </div>
                {sub ? (
                    <div className="text-[11px] text-slate-500 leading-snug mt-1">
                        {sub}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/* -------------------- TripsSummary Card (light) -------------------- */
function TripsSummaryCard({ completed, cancelled, kmTotal }) {
    const cancelRate =
        (cancelled / Math.max(1, completed + cancelled)) * 100;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-slate-600">Hiệu suất chuyến</span>
                <span className="text-[10px] text-slate-400">
                    Theo kỳ lọc
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
                {/* Hoàn thành */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-start">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                        <span>Hoàn thành</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900 leading-none">
                        {fmtInt(completed)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                        chuyến
                    </div>
                </div>

                {/* Hủy */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-start">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Huỷ</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900 leading-none">
                        {fmtInt(cancelled)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                        {cancelRate.toFixed(1)}% huỷ
                    </div>
                </div>

                {/* Km chạy */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-start">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Car className="h-3.5 w-3.5 text-sky-600" />
                        <span>KM chạy</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900 leading-none">
                        {fmtInt(kmTotal)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                        km / kỳ
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------- Driver Performance table (light) -------------------- */
function DriverPerfTable({ rows }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-md bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4" />
                </div>

                <div className="text-slate-700 font-medium leading-none">
                    Hiệu suất tài xế
                </div>

                <div className="text-[11px] text-slate-500 leading-none ml-auto">
                    Trips &amp; km đã chạy
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left">
                            Tài xế
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left whitespace-nowrap">
                            Số chuyến
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left whitespace-nowrap">
                            KM chạy
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {(!rows || rows.length === 0) ? (
                        <tr>
                            <td colSpan="3" className="px-3 py-8 text-center text-slate-500 text-sm">
                                Chưa có dữ liệu tài xế trong kỳ này
                            </td>
                        </tr>
                    ) : (
                        rows.map((d) => (
                            <tr
                                key={d.driverId}
                                className="border-b border-slate-200 hover:bg-slate-50/70"
                            >
                                <td className="px-3 py-2 text-slate-900 text-sm font-medium">
                                    {d.driverName}
                                </td>
                                <td className="px-3 py-2 text-slate-700 text-sm font-medium tabular-nums">
                                    {fmtInt(d.trips)}
                                </td>
                                <td className="px-3 py-2 text-slate-700 text-sm tabular-nums">
                                    {fmtInt(d.km)} km
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                Dựa trên chuyến đã hoàn thành trong kỳ lọc.
            </div>
        </div>
    );
}

/* -------------------- Vehicle Efficiency table (light) -------------------- */
function VehiclePerfTable({ rows }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-md bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center shadow-sm">
                    <Car className="h-4 w-4" />
                </div>

                <div className="text-slate-700 font-medium leading-none">
                    Hiệu suất xe
                </div>

                <div className="text-[11px] text-slate-500 leading-none ml-auto">
                    Chi phí/km thấp là tốt
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left">
                            Biển số
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left whitespace-nowrap">
                            Chi phí/km
                        </th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-xs text-left whitespace-nowrap">
                            KM chạy
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {(!rows || rows.length === 0) ? (
                        <tr>
                            <td colSpan="3" className="px-3 py-8 text-center text-slate-500 text-sm">
                                Chưa có dữ liệu xe trong kỳ này
                            </td>
                        </tr>
                    ) : (
                        rows.map((v, idx) => (
                            <tr
                                key={v.licensePlate || idx}
                                className="border-b border-slate-200 hover:bg-slate-50/70"
                            >
                                <td className="px-3 py-2 text-slate-900 text-sm font-medium">
                                    {v.licensePlate}
                                </td>
                                <td className="px-3 py-2 text-slate-700 text-sm font-medium tabular-nums">
                                    {fmtVND(v.costPerKm)} đ/km
                                </td>
                                <td className="px-3 py-2 text-slate-700 text-sm tabular-nums">
                                    {fmtInt(v.totalKm)} km
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                Gồm nhiên liệu, bảo trì, phí cầu đường...
            </div>
        </div>
    );
}

/* -------------------- MAIN COMPONENT (light theme) -------------------- */
export default function ManagerDashboardPro() {
    const { toasts, push } = useToasts();

    // State
    const PERIOD_OPTIONS = [
        { value: "TODAY", label: "Hôm nay" },
        { value: "THIS_WEEK", label: "Tuần này" },
        { value: "THIS_MONTH", label: "Tháng này" },
        { value: "THIS_QUARTER", label: "Quý này" },
        { value: "YTD", label: "Năm nay" },
    ];

    const [period, setPeriod] = React.useState("THIS_MONTH");
    const [branch, setBranch] = React.useState("");
    const [branchInfo, setBranchInfo] = React.useState(null);
    const [branchLoading, setBranchLoading] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [allBranches, setAllBranches] = React.useState([]);
    const [isAdmin, setIsAdmin] = React.useState(false);

    // Dashboard data
    const [dashboardData, setDashboardData] = React.useState(null);
    const [revenueTrend, setRevenueTrend] = React.useState([]);
    const [driverPerformance, setDriverPerformance] = React.useState([]);
    const [vehicleUtilization, setVehicleUtilization] = React.useState({});
    const [vehicleEfficiency, setVehicleEfficiency] = React.useState([]);
    const [expenseBreakdown, setExpenseBreakdown] = React.useState([]);
    const [pendingApprovals, setPendingApprovals] = React.useState([]);
    const [alerts, setAlerts] = React.useState([]);
    const [dataLoading, setDataLoading] = React.useState(false);

    // Check if user is admin
    React.useEffect(() => {
        const roleName = localStorage.getItem("roleName");
        setIsAdmin(roleName === "Admin");
    }, []);

    // Load all branches for admin
    React.useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            try {
                const { listBranches } = await import("../../api/branches");
                const branchData = await listBranches({ size: 100 });
                let branchesList = [];
                if (branchData?.items && Array.isArray(branchData.items)) {
                    branchesList = branchData.items;
                } else if (branchData?.data?.items && Array.isArray(branchData.data.items)) {
                    branchesList = branchData.data.items;
                } else if (branchData?.data?.content && Array.isArray(branchData.data.content)) {
                    branchesList = branchData.data.content;
                } else if (branchData?.content && Array.isArray(branchData.content)) {
                    branchesList = branchData.content;
                } else if (Array.isArray(branchData?.data)) {
                    branchesList = branchData.data;
                } else if (Array.isArray(branchData)) {
                    branchesList = branchData;
                }
                setAllBranches(branchesList);
                // Set first branch as default for admin
                if (branchesList.length > 0 && !branchInfo) {
                    setBranchInfo(branchesList[0]);
                    setBranch(branchesList[0].branchName);
                }
            } catch (error) {
                console.error("Failed to load branches:", error);
            }
        })();
    }, [isAdmin, branchInfo]);

    // Load branch info on mount for non-admin users
    React.useEffect(() => {
        if (isAdmin) return; // Admin selects branch manually
        const userId = getStoredUserId();
        if (!userId) return;
        let cancelled = false;
        (async () => {
            setBranchLoading(true);
            try {
                const data = await getBranchByUserId(userId);
                if (cancelled) return;
                if (data?.branchName) {
                    setBranch(data.branchName);
                }
                setBranchInfo(data || null);
            } catch {
                if (!cancelled) {
                    setBranchInfo(null);
                }
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    // Load dashboard data when branchInfo or period changes
    React.useEffect(() => {
        if (!branchInfo?.id) return;
        let cancelled = false;
        (async () => {
            setDataLoading(true);
            try {
                // Use Promise.allSettled to handle partial failures gracefully
                const results = await Promise.allSettled([
                    getManagerDashboard({ branchId: branchInfo.id, period }),
                    getBranchRevenueTrend({ branchId: branchInfo.id }),
                    getBranchDriverPerformance({ branchId: branchInfo.id, limit: 5 }),
                    getBranchVehicleUtilization({ branchId: branchInfo.id }),
                    getBranchVehicleEfficiency({ branchId: branchInfo.id, period }),
                    getBranchExpenseBreakdown({ branchId: branchInfo.id }),
                    getBranchPendingApprovals({ branchId: branchInfo.id }),
                    getBranchAlerts({ branchId: branchInfo.id, severity: "HIGH,CRITICAL" }),
                ]);

                if (cancelled) return;

                // Extract results, handling both fulfilled and rejected promises
                const [
                    dashboardResult,
                    revenueTrendResult,
                    driverPerformanceResult,
                    vehicleUtilizationResult,
                    vehicleEfficiencyResult,
                    expenseBreakdownResult,
                    pendingApprovalsResult,
                    alertsResult,
                ] = results;

                // Set data, using fallback values for failed requests
                if (dashboardResult.status === 'fulfilled') {
                    setDashboardData(dashboardResult.value);
                } else {
                    console.error("Error loading dashboard data:", dashboardResult.reason);
                    setDashboardData(null);
                }

                setRevenueTrend(revenueTrendResult.status === 'fulfilled' ? (revenueTrendResult.value || []) : []);
                setDriverPerformance(driverPerformanceResult.status === 'fulfilled' ? (driverPerformanceResult.value || []) : []);
                setVehicleUtilization(vehicleUtilizationResult.status === 'fulfilled' ? (vehicleUtilizationResult.value || {}) : {});
                setVehicleEfficiency(vehicleEfficiencyResult.status === 'fulfilled' ? (vehicleEfficiencyResult.value || []) : []);
                setExpenseBreakdown(expenseBreakdownResult.status === 'fulfilled' ? (expenseBreakdownResult.value || []) : []);
                setPendingApprovals(pendingApprovalsResult.status === 'fulfilled' ? (pendingApprovalsResult.value || []) : []);
                setAlerts(alertsResult.status === 'fulfilled' ? (alertsResult.value || []) : []);

                // Log any errors for debugging
                const errors = results
                    .map((r, idx) => r.status === 'rejected' ? idx : null)
                    .filter(idx => idx !== null);
                if (errors.length > 0) {
                    const apiNames = [
                        'dashboard',
                        'revenue-trend',
                        'driver-performance',
                        'vehicle-utilization',
                        'vehicle-efficiency',
                        'expense-breakdown',
                        'pending-approvals',
                        'alerts'
                    ];
                    console.warn("Some APIs failed to load:", errors.map(idx => apiNames[idx]).join(', '));
                }

                // Update branch name
                const newBranchName = branchInfo?.branchName || branch;
                setBranch(newBranchName);
            } catch (err) {
                if (!cancelled) {
                    console.error("Error loading dashboard:", err);
                    push("Không thể tải dữ liệu dashboard: " + (err.message || "Lỗi không xác định"), "error");
                    setDashboardData(null);
                }
            } finally {
                if (!cancelled) setDataLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchInfo?.id, period]);

    // Refresh data
    const onRefresh = () => {
        if (!branchInfo?.id) return;
        setLoading(true);
        (async () => {
            try {
                // Use Promise.allSettled to handle partial failures gracefully
                const results = await Promise.allSettled([
                    getManagerDashboard({ branchId: branchInfo.id, period }),
                    getBranchRevenueTrend({ branchId: branchInfo.id }),
                    getBranchDriverPerformance({ branchId: branchInfo.id, limit: 5 }),
                    getBranchVehicleUtilization({ branchId: branchInfo.id }),
                    getBranchVehicleEfficiency({ branchId: branchInfo.id, period }),
                    getBranchExpenseBreakdown({ branchId: branchInfo.id }),
                    getBranchPendingApprovals({ branchId: branchInfo.id }),
                    getBranchAlerts({ branchId: branchInfo.id, severity: "HIGH,CRITICAL" }),
                ]);

                // Extract results, handling both fulfilled and rejected promises
                const [
                    dashboardResult,
                    revenueTrendResult,
                    driverPerformanceResult,
                    vehicleUtilizationResult,
                    vehicleEfficiencyResult,
                    expenseBreakdownResult,
                    pendingApprovalsResult,
                    alertsResult,
                ] = results;

                // Set data, using fallback values for failed requests
                if (dashboardResult.status === 'fulfilled') {
                    setDashboardData(dashboardResult.value);
                } else {
                    console.error("Error refreshing dashboard data:", dashboardResult.reason);
                }

                setRevenueTrend(revenueTrendResult.status === 'fulfilled' ? (revenueTrendResult.value || []) : []);
                setDriverPerformance(driverPerformanceResult.status === 'fulfilled' ? (driverPerformanceResult.value || []) : []);
                setVehicleUtilization(vehicleUtilizationResult.status === 'fulfilled' ? (vehicleUtilizationResult.value || {}) : {});
                setVehicleEfficiency(vehicleEfficiencyResult.status === 'fulfilled' ? (vehicleEfficiencyResult.value || []) : []);
                setExpenseBreakdown(expenseBreakdownResult.status === 'fulfilled' ? (expenseBreakdownResult.value || []) : []);
                setPendingApprovals(pendingApprovalsResult.status === 'fulfilled' ? (pendingApprovalsResult.value || []) : []);
                setAlerts(alertsResult.status === 'fulfilled' ? (alertsResult.value || []) : []);

                // Check if any requests failed
                const failedCount = results.filter(r => r.status === 'rejected').length;
                if (failedCount === 0) {
                    push("Đã tải lại số liệu chi nhánh", "success");
                } else {
                    push(`Đã tải lại dữ liệu (${results.length - failedCount}/${results.length} thành công)`, "warning");
                }
            } catch (err) {
                push("Không thể tải lại dữ liệu: " + (err.message || "Lỗi không xác định"), "error");
            } finally {
                setLoading(false);
            }
        })();
    };

    // Approval handlers
    const handleApproveDayOff = async (dayOffId) => {
        try {
            await approveDayOff(dayOffId, { note: "Đã duyệt" });
            push("Đã duyệt yêu cầu nghỉ phép", "success");
            onRefresh();
        } catch (err) {
            push("Lỗi khi duyệt yêu cầu: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleRejectDayOff = async (dayOffId, reason) => {
        if (!reason || reason.trim() === "") {
            push("Vui lòng nhập lý do từ chối", "error");
            return;
        }
        try {
            await rejectDayOff(dayOffId, { reason });
            push("Đã từ chối yêu cầu nghỉ phép", "success");
            onRefresh();
        } catch (err) {
            push("Lỗi khi từ chối yêu cầu: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleApproveExpense = async (expenseRequestId) => {
        try {
            await approveExpenseRequest(expenseRequestId, { note: "Đã duyệt" });
            push("Đã duyệt yêu cầu chi phí", "success");
            onRefresh();
        } catch (err) {
            push("Lỗi khi duyệt yêu cầu: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const handleRejectExpense = async (expenseRequestId, reason) => {
        if (!reason || reason.trim() === "") {
            push("Vui lòng nhập lý do từ chối", "error");
            return;
        }
        try {
            await rejectExpenseRequest(expenseRequestId, { reason });
            push("Đã từ chối yêu cầu chi phí", "success");
            onRefresh();
        } catch (err) {
            push("Lỗi khi từ chối yêu cầu: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    // Extract data with fallbacks
    const totalRevenue = dashboardData?.totalRevenue || 0;
    const totalExpense = dashboardData?.totalExpense || 0;
    const netProfit = dashboardData?.netProfit || 0;
    const totalTrips = dashboardData?.totalTrips || 0;
    const completedTrips = dashboardData?.completedTrips || 0;
    const ongoingTrips = dashboardData?.ongoingTrips || 0;
    const scheduledTrips = dashboardData?.scheduledTrips || 0;
    const fleetUtilization = dashboardData?.fleetUtilization || 0;
    const totalVehicles = dashboardData?.totalVehicles || 0;
    const vehiclesInUse = dashboardData?.vehiclesInUse || 0;
    const totalDrivers = dashboardData?.totalDrivers || 0;
    const driversOnTrip = dashboardData?.driversOnTrip || 0;
    const driversAvailable = dashboardData?.driversAvailable || 0;

    // Map driver performance data
    const topDrivers = driverPerformance.map((d) => ({
        driverId: d.driverId,
        driverName: d.driverName,
        trips: d.totalTrips || 0,
        km: d.totalKm || 0,
    }));

    // Map vehicle efficiency from API
    const vehicleEfficiencyRows = (vehicleEfficiency || []).map((v) => ({
        licensePlate: v.licensePlate || "N/A",
        costPerKm: Number(v.costPerKm || 0),
        totalKm: Number(v.totalKm || 0),
    }));

    // Tỷ lệ lợi nhuận (profit margin)
    const profitMargin = totalRevenue > 0 ? (Number(netProfit) / Number(totalRevenue)) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5 relative">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-wrap items-start gap-4 mb-6">
                <div className="flex flex-col flex-1 min-w-[220px]">
                    <div className="text-[11px] text-slate-500 leading-none mb-1">
                        Hiệu suất vận hành & tài chính của chi nhánh
                    </div>
                    <div className="text-lg font-semibold text-slate-900 leading-tight flex items-center gap-2 flex-wrap">
                        Dashboard Chi nhánh
                        <span className="text-[10px] font-medium text-slate-600 px-2 py-0.5 border border-slate-300 rounded-md bg-white shadow-sm">
                            {branch}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-2 ml-auto text-sm">
                    {/* Kỳ báo cáo */}
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent outline-none text-sm text-slate-900"
                        >
                            {PERIOD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Branch info - Admin can select, Manager sees their branch only */}
                    {isAdmin ? (
                        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm min-w-[200px]">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <select
                                value={branchInfo?.id || ""}
                                onChange={(e) => {
                                    const selectedId = Number(e.target.value);
                                    const selectedBranch = allBranches.find(b => b.id === selectedId);
                                    if (selectedBranch) {
                                        setBranchInfo(selectedBranch);
                                    }
                                }}
                                className="bg-transparent outline-none text-sm text-slate-900 flex-1"
                            >
                                {allBranches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm min-w-[200px]">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-sm font-medium text-slate-800">
                                    {branchLoading
                                        ? "Đang xác định chi nhánh..."
                                        : branch || "Chưa gán chi nhánh"}
                                </span>
                                {(dashboardData?.branchInfo?.location || branchInfo?.location) && (
                                    <span className="text-[11px] text-slate-500">
                                        {dashboardData?.branchInfo?.location || branchInfo.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-slate-500",
                                loading ? "animate-spin text-sky-600" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* KPI ROW */}
            {dataLoading ? (
                <div className="text-center py-8 text-slate-500">
                    Đang tải dữ liệu...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                    <KpiBlock
                        label="Doanh thu chi nhánh"
                        value={fmtVND(totalRevenue) + " đ"}
                        sub="Tổng doanh thu trong kỳ"
                        deltaPct={null}
                        up={true}
                        icon={
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                        }
                    />

                    <KpiBlock
                        label="Chi phí chi nhánh"
                        value={fmtVND(totalExpense) + " đ"}
                        sub="Bao gồm nhiên liệu, lương, bảo trì"
                        deltaPct={null}
                        up={false}
                        icon={
                            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                        }
                    />

                    <KpiBlock
                        label="Lợi nhuận"
                        value={fmtVND(netProfit) + " đ"}
                        sub="Doanh thu - Chi phí"
                        deltaPct={null}
                        up={netProfit >= 0}
                        icon={
                            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                        }
                    />

                    <KpiBlock
                        label="Biên lợi nhuận"
                        value={profitMargin.toFixed(1) + " %"}
                        sub="(Lợi nhuận / Doanh thu)"
                        deltaPct={null}
                        up={profitMargin >= 0}
                        icon={<Gauge className="h-3.5 w-3.5 text-indigo-600" />}
                    />

                    <KpiBlock
                        label="Tỷ lệ sử dụng xe"
                        value={fleetUtilization.toFixed(1) + " %"}
                        sub={`${vehiclesInUse}/${totalVehicles} xe đang sử dụng`}
                        deltaPct={null}
                        up={true}
                        icon={<Car className="h-3.5 w-3.5 text-amber-500" />}
                    />
                </div>
            )}

            {/* SECOND ROW: Trips summary + 2 tables */}
            {!dataLoading && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* cột trái: hiệu suất chuyến */}
                    <TripsSummaryCard
                        completed={completedTrips}
                        cancelled={totalTrips - completedTrips - ongoingTrips - scheduledTrips}
                        kmTotal={dashboardData?.totalKm ? Number(dashboardData.totalKm) : 0}
                    />

                    {/* cột giữa: tài xế */}
                    <DriverPerfTable rows={topDrivers} />

                    {/* cột phải: xe */}
                    <VehiclePerfTable rows={vehicleEfficiencyRows} />
                </div>
            )}

            {/* REVENUE TREND CHART */}
            {!dataLoading && revenueTrend.length > 0 && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                    <div className="text-sm font-semibold text-slate-900 mb-4">
                        Xu hướng Doanh thu & Chi phí (12 tháng)
                    </div>
                    <TrendChart
                        data={revenueTrend}
                        lines={[
                            { dataKey: "revenue", name: "Doanh thu", color: "#10b981" },
                            { dataKey: "expense", name: "Chi phí", color: "#ef4444" },
                            { dataKey: "netProfit", name: "Lợi nhuận", color: "#3b82f6" },
                        ]}
                        xKey="month"
                        height={300}
                    />
                </div>
            )}

            {/* ALERTS & PENDING APPROVALS */}
            {!dataLoading && (alerts.length > 0 || pendingApprovals.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Alerts Panel */}
                    {alerts.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                <div className="text-sm font-semibold text-slate-900">
                                    Cảnh báo Chi nhánh
                                </div>
                                <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {alerts.length} cảnh báo
                                </span>
                            </div>
                            <AlertsPanel alerts={alerts} maxHeight={300} />
                        </div>
                    )}

                    {/* Pending Approvals */}
                    {pendingApprovals.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <div className="text-sm font-semibold text-slate-900">
                                    Chờ Duyệt
                                </div>
                                <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {pendingApprovals.length} yêu cầu
                                </span>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {pendingApprovals.map((approval) => (
                                    <div
                                        key={approval.approvalId}
                                        className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {approval.approvalType === "DRIVER_DAY_OFF"
                                                        ? "Nghỉ phép"
                                                        : approval.approvalType === "EXPENSE_REQUEST"
                                                            ? "Chi phí"
                                                            : approval.approvalType}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-1">
                                                    {approval.requestReason || "Không có lý do"}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Yêu cầu bởi: {approval.requestedBy}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {approval.approvalType === "DRIVER_DAY_OFF" ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveDayOff(approval.relatedEntityId)}
                                                            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                                        >
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt("Lý do từ chối:");
                                                                if (reason) handleRejectDayOff(approval.relatedEntityId, reason);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                ) : approval.approvalType === "EXPENSE_REQUEST" ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproveExpense(approval.relatedEntityId)}
                                                            className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                                        >
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt("Lý do từ chối:");
                                                                if (reason) handleRejectExpense(approval.relatedEntityId, reason);
                                                            }}
                                                            className="px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FOOTER HINT */}
            {/* <div className="text-[11px] text-slate-500 mt-6 text-center leading-relaxed">
                Dữ liệu từ Module 7 API{" "}
                <code className="text-[11px] text-slate-800 bg-slate-100 border border-slate-300 rounded px-1 py-0.5">
                    /api/v1/manager/dashboard
                </code>{" "}
                được lọc theo chi nhánh của Manager.
            </div> */}
        </div>
    );
}
