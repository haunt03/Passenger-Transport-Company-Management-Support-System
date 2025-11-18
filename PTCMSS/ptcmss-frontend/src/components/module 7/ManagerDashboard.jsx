// src/components/module7/ManagerDashboardPro.jsx
import React from "react";
import {
    RefreshCw,
    Building2,
    CalendarRange,
    TrendingUp,
    TrendingDown,
    Car,
    User,
    CheckCircle2,
    XCircle,
    Gauge,
} from "lucide-react";
import { getStoredUserId } from "../../utils/session";
import { getBranchByUserId } from "../../api/branches";

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
                        "bg-emerald-50 border-emerald-300 text-emerald-700",
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

/* -------------------- MOCK DATA -------------------- */

// KPI của chi nhánh (ví dụ: Hà Nội)
const BRANCH_METRICS = {
    branchName: "Hà Nội",
    revenue: 45_000_000_000, // Doanh thu chi nhánh
    expense: 31_000_000_000, // Chi phí chi nhánh
    profit: 14_000_000_000, // Lợi nhuận = revenue - expense
    changeRevenuePct: 4.2,
    changeExpensePct: 1.1,
    changeProfitPct: 6.0,
};

// Tình hình chuyến trong kỳ
const BRANCH_TRIPS = {
    completed: 420,
    cancelled: 18,
    kmTotal: 82_500, // tổng km đã chạy
};

// Top tài xế
const TOP_DRIVERS = [
    { id: 101, name: "Nguyễn Văn A", trips: 62, km: 11_200 },
    { id: 102, name: "Trần Văn B", trips: 58, km: 10_340 },
    { id: 103, name: "Lê Văn C", trips: 55, km: 9_880 },
    { id: 104, name: "Phạm Thị D", trips: 51, km: 9_100 },
];

// Hiệu suất xe (chi phí/km càng thấp càng tốt)
const VEHICLE_EFF = [
    { plate: "29A-123.45", costPerKm: 2800, km: 5200 },
    { plate: "30G-888.66", costPerKm: 3000, km: 4800 },
    { plate: "15B-777.22", costPerKm: 3400, km: 6100 },
    { plate: "43C-456.99", costPerKm: 3900, km: 3700 },
];

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
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
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
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
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
                <div className="h-8 w-8 rounded-md bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm">
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
                    {rows.map((d) => (
                        <tr
                            key={d.id}
                            className="border-b border-slate-200 hover:bg-slate-50/70"
                        >
                            <td className="px-3 py-2 text-slate-900 text-sm font-medium">
                                {d.name}
                            </td>
                            <td className="px-3 py-2 text-slate-700 text-sm font-medium tabular-nums">
                                {fmtInt(d.trips)}
                            </td>
                            <td className="px-3 py-2 text-slate-700 text-sm tabular-nums">
                                {fmtInt(d.km)} km
                            </td>
                        </tr>
                    ))}
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
                    {rows.map((v) => (
                        <tr
                            key={v.plate}
                            className="border-b border-slate-200 hover:bg-slate-50/70"
                        >
                            <td className="px-3 py-2 text-slate-900 text-sm font-medium">
                                {v.plate}
                            </td>
                            <td className="px-3 py-2 text-slate-700 text-sm font-medium tabular-nums">
                                {fmtVND(v.costPerKm)} đ/km
                            </td>
                            <td className="px-3 py-2 text-slate-700 text-sm tabular-nums">
                                {fmtInt(v.km)} km
                            </td>
                        </tr>
                    ))}
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

    // Bộ lọc cho Manager
    const [period, setPeriod] = React.useState("2025-10");
    const [branch, setBranch] = React.useState(BRANCH_METRICS.branchName);
    const [branchInfo, setBranchInfo] = React.useState(null);
    const [branchLoading, setBranchLoading] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
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
    }, []);

    // Refresh mock
    const onRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            // TODO: gọi /api/v1/manager/dashboard-stats?period=...&branch=...
            push("Đã tải lại số liệu chi nhánh (demo)", "success");
        }, 600);
    };

    // Tỷ lệ lợi nhuận (profit margin) nội bộ chi nhánh
    const profitMargin =
        (BRANCH_METRICS.profit /
            Math.max(1, BRANCH_METRICS.revenue)) *
        100;

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
                        <CalendarRange className="h-4 w-4 text-slate-500" />
                        <input
                            type="month"
                            className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        />
                    </div>

                    {/* Branch info */}
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm min-w-[200px]">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium text-slate-800">
                                {branchLoading
                                    ? "Đang xác định chi nhánh..."
                                    : branch || "Chưa gán chi nhánh"}
                            </span>
                            {branchInfo?.location && (
                                <span className="text-[11px] text-slate-500">
                                    {branchInfo.location}
                                </span>
                            )}
                        </div>
                    </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                <KpiBlock
                    label="Doanh thu chi nhánh"
                    value={fmtVND(BRANCH_METRICS.revenue) + " đ"}
                    sub="So với kỳ trước"
                    deltaPct={BRANCH_METRICS.changeRevenuePct}
                    up={BRANCH_METRICS.changeRevenuePct >= 0}
                    icon={
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    }
                />

                <KpiBlock
                    label="Chi phí chi nhánh"
                    value={fmtVND(BRANCH_METRICS.expense) + " đ"}
                    sub="Bao gồm nhiên liệu, lương, bảo trì"
                    deltaPct={BRANCH_METRICS.changeExpensePct}
                    up={BRANCH_METRICS.changeExpensePct >= 0}
                    icon={
                        <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                    }
                />

                <KpiBlock
                    label="Lợi nhuận"
                    value={fmtVND(BRANCH_METRICS.profit) + " đ"}
                    sub="Doanh thu - Chi phí"
                    deltaPct={BRANCH_METRICS.changeProfitPct}
                    up={BRANCH_METRICS.changeProfitPct >= 0}
                    icon={
                        <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                    }
                />

                <KpiBlock
                    label="Biên lợi nhuận"
                    value={profitMargin.toFixed(1) + " %"}
                    sub="(Lợi nhuận / Doanh thu)"
                    deltaPct={BRANCH_METRICS.changeProfitPct}
                    up={BRANCH_METRICS.changeProfitPct >= 0}
                    icon={<Gauge className="h-3.5 w-3.5 text-indigo-600" />}
                />

                <KpiBlock
                    label="Tổng km đã chạy"
                    value={fmtInt(BRANCH_TRIPS.kmTotal) + " km"}
                    sub="Trong kỳ đã lọc"
                    deltaPct={4.4}
                    up={true}
                    icon={<Car className="h-3.5 w-3.5 text-amber-500" />}
                />
            </div>

            {/* SECOND ROW: Trips summary + 2 tables */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* cột trái: hiệu suất chuyến */}
                <TripsSummaryCard
                    completed={BRANCH_TRIPS.completed}
                    cancelled={BRANCH_TRIPS.cancelled}
                    kmTotal={BRANCH_TRIPS.kmTotal}
                />

                {/* cột giữa: tài xế */}
                <DriverPerfTable rows={TOP_DRIVERS} />

                {/* cột phải: xe */}
                <VehiclePerfTable rows={VEHICLE_EFF} />
            </div>

            {/* FOOTER HINT */}
            <div className="text-[11px] text-slate-500 mt-6 text-center leading-relaxed">
                Dữ liệu giả lập. Khi nối thật sẽ gọi{" "}
                <code className="text-[11px] text-slate-800 bg-slate-100 border border-slate-300 rounded px-1 py-0.5">
                    /api/v1/manager/dashboard-stats
                </code>{" "}
                và tự động lọc theo chi nhánh (branch_id) của Manager.
            </div>
        </div>
    );
}
