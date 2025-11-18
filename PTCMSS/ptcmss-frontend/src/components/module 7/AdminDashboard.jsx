// src/components/module7/AdminDashboardPro.jsx
import React from "react";
import {
    LayoutDashboard,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Building2,
    CalendarRange,
    BarChart3,
    Truck,
    AlertTriangle,
} from "lucide-react";

/**
 * AdminDashboardPro – LIGHT THEME
 *
 * - Style đồng nhất với AdminBranchListPage:
 *   • Nền bg-slate-50
 *   • Card trắng bg-white viền slate-200 shadow-sm
 *   • Text slate-900/slate-600
 *   • Button sky-600 cho action chính
 *   • Button border-slate-300 bg-white cho action phụ
 *
 * - Logic, mock data, KPI, chart… giữ nguyên.
 * - Vẫn chưa nối API thật.
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

/* -------------------- Fake data (mock API) -------------------- */

// Tổng quan (toàn công ty)
const DEMO_GLOBAL = {
    revenue: 125_000_000_000, // doanh thu
    expense: 87_000_000_000, // chi phí
    trips: 1420, // số chuyến
    utilization: 0.78, // 78%
    changeRevenuePct: 6.2,
    changeExpensePct: -3.1,
    changeTripsPct: 4.4,
};

// Lợi nhuận gộp
const grossProfit = DEMO_GLOBAL.revenue - DEMO_GLOBAL.expense;
const grossProfitPct =
    (grossProfit / Math.max(1, DEMO_GLOBAL.revenue)) * 100;

// Hiệu suất theo chi nhánh
const DEMO_BRANCH_PERF = [
    { branch: "Hà Nội", revenue: 45_000_000_000, profit: 13_000_000_000 },
    { branch: "TP.HCM", revenue: 55_000_000_000, profit: 17_000_000_000 },
    { branch: "Đà Nẵng", revenue: 25_000_000_000, profit: 7_000_000_000 },
    { branch: "Hải Phòng", revenue: 18_000_000_000, profit: 5_000_000_000 },
];

// Sparkline demo series
const SPARK_REVENUE = [90, 95, 100, 110, 118, 125]; // tỉ VNĐ giả lập
const SPARK_EXPENSE = [70, 71, 73, 80, 84, 87];
const SPARK_TRIPS = [1100, 1200, 1300, 1280, 1360, 1420]; // số chuyến

/* -------------------- Tiny sparkline chart (light) -------------------- */
function Sparkline({ series, strokeClass = "stroke-sky-500" }) {
    // series: [number,...]
    const W = 80;
    const H = 32;
    const max = Math.max(...series);
    const min = Math.min(...series);
    const span = max - min || 1;
    const stepX = W / (series.length - 1);

    const points = series
        .map((v, i) => {
            const x = i * stepX;
            const y = H - ((v - min) / span) * H;
            return `${x},${y}`;
        })
        .join(" ");

    return (
        <svg
            className="w-20 h-8 overflow-visible"
            viewBox={`0 0 ${W} ${H}`}
        >
            <polyline
                points={points}
                className={cls(strokeClass, "fill-none")}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* -------------------- KPI Card (light card style) -------------------- */
function KpiCard({
                     title,
                     value,
                     unit,
                     sub,
                     deltaPct,
                     up,
                     sparkSeries,
                     strokeClass,
                 }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col justify-between">
            {/* header row: title + delta chip */}
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{title}</span>
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

            {/* value / spark */}
            <div className="mt-2 flex items-end justify-between flex-wrap gap-2">
                <div>
                    <div className="text-xl font-semibold text-slate-900 tabular-nums leading-none">
                        {value}
                        {unit ? (
                            <span className="text-sm font-normal text-slate-500 ml-1">
                                {unit}
                            </span>
                        ) : null}
                    </div>

                    {sub ? (
                        <div className="text-[11px] text-slate-500 leading-snug mt-1">
                            {sub}
                        </div>
                    ) : null}
                </div>

                {sparkSeries && sparkSeries.length > 1 ? (
                    <Sparkline
                        series={sparkSeries}
                        strokeClass={strokeClass}
                    />
                ) : null}
            </div>
        </div>
    );
}

/* -------------------- Fleet Utilization gauge (light) -------------------- */
function UtilizationGauge({ value }) {
    const pct = Math.round(value * 100);

    const size = 110;
    const r = 40;
    const cx = size / 2;
    const cy = size / 2;
    const strokeW = 10;
    const circumference = 2 * Math.PI * r;
    const dash = circumference * value;
    const gap = circumference - dash;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-slate-600">
                    Tỷ lệ sử dụng xe
                </span>
                <span className="text-[10px] text-slate-400">
                    mục tiêu &gt; 80%
                </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
                <div className="relative">
                    <svg
                        width={size}
                        height={size}
                        viewBox={`0 0 ${size} ${size}`}
                        className="relative"
                    >
                        {/* vòng nền */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            strokeWidth={strokeW}
                            className="stroke-slate-200 fill-none"
                            strokeDasharray={circumference}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                        />
                        {/* vòng tiến độ */}
                        <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            strokeWidth={strokeW}
                            className="fill-none stroke-emerald-500"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={circumference * 0.25}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                        {/* text % giữa vòng */}
                        <text
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-slate-900 text-[15px] font-semibold"
                        >
                            {pct}%
                        </text>
                    </svg>
                </div>

                <div className="text-[11px] leading-relaxed text-slate-600">
                    <div className="text-slate-900 text-lg font-semibold leading-none">
                        {pct}%
                    </div>
                    <div className="text-slate-500 leading-snug mt-1">
                        Tỷ lệ thời gian xe đang chạy /
                        tổng thời gian sẵn sàng.
                    </div>
                </div>
            </div>

            <div className="text-[10px] text-slate-500 flex items-start gap-1 mt-3 leading-relaxed">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <div>
                    Nếu &lt; 60%, cần xem lại phân bổ chuyến / lịch bảo trì.
                </div>
            </div>
        </div>
    );
}

/* -------------------- Biểu đồ hiệu suất theo chi nhánh (light) -------------------- */
function BranchBarChart({ data }) {
    // layout
    const padding = { t: 30, r: 16, b: 44, l: 64 };
    const W = 840;
    const H = 280;
    const innerW = W - padding.l - padding.r;
    const innerH = H - padding.t - padding.b;

    const maxY = Math.max(
        ...data.map((d) => Math.max(d.revenue, d.profit))
    );

    const yTo = (val) =>
        padding.t + innerH - (val / maxY) * innerH;

    const groupW = innerW / data.length;
    const barW = Math.min(28, groupW * 0.32);
    const gap = 10;
    const radius = 5;

    function LegendItem({ x, colorClass, label }) {
        return (
            <g transform={`translate(${x},0)`}>
                <rect
                    x={0}
                    y={-8}
                    width={12}
                    height={12}
                    rx={2}
                    className={colorClass}
                />
                <text
                    x={16}
                    y={-2}
                    className="fill-slate-600 text-[11px]"
                >
                    {label}
                </text>
            </g>
        );
    }

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[280px]"
        >
            {/* grid ngang */}
            {[0.25, 0.5, 0.75, 1].map((t, i) => {
                const y =
                    padding.t + innerH * (1 - t);
                return (
                    <line
                        key={i}
                        x1={padding.l}
                        x2={W - padding.r}
                        y1={y}
                        y2={y}
                        className="stroke-slate-200"
                        strokeWidth="1"
                    />
                );
            })}

            {/* bars */}
            {data.map((row, i) => {
                const gx = padding.l + i * groupW;
                const revY = yTo(row.revenue);
                const revH =
                    innerH - (revY - padding.t);

                const profY = yTo(row.profit);
                const profH =
                    innerH - (profY - padding.t);

                return (
                    <g key={row.branch}>
                        {/* Revenue */}
                        <rect
                            x={
                                gx +
                                (groupW / 2 -
                                    gap / 2 -
                                    barW)
                            }
                            y={revY}
                            width={barW}
                            height={revH}
                            rx={radius}
                            className="fill-emerald-500/80"
                        />
                        {/* Profit */}
                        <rect
                            x={
                                gx +
                                (groupW / 2 + gap / 2)
                            }
                            y={profY}
                            width={barW}
                            height={profH}
                            rx={radius}
                            className="fill-sky-500/80"
                        />

                        {/* branch label */}
                        <text
                            x={gx + groupW / 2}
                            y={H - 14}
                            textAnchor="middle"
                            className="fill-slate-700 text-[11px] font-medium"
                        >
                            {row.branch}
                        </text>
                    </g>
                );
            })}

            {/* ticks trục Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const val = maxY * t;
                const y = yTo(val);
                return (
                    <text
                        key={"yt" + i}
                        x={padding.l - 10}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="fill-slate-500 text-[10px] tabular-nums"
                    >
                        {Math.round(val / 1_000_000_000)} tỷ
                    </text>
                );
            })}

            {/* legend góc phải */}
            <g
                transform={`translate(${
                    W - 260
                }, ${padding.t})`}
            >
                <LegendItem
                    x={0}
                    colorClass="fill-emerald-500/80"
                    label="Doanh thu"
                />
                <LegendItem
                    x={120}
                    colorClass="fill-sky-500/80"
                    label="Lợi nhuận gộp"
                />
            </g>
        </svg>
    );
}

/* -------------------- MAIN COMPONENT (light theme) -------------------- */
export default function AdminDashboardPro() {
    const { toasts, push } = useToasts();

    const [period, setPeriod] = React.useState("2025-10");
    const [branchFilter, setBranchFilter] = React.useState("Tất cả");
    const [loading, setLoading] = React.useState(false);

    const onRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            // TODO: gọi /api/v1/admin/dashboard-stats với period & branchFilter
            push("Đã đồng bộ số liệu mới từ server (demo)", "success");
        }, 600);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5 relative">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-wrap items-start gap-4 mb-6">
                <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                        <div className="text-[11px] text-slate-500 leading-none mb-1">
                            Tổng quan hiệu suất toàn công ty
                        </div>
                        <div className="text-lg font-semibold text-slate-900 leading-tight flex items-center gap-2 flex-wrap">
                            Admin Dashboard
                            <span className="text-[10px] font-medium text-slate-600 px-2 py-0.5 border border-slate-300 rounded-md bg-white shadow-sm">
                                Global view
                            </span>
                        </div>
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

                    {/* Chi nhánh */}
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-transparent outline-none text-sm text-slate-700"
                        >
                            <option>Tất cả</option>
                            <option>Hà Nội</option>
                            <option>TP.HCM</option>
                            <option>Đà Nẵng</option>
                            <option>Hải Phòng</option>
                        </select>
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

            {/* KPI ZONE */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-8">
                {/* Doanh thu */}
                <KpiCard
                    title="Tổng Doanh thu"
                    value={fmtVND(DEMO_GLOBAL.revenue) + " đ"}
                    sub="So với kỳ trước"
                    deltaPct={DEMO_GLOBAL.changeRevenuePct}
                    up={DEMO_GLOBAL.changeRevenuePct >= 0}
                    sparkSeries={SPARK_REVENUE}
                    strokeClass="stroke-emerald-500"
                />

                {/* Chi phí */}
                <KpiCard
                    title="Tổng Chi phí"
                    value={fmtVND(DEMO_GLOBAL.expense) + " đ"}
                    sub="So với kỳ trước"
                    deltaPct={DEMO_GLOBAL.changeExpensePct}
                    up={DEMO_GLOBAL.changeExpensePct >= 0}
                    sparkSeries={SPARK_EXPENSE}
                    strokeClass="stroke-rose-500"
                />

                {/* Lợi nhuận gộp */}
                <KpiCard
                    title="Lợi nhuận gộp"
                    value={fmtVND(grossProfit) + " đ"}
                    sub={
                        "Biên LN gộp ~ " +
                        grossProfitPct.toFixed(1) +
                        "%"
                    }
                    deltaPct={DEMO_GLOBAL.changeRevenuePct}
                    up={DEMO_GLOBAL.changeRevenuePct >= 0}
                    sparkSeries={[30, 32, 33, 34, 35, 38]} // demo %
                    strokeClass="stroke-sky-500"
                />

                {/* Tổng số chuyến */}
                <KpiCard
                    title="Tổng số chuyến"
                    value={fmtInt(DEMO_GLOBAL.trips)}
                    unit="chuyến"
                    sub="So với kỳ trước"
                    deltaPct={DEMO_GLOBAL.changeTripsPct}
                    up={DEMO_GLOBAL.changeTripsPct >= 0}
                    sparkSeries={SPARK_TRIPS}
                    strokeClass="stroke-indigo-500"
                />

                {/* Utilization */}
                <UtilizationGauge value={DEMO_GLOBAL.utilization} />
            </div>

            {/* BRANCH PERFORMANCE CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center shadow-sm">
                            <BarChart3 className="h-4 w-4" />
                        </div>

                        <div className="text-slate-700 font-medium leading-none">
                            Hiệu suất theo chi nhánh
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-none">
                        So sánh Doanh thu &amp; Lợi nhuận gộp
                    </div>

                    <div className="ml-auto text-[11px] text-slate-400 leading-none">
                        Mock data – sẽ gọi /api/v1/admin/dashboard-stats
                    </div>
                </div>

                <div className="p-4">
                    <BranchBarChart data={DEMO_BRANCH_PERF} />
                </div>
            </div>
        </div>
    );
}
