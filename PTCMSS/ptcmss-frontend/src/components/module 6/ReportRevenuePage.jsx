import React from "react";
import {
    Calendar,
    Building2,
    User,
    RefreshCw,
    Download,
    Info,
} from "lucide-react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

/**
 * ReportRevenuePage (phiên bản light theme đồng nhất)
 *
 * - Bộ lọc theo ngày / chi nhánh / khách hàng
 * - KPI tổng doanh thu
 * - Biểu đồ đường doanh thu theo ngày
 * - Bảng chi tiết các khoản thu
 * - Nút xuất Excel
 *
 * Sau này nối API:
 *   GET /api/reports/revenue?from_date=...&to_date=...&branch_id=...&customer=...
 */

// --- hằng số màu "thương hiệu" giống InvoiceManagement ---
const BRAND_COLOR = "#0079BC";

// helper join class
const cls = (...a) => a.filter(Boolean).join(" ");

// mock chi nhánh
const BRANCHES = [
    { id: "", name: "Tất cả chi nhánh" },
    { id: "1", name: "Chi nhánh Hà Nội" },
    { id: "2", name: "Chi nhánh TP.HCM" },
];

// mock data doanh thu (theo ngày)
const MOCK_CHART = [
    { date: "2025-10-20", revenue: 12_000_000 },
    { date: "2025-10-21", revenue: 18_000_000 },
    { date: "2025-10-22", revenue: 9_000_000 },
    { date: "2025-10-23", revenue: 15_000_000 },
    { date: "2025-10-24", revenue: 21_000_000 },
    { date: "2025-10-25", revenue: 17_000_000 },
    { date: "2025-10-26", revenue: 25_000_000 },
];

// mock bảng chi tiết khoản thu
const MOCK_ROWS = [
    {
        id: "INV-00123",
        date: "2025-10-24",
        branch: "Chi nhánh Hà Nội",
        customer: "Công ty A",
        amount: 12_000_000,
        note: "Thanh toán hợp đồng vận tải tháng 10",
    },
    {
        id: "INV-00124",
        date: "2025-10-24",
        branch: "Chi nhánh Hà Nội",
        customer: "Công ty B",
        amount: 9_000_000,
        note: "Cước vận chuyển cao tốc",
    },
    {
        id: "INV-00130",
        date: "2025-10-25",
        branch: "Chi nhánh TP.HCM",
        customer: "Logistics C",
        amount: 17_000_000,
        note: "Thanh toán chuyến hàng SG → DN",
    },
    {
        id: "INV-00132",
        date: "2025-10-26",
        branch: "Chi nhánh TP.HCM",
        customer: "Công ty A",
        amount: 25_000_000,
        note: "Tạm ứng dịch vụ tháng sau",
    },
];

// format VND gọn
function fmtVND(n) {
    return new Intl.NumberFormat("vi-VN").format(Number(n || 0));
}

export default function ReportRevenuePage() {
    // ====== STATE FILTERS ======
    const [fromDate, setFromDate] = React.useState("2025-10-20");
    const [toDate, setToDate] = React.useState("2025-10-26");
    const [branchId, setBranchId] = React.useState("");
    const [customerQuery, setCustomerQuery] = React.useState("");

    const [loading, setLoading] = React.useState(false);

    // ====== FILTERING MOCK DATA LOCALLY ======
    const filteredRows = React.useMemo(() => {
        return MOCK_ROWS.filter((row) => {
            // theo khoảng ngày
            if (fromDate && row.date < fromDate) return false;
            if (toDate && row.date > toDate) return false;

            // theo chi nhánh
            if (
                branchId &&
                row.branch !==
                BRANCHES.find((b) => b.id === branchId)?.name
            ) {
                return false;
            }

            // theo khách hàng
            if (
                customerQuery.trim() &&
                !row.customer
                    .toLowerCase()
                    .includes(customerQuery.trim().toLowerCase())
            ) {
                return false;
            }

            return true;
        });
    }, [fromDate, toDate, branchId, customerQuery]);

    // tổng doanh thu sau filter
    const totalRevenue = React.useMemo(() => {
        return filteredRows.reduce((sum, r) => sum + r.amount, 0);
    }, [filteredRows]);

    // data biểu đồ sau filter
    // gom tiền theo ngày và sort theo ngày tăng dần
    const chartData = React.useMemo(() => {
        const map = {};
        filteredRows.forEach((r) => {
            if (!map[r.date]) map[r.date] = 0;
            map[r.date] += r.amount;
        });

        // fallback: nếu filter không ra data, dùng MOCK_CHART
        const base =
            Object.keys(map).length > 0
                ? map
                : MOCK_CHART.reduce((acc, d) => {
                    acc[d.date] = d.revenue;
                    return acc;
                }, {});

        return Object.entries(base)
            .sort(([d1], [d2]) => (d1 < d2 ? -1 : 1))
            .map(([date, revenue]) => ({ date, revenue }));
    }, [filteredRows]);

    // ====== ACTIONS ======
    const handleFetch = () => {
        // sau này sẽ gọi API thật:
        // GET /api/reports/revenue?from_date=...&to_date=...&branch_id=...&customer=...
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 500);
    };

    const handleExportExcel = () => {
        // TODO: gọi endpoint export, hoặc build file XLSX client-side
        console.log("Xuất Excel với filter:", {
            fromDate,
            toDate,
            branchId,
            customerQuery,
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-5 space-y-5">
            {/* ===== HEADER ===== */}
            <div className="flex flex-wrap items-start gap-3">
                {/* Left side: title + tổng tiền */}
                <div className="flex items-start gap-2 flex-1 min-w-[220px]">
                    {/* icon box */}
                    <div
                        className="h-9 w-9 flex-none rounded-md flex items-center justify-center text-white text-[13px] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
                        style={{ backgroundColor: BRAND_COLOR }}
                    >
                        ₫
                    </div>

                    <div className="flex flex-col">
                        <div className="text-[11px] text-gray-500 leading-none mb-1">
                            Báo cáo / Doanh thu
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
                                Báo cáo Doanh thu
                            </h1>

                            {/* chip tổng doanh thu */}
                            <span
                                className="inline-flex items-center rounded px-2 py-[2px] text-[11px] font-medium leading-none border shadow-sm"
                                style={{
                                    backgroundColor: "#E6F4FF",
                                    color: BRAND_COLOR,
                                    borderColor: BRAND_COLOR,
                                }}
                            >
                                Tổng: {fmtVND(totalRevenue)} đ
                            </span>
                        </div>

                        <div className="text-[12px] text-gray-500 leading-tight mt-1">
                            Xem doanh thu theo thời gian, lọc theo chi nhánh /
                            khách hàng, và xuất báo cáo.
                        </div>
                    </div>
                </div>

                {/* Right side: nút hành động */}
                <div className="flex flex-row flex-wrap items-center gap-2 ml-auto">
                    <button
                        onClick={handleFetch}
                        className={cls(
                            "rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700",
                            "shadow-sm hover:bg-gray-50 flex items-center gap-1",
                            loading ? "opacity-60 cursor-wait" : ""
                        )}
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-gray-500",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-1"
                    >
                        <Download className="h-4 w-4 text-gray-500" />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* ===== BỘ LỌC ===== */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-[13px] font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Info
                        className="h-4 w-4"
                        style={{ color: BRAND_COLOR }}
                    />
                    <span>Bộ lọc báo cáo</span>
                </div>

                {/* grid bộ lọc */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-[13px]">
                    {/* Từ ngày */}
                    <div className="flex flex-col">
                        <label className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>Từ ngày</span>
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                            <input
                                type="date"
                                className="bg-transparent outline-none text-[13px] text-gray-800 w-full"
                                value={fromDate}
                                onChange={(e) =>
                                    setFromDate(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {/* Đến ngày */}
                    <div className="flex flex-col">
                        <label className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>Đến ngày</span>
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                            <input
                                type="date"
                                className="bg-transparent outline-none text-[13px] text-gray-800 w-full"
                                value={toDate}
                                onChange={(e) =>
                                    setToDate(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {/* Chi nhánh */}
                    <div className="flex flex-col">
                        <label className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            <span>Chi nhánh</span>
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                            <select
                                className="bg-transparent outline-none text-[13px] text-gray-800 w-full"
                                value={branchId}
                                onChange={(e) =>
                                    setBranchId(e.target.value)
                                }
                            >
                                {BRANCHES.map((b) => (
                                    <option
                                        key={b.id}
                                        value={b.id}
                                    >
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Khách hàng */}
                    <div className="flex flex-col">
                        <label className="text-[12px] text-gray-600 mb-1 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span>Khách hàng</span>
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                            <input
                                className="bg-transparent outline-none text-[13px] text-gray-800 placeholder:text-gray-400 w-full"
                                placeholder="Nhập tên KH..."
                                value={customerQuery}
                                onChange={(e) =>
                                    setCustomerQuery(
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* nút chạy lọc */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={handleFetch}
                        className={cls(
                            "rounded-lg px-3 py-2 text-[13px] font-medium text-white shadow-sm flex items-center gap-2 hover:brightness-110",
                            loading
                                ? "opacity-60 cursor-wait"
                                : ""
                        )}
                        style={{
                            backgroundColor: BRAND_COLOR,
                            borderColor: BRAND_COLOR,
                        }}
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-white",
                                loading
                                    ? "animate-spin"
                                    : ""
                            )}
                        />
                        <span>Lọc báo cáo</span>
                    </button>

                    <div className="text-[11px] text-gray-500 leading-relaxed flex items-center">
                        Dữ liệu hiển thị dựa trên bộ lọc hiện tại.
                    </div>
                </div>
            </div>

            {/* ===== KPI + CHART ===== */}
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
                {/* CARD KPI */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between">
                    <div className="text-[13px] font-medium text-gray-900 mb-2">
                        Tổng doanh thu (đ)
                    </div>
                    <div className="text-[24px] font-semibold text-gray-900 tabular-nums leading-none">
                        {fmtVND(totalRevenue)}
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                        Tổng cộng các khoản thu trong khoảng thời gian đã
                        chọn.
                    </div>
                </div>

                {/* CARD CHART */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-[13px] font-medium text-gray-900">
                            Doanh thu theo ngày
                        </div>
                        <div className="text-[11px] text-gray-500">
                            (đơn vị: VND)
                        </div>
                    </div>

                    <div className="w-full h-[220px]">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart data={chartData}>
                                <CartesianGrid
                                    stroke="#E5E7EB"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6B7280"
                                    fontSize={11}
                                    tickMargin={8}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    fontSize={11}
                                    tickFormatter={(v) =>
                                        v / 1_000_000 +
                                        "M"
                                    }
                                />
                                <Tooltip
                                    formatter={(val) =>
                                        fmtVND(val) + " đ"
                                    }
                                    labelStyle={{
                                        fontSize:
                                            "12px",
                                        color: "#374151",
                                    }}
                                    itemStyle={{
                                        fontSize:
                                            "12px",
                                        color: "#111827",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke={BRAND_COLOR}
                                    strokeWidth={2}
                                    dot={{
                                        r: 3,
                                        strokeWidth: 1,
                                        stroke: BRAND_COLOR,
                                        fill: "#fff",
                                    }}
                                    activeDot={{
                                        r: 4,
                                        strokeWidth: 1,
                                        stroke: BRAND_COLOR,
                                        fill: "#fff",
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ===== BẢNG CHI TIẾT ===== */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {/* header bảng */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
                    <div className="text-[13px] font-medium text-gray-900">
                        Chi tiết các khoản thu (
                        {filteredRows.length})
                    </div>
                    <div className="text-[11px] text-gray-500 leading-none">
                        Hiển thị theo bộ lọc hiện tại
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-white text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px] whitespace-nowrap">
                                Mã chứng từ
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px] whitespace-nowrap">
                                Ngày
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px] whitespace-nowrap">
                                Chi nhánh
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px] whitespace-nowrap">
                                Khách hàng
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px] whitespace-nowrap text-right">
                                Số tiền (đ)
                            </th>
                            <th className="px-4 py-2 font-medium text-gray-700 text-[11px]">
                                Ghi chú
                            </th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-4 py-8 text-center text-[13px] text-gray-500"
                                >
                                    Không có dữ liệu
                                    trong khoảng lọc.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map(
                                (row) => (
                                    <tr
                                        key={
                                            row.id
                                        }
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-2 text-[13px] text-gray-900 font-medium whitespace-nowrap">
                                            {
                                                row.id
                                            }
                                        </td>
                                        <td className="px-4 py-2 text-[13px] text-gray-900 whitespace-nowrap">
                                            {
                                                row.date
                                            }
                                        </td>
                                        <td className="px-4 py-2 text-[13px] text-gray-900 whitespace-nowrap">
                                            {
                                                row.branch
                                            }
                                        </td>
                                        <td className="px-4 py-2 text-[13px] text-gray-900 whitespace-nowrap">
                                            {
                                                row.customer
                                            }
                                        </td>
                                        <td className="px-4 py-2 text-[13px] text-gray-900 text-right tabular-nums whitespace-nowrap">
                                            {fmtVND(
                                                row.amount
                                            )}{" "}
                                            đ
                                        </td>
                                        <td className="px-4 py-2 text-[13px] text-gray-500 leading-relaxed">
                                            {row.note ||
                                                "—"}
                                        </td>
                                    </tr>
                                )
                            )
                        )}
                        </tbody>
                    </table>
                </div>

                {/* footer hint */}
                <div className="border-t border-gray-200 bg-white px-4 py-2 text-[11px] leading-relaxed text-gray-500">
                    API dự kiến:
                    {" "}
                    GET
                    /api/reports/revenue?from_date={"{fromDate}"}&to_date={"{toDate}"}&branch_id={"{branchId}"}&customer={"{customerQuery}"}
                </div>
            </div>
        </div>
    );
}
