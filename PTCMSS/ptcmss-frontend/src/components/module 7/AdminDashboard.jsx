import React from "react";
import {
    LayoutDashboard,
    DollarSign,
    TrendingUp,
    MapPin,
    RefreshCw,
    Upload,
    Calendar,
    Building2,
    BarChart3,
    CarFront,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

import KpiCard from "./shared/KpiCard";
import TrendChart from "./shared/TrendChart";
import {
    getAdminDashboard,
    getRevenueTrend,
    getBranchComparison,
    getTopRoutes,
    getTopVehicleCategories,
    getPendingApprovals,
    exportDashboardReport,
} from "../../api/dashboards";

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

const PERIOD_OPTIONS = [
    { value: "TODAY", label: "Hôm nay" },
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
    { value: "YTD", label: "Năm nay" },
];

const COLORS = ["#0079BC", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// Toast system
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((a) => [...a, { id, msg, kind }]);
        setTimeout(() => setToasts((a) => a.filter((t) => t.id !== id)), ttl);
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
                        t.kind === "success" && "bg-amber-50 border-amber-300 text-amber-700",
                        t.kind === "error" && "bg-rose-50 border-rose-300 text-rose-700",
                        t.kind === "info" && "bg-white border-slate-300 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/**
 * ADMIN DASHBOARD - Module 7
 * Dashboard tổng quan toàn công ty cho Admin
 */
export default function AdminDashboard() {
    const { toasts, push } = useToasts();

    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [period, setPeriod] = React.useState("THIS_MONTH");

    // Dashboard data
    const [kpis, setKpis] = React.useState({
        totalRevenue: 0,
        totalExpense: 0,
        netProfit: 0,
        totalTrips: 0,
    });

    const [revenueTrend, setRevenueTrend] = React.useState([]);
    const [branchComparison, setBranchComparison] = React.useState([]);
    const [topRoutes, setTopRoutes] = React.useState([]);
    const [topVehicleCategories, setTopVehicleCategories] = React.useState([]);
    const [pendingApprovals, setPendingApprovals] = React.useState([]);

    // Load all dashboard data
    const loadDashboard = React.useCallback(async () => {
        setLoading(true);
        try {
            // Use Promise.allSettled to handle individual API failures gracefully
            const results = await Promise.allSettled([
                getAdminDashboard({ period }),
                getRevenueTrend(),
                getBranchComparison({ period }),
                getTopRoutes({ period }).catch(err => {
                    console.warn("Top routes API failed, returning empty array:", err);
                    return [];
                }),
                getTopVehicleCategories({ period }).catch(err => {
                    console.warn("Top vehicle categories API failed, returning empty array:", err);
                    return [];
                }),
                getPendingApprovals().catch(err => {
                    console.warn("Pending approvals API failed, returning empty array:", err);
                    return [];
                }),
            ]);

            const [
                dashboardResult,
                trendResult,
                branchResult,
                routesResult,
                vehicleCategoriesResult,
                approvalsResult,
            ] = results;

            // Extract data with fallbacks
            const dashboardData = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
            const trendData = trendResult.status === 'fulfilled' ? trendResult.value : [];
            const branchData = branchResult.status === 'fulfilled' ? branchResult.value : [];
            const routesData = routesResult.status === 'fulfilled' ? routesResult.value : [];
            const vehicleCategoriesData = vehicleCategoriesResult.status === 'fulfilled' ? vehicleCategoriesResult.value : [];
            const approvalsData = approvalsResult.status === 'fulfilled' ? approvalsResult.value : [];

            // KPIs
            setKpis({
                totalRevenue: dashboardData?.totalRevenue || 0,
                totalExpense: dashboardData?.totalExpense || 0,
                netProfit: dashboardData?.netProfit || 0,
                totalTrips: dashboardData?.totalTrips || 0,
            });

            // Charts
            setRevenueTrend(trendData || []);
            setBranchComparison(branchData || []);
            setTopRoutes(routesData || []);
            setTopVehicleCategories(vehicleCategoriesData || []);

            // Approvals
            setPendingApprovals(approvalsData || []);

            // Show warning if some APIs failed
            const failedCount = results.filter(r => r.status === 'rejected').length;
            if (failedCount > 0) {
                console.log(`${failedCount} API(s) failed. Showing partial data.`);
            }
        } catch (err) {
            console.error("Error loading admin dashboard:", err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [period]);

    React.useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleExport = async () => {
        try {
            await exportDashboardReport("admin", { period });
            push("Đã xuất báo cáo Excel", "success");
        } catch (err) {
            console.error("Export error:", err);
            push("Lỗi khi xuất báo cáo", "error");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-wrap items-start gap-4 mb-5">
                <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                        <div className="text-[11px] text-slate-500 leading-none mb-1">
                            Module 7: Báo cáo & Phân tích
                        </div>
                        <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                            Dashboard Admin
                        </h1>
                        <p className="text-slate-500 text-[13px]">
                            Tổng quan toàn công ty · Hiệu suất chi nhánh · Cảnh báo hệ thống
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent outline-none text-[13px] text-slate-900"
                        >
                            {PERIOD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cls("h-4 w-4", loading ? "animate-spin" : "")} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <Upload className="h-4 w-4" />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {initialLoading ? (
                <div className="text-center py-12 text-slate-500">
                    Đang tải dữ liệu...
                </div>
            ) : (
                <>
                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        <KpiCard
                            title="Tổng Doanh Thu"
                            value={kpis.totalRevenue}
                            format="currency"
                            icon={DollarSign}
                            color="green"
                            loading={loading}
                        />
                        <KpiCard
                            title="Tổng Chi Phí"
                            value={kpis.totalExpense}
                            format="currency"
                            icon={TrendingUp}
                            color="red"
                            loading={loading}
                        />
                        <KpiCard
                            title="Lợi Nhuận Gộp"
                            value={kpis.netProfit}
                            format="currency"
                            icon={BarChart3}
                            color="blue"
                            loading={loading}
                        />
                        <KpiCard
                            title="Tổng Số Chuyến"
                            value={kpis.totalTrips}
                            format="number"
                            icon={MapPin}
                            color="purple"
                            loading={loading}
                        />
                    </div>

                    {/* REVENUE TREND */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-5">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                            <span className="font-medium text-slate-700">
                                Xu hướng Doanh thu & Chi phí (12 tháng)
                            </span>
                        </div>
                        <div className="p-4">
                            <TrendChart
                                data={revenueTrend}
                                lines={[
                                    { dataKey: "revenue", name: "Doanh thu", color: "#10b981" },
                                    { dataKey: "expense", name: "Chi phí", color: "#ef4444" },
                                    { dataKey: "netProfit", name: "Lợi nhuận", color: "#0079BC" },
                                ]}
                                xKey="month"
                                height={300}
                                loading={loading}
                            />
                        </div>
                    </div>

                    {/* BRANCH COMPARISON */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-5">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-sky-600" />
                            <span className="font-medium text-slate-700">
                                So Sánh Hiệu Suất Chi Nhánh
                            </span>
                        </div>
                        <div className="p-4">
                            {branchComparison && branchComparison.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={branchComparison} margin={{ left: 20, right: 10, top: 10, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="branchName"
                                        stroke="#64748b"
                                        style={{ fontSize: "12px" }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                        interval={0}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        style={{ fontSize: "12px" }}
                                        tickFormatter={(v) => fmtVND(v)}
                                        width={80}
                                    />
                                    <Tooltip
                                        formatter={(value) => `${fmtVND(value)} đ`}
                                        contentStyle={{
                                            backgroundColor: "white",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                                    <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" />
                                    <Bar dataKey="expense" name="Chi phí" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Không có dữ liệu chi nhánh
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TOP VEHICLE CATEGORIES & TOP ROUTES */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                        {/* TOP VEHICLE CATEGORIES */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                                <CarFront className="h-4 w-4 text-sky-600" />
                                <span className="font-medium text-slate-700">
                                    Top Loại Xe Được Sử Dụng Nhiều Nhất
                                </span>
                            </div>
                            <div className="p-4">
                                {topVehicleCategories && topVehicleCategories.length > 0 ? (
                                    <div className="space-y-3">
                                        {topVehicleCategories.map((cat, index) => (
                                            <div
                                                key={cat.categoryId || index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 border border-sky-200"
                                            >
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {cat.categoryName}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {cat.seats} chỗ · {cat.bookingCount} đơn · {cat.totalVehiclesBooked} xe đặt
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-sky-700">
                                                        {cat.tripCount} chuyến
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Không có dữ liệu
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TOP ROUTES */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-slate-700">
                                    Top 5 Tuyến Đường Phổ Biến
                                </span>
                            </div>
                            <div className="p-4">
                                {topRoutes && topRoutes.length > 0 ? (
                                    <div className="space-y-3">
                                        {topRoutes.map((route, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                                            >
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-900 truncate">
                                                        {route.startLocation} → {route.endLocation}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {route.tripCount} chuyến · {route.avgDistance?.toFixed(1)} km
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Không có dữ liệu
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PENDING APPROVALS */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-600" />
                                    <span className="font-medium text-slate-700">
                                        Yêu Cầu Chờ Duyệt
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {pendingApprovals.length} mục
                                </span>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                {pendingApprovals && pendingApprovals.length > 0 ? (
                                    <div className="space-y-2">
                                        {pendingApprovals.map((approval, index) => (
                                            <div
                                                key={approval.historyId || index}
                                                className="p-3 rounded-lg bg-amber-50 border border-amber-200"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {approval.approvalType}
                                                        </div>
                                                        <div className="text-xs text-slate-600 mt-1">
                                                            Người yêu cầu: {approval.requesterName}
                                                        </div>
                                                        {approval.branchName && (
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                Chi nhánh: {approval.branchName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 whitespace-nowrap">
                                                        {new Date(approval.requestedAt).toLocaleDateString("vi-VN")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Không có yêu cầu chờ duyệt
                                    </div>
                                )}
                            </div>
                    </div>
                </>
            )}
        </div>
    );
}
