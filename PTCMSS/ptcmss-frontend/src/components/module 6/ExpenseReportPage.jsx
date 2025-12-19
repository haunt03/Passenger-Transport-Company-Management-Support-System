import React from "react";
import {
    PieChart as PieChartIcon,
    CalendarRange,
    Building2,
    Car,
    Filter as FilterIcon,
    Download,
    RefreshCw,
    Info,
} from "lucide-react";
import { getExpenseReport } from "../../api/accounting";
import { listBranches } from "../../api/branches";
import { listVehicles } from "../../api/vehicles";
import { exportExpenseReportToExcel } from "../../api/exports";
import { getEmployeeByUserId } from "../../api/employees";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

/**
 * ExpenseReportPage (LIGHT THEME giống vibe AdminBranchListPage)
 * Module 6.S6 – Báo cáo Chi phí
 *
 * Business:
 *  - Bộ lọc: từ ngày / đến ngày / chi nhánh / loại chi phí / xe
 *  - Tổng chi phí (theo bộ lọc)
 *  - Biểu đồ cơ cấu chi phí dạng donut
 *  - Bảng chi tiết (có sort/paging client-side)
 *  - Export Excel (tạm CSV .xlsx)
 *
 * API dự kiến (sau này nối):
 *   GET /api/v1/reports/expense?from_date=...&to_date=...&branch_id=...&type=...&vehicle_id=...
 *
 * Trạng thái: DESIGN / PROTOTYPE LIGHT MODE
 *  - Dữ liệu mock DEMO_EXPENSES
 *  - Toast light
 *  - FiltersBar light
 *  - Biểu đồ light
 *  - Bảng light
 */

/* ================= Helpers / constants ================= */
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    );
const cls = (...a) => a.filter(Boolean).join(" ");
const todayISO = () =>
    new Date().toISOString().slice(0, 10);

const CATEGORY_LABELS = {
    FUEL: "Xăng dầu",
    MAINTENANCE: "Bảo dưỡng & sửa chữa",
    SALARY: "Lương tài xế",
    PARKING: "Bến bãi & đỗ xe",
    INSURANCE: "Bảo hiểm",
    TOLL: "Cầu đường & phí đường bộ",
    REPAIR: "Sửa chữa khẩn cấp",
    OTHER: "Khác",
};

/* ================= Toast system (light) ================= */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback((
        msg,
        kind = "info",
        ttl = 2600
    ) => {
        const id = Math.random()
            .toString(36)
            .slice(2);
        setToasts((a) => [
            ...a,
            { id, msg, kind },
        ]);
        setTimeout(
            () =>
                setToasts((a) =>
                    a.filter(
                        (t) =>
                            t.id !==
                            id
                    )
                ),
            ttl
        );
    }, []);
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
                        t.kind ===
                        "success" &&
                        "bg-info-50 border-info-300 text-info-700",
                        t.kind ===
                        "error" &&
                        "bg-rose-50 border-rose-300 text-rose-700",
                        t.kind ===
                        "info" &&
                        "bg-white border-slate-300 text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* ================= Pie chart helpers ================= */
function arcPath(cx, cy, r, a0, a1) {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const largeArc =
        a1 - a0 > Math.PI ? 1 : 0;
    return (
        "M " +
        cx +
        " " +
        cy +
        " L " +
        x0 +
        " " +
        y0 +
        " A " +
        r +
        " " +
        r +
        " 0 " +
        largeArc +
        " 1 " +
        x1 +
        " " +
        y1 +
        " Z"
    );
}

// Màu lát cắt (slice) & legend swatch
const PALETTE = [
    {
        slice: "fill-emerald-500/80",
        legend:
            "bg-info-500/80 border-primary-400/30",
    },
    {
        slice: "fill-sky-400/80",
        legend:
            "bg-sky-400/80 border-sky-300/30",
    },
    {
        slice: "fill-rose-500/80",
        legend:
            "bg-rose-500/80 border-rose-400/30",
    },
    {
        slice: "fill-amber-400/80",
        legend:
            "bg-primary-400/80 border-info-300/30",
    },
    {
        slice: "fill-purple-400/80",
        legend:
            "bg-purple-400/80 border-purple-300/30",
    },
    {
        slice: "fill-slate-400/80",
        legend:
            "bg-slate-400/80 border-slate-300/30",
    },
];

function unwrapListPayload(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    return [];
}

function normalizeBranchOptions(payload) {
    return unwrapListPayload(payload)
        .map((raw) => {
            const rawId = raw?.id ?? raw?.branchId ?? raw?.branchID ?? raw?.branch_id;
            if (rawId == null) return null;
            const id = Number(rawId);
            if (Number.isNaN(id)) return null;
            const branchName = raw?.branchName || raw?.name || raw?.branch_code || `Chi nhánh #${id}`;
            return { id, branchName };
        })
        .filter(Boolean);
}

function normalizeVehicleOptions(payload) {
    return unwrapListPayload(payload)
        .map((raw) => {
            const rawId = raw?.id ?? raw?.vehicleId ?? raw?.vehicleID ?? raw?.vehicle_id;
            if (rawId == null) return null;
            const id = Number(rawId);
            if (Number.isNaN(id)) return null;
            const licensePlate = raw?.licensePlate || raw?.vehicleCode || raw?.code || `Xe #${id}`;
            return { id, licensePlate };
        })
        .filter(Boolean);
}

/* ================= Component: ExpensePieChart (light) ================= */
function ExpensePieChart({
                             slices,
                         }) {
    // slices = [{ key, label, amount, pct, color }]
    const total = slices.reduce(
        (s, x) =>
            s + x.amount,
        0
    );

    const cx = 100;
    const cy = 100;
    const r = 80;

    let acc = -Math.PI / 2; // bắt đầu từ 12h
    const arcs = slices.map((s) => {
        const ang =
            total > 0
                ? (s.amount /
                    total) *
                Math.PI *
                2
                : 0;
        const pathD = arcPath(
            cx,
            cy,
            r,
            acc,
            acc + ang
        );
        const start = acc;
        acc += ang;
        return {
            ...s,
            pathD,
            startAngle:
            start,
            endAngle:
                start +
                ang,
        };
    });

    return (
        <div className="flex flex-col md:flex-row md:items-start gap-4">
            <svg
                viewBox="0 0 200 200"
                className="w-[200px] h-[200px] mx-auto md:mx-0"
            >
                {/* nền donut */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    className="fill-slate-100"
                />
                {/* từng lát */}
                {arcs.map((a) => (
                    <path
                        key={a.key}
                        d={a.pathD}
                        className={
                            a.color
                                .slice
                        }
                        stroke="none"
                    />
                ))}
                {/* lỗ trong để tạo donut */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={40}
                    className="fill-white stroke-slate-200"
                    strokeWidth={
                        2
                    }
                />
                {/* total text */}
                <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    className="fill-slate-600 text-[12px] font-semibold"
                >
                    Tổng
                </text>
                <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    className="fill-slate-700 text-[11px] font-medium"
                >
                    {fmtVND(
                        total
                    )}{" "}
                    đ
                </text>
            </svg>

            <div className="flex-1 min-w-[180px] space-y-2">
                {slices.map((s) => (
                    <div
                        key={
                            s.key
                        }
                        className="flex items-start gap-3 text-xs text-slate-600"
                    >
                        <div
                            className={cls(
                                "mt-1 h-3 w-3 rounded-sm border",
                                s.color
                                    .legend
                            )}
                        />
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div className="text-slate-700 font-medium text-[12px]">
                                    {
                                        s.label
                                    }
                                </div>
                                <div className="tabular-nums text-slate-900 font-medium text-[12px]">
                                    {fmtVND(
                                        s.amount
                                    )}{" "}
                                    đ
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                <span>
                                    Tỷ
                                    trọng
                                </span>
                                <span className="tabular-nums">
                                    {s.pct.toFixed(
                                        1
                                    )}
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ================= Component: BreakdownCard (light) ================= */
function BreakdownCard({
                           totalExpense,
                           slices,
                       }) {
    const top3 = slices.slice(
        0,
        3
    );
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-4">
            <div>
                <div className="text-sm text-slate-500">
                    Tổng chi phí
                </div>
                <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                    {fmtVND(
                        totalExpense
                    )}{" "}
                    đ
                </div>
            </div>

            <div className="text-xs text-slate-500">
                Top khoản mục
            </div>
            <div className="space-y-2 text-sm">
                {top3.map((s) => (
                    <div
                        key={
                            s.key
                        }
                        className="flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2 text-slate-700">
                            <span
                                className={cls(
                                    "h-2.5 w-2.5 rounded-sm border",
                                    s.color
                                        .legend
                                )}
                            />
                            <span className="text-slate-700">
                                {
                                    s.label
                                }
                            </span>
                        </div>
                        <div className="tabular-nums text-slate-900 font-medium">
                            {fmtVND(
                                s.amount
                            )}{" "}
                            đ
                        </div>
                    </div>
                ))}
                {top3.length ===
                0 ? (
                    <div className="text-slate-400 text-xs">
                        Không
                        có dữ
                        liệu.
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/* ================= Component: FiltersBar (light) ================= */
function FiltersBar({
                        fromDate,
                        setFromDate,
                        toDate,
                        setToDate,
                        branchId,
                        setBranchId,
                        vehicleId,
                        setVehicleId,
                        period,
                        setPeriod,
                        catFilter,
                        setCatFilter,
                        branchOptions,
                        vehicleOptions,
                        categoryOptions,
                        onRefresh,
                        loading,
                        onExportExcel,
                        branchDisabled = false,
                        branchHelperText = "",
                        branchLoading = false,
                        branchError = "",
                    }) {
    return (
        <div className="flex flex-col xl:flex-row xl:items-start gap-4 w-full">
            {/* left section */}
            <div className="flex flex-wrap items-start gap-3 flex-1">
                {/* Branch */}
                <div className="flex flex-col gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <select
                            value={branchId ?? ""}
                            onChange={(e) => {
                                if (branchDisabled) return;
                                const val = e.target.value;
                                if (!val) {
                                    setBranchId(null);
                                    return;
                                }
                                const parsed = Number(val);
                                setBranchId(Number.isNaN(parsed) ? null : parsed);
                            }}
                            disabled={branchDisabled || branchLoading}
                            className="bg-transparent outline-none text-[13px] text-slate-900 disabled:text-slate-500"
                        >
                            {branchDisabled ? (
                                <option value={branchId ?? ""}>
                                    {branchLoading
                                        ? "Đang xác định chi nhánh..."
                                        : branchHelperText || "Chi nhánh của bạn"}
                                </option>
                            ) : (
                                <>
                                    <option value="">Tất cả chi nhánh</option>
                                    {branchOptions.map((br) => (
                                        <option key={br.id} value={br.id}>
                                            {br.branchName}
                                        </option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>
                    {branchDisabled && (
                        <div className={`text-[11px] ${branchError ? "text-rose-600" : "text-primary-600"}`}>
                            {branchLoading
                                ? "Đang xác định chi nhánh bạn phụ trách..."
                                : branchError || branchHelperText || "Chỉ xem dữ liệu chi nhánh bạn phụ trách."}
                        </div>
                    )}
                </div>

                {/* Vehicle */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                    <Car className="h-4 w-4 text-slate-500" />
                    <select
                        value={vehicleId || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                                setVehicleId(null);
                                return;
                            }
                            const parsed = Number(val);
                            setVehicleId(Number.isNaN(parsed) ? null : parsed);
                        }}
                        className="bg-transparent outline-none text-[13px] text-slate-900"
                    >
                        <option value="">Tất cả xe</option>
                        {vehicleOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.licensePlate}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                    <FilterIcon className="h-4 w-4 text-slate-500" />
                    <select
                        value={
                            catFilter
                        }
                        onChange={(e) =>
                            setCatFilter(
                                e
                                    .target
                                    .value
                            )
                        }
                        className="bg-transparent outline-none text-[13px] text-slate-900"
                    >
                        <option value="">
                            Tất cả
                            loại
                            chi
                            phí
                        </option>
                        {categoryOptions.map(
                            (
                                c
                            ) => (
                                <option
                                    key={
                                        c.value
                                    }
                                    value={
                                        c.value
                                    }
                                >
                                    {
                                        c.label
                                    }
                                </option>
                            )
                        )}
                    </select>
                </div>
            </div>

            {/* right section actions */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={
                        onExportExcel
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                >
                    <Download className="h-4 w-4 text-slate-600" />
                    Xuất
                    Excel
                </button>

                <button
                    onClick={
                        onRefresh
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                >
                    <RefreshCw
                        className={cls(
                            "h-4 w-4 text-slate-600",
                            loading
                                ? "animate-spin"
                                : ""
                        )}
                    />
                    Làm mới
                </button>
            </div>
        </div>
    );
}

/* ================= Component: ExpenseTable (light) ================= */
function ExpenseTable({
                          expenses,
                      }) {
    // local sort + paging
    const [page, setPage] =
        React.useState(1);
    const [pageSize, setPageSize] =
        React.useState(10);
    const [sortKey, setSortKey] =
        React.useState("date");
    const [sortDir, setSortDir] =
        React.useState("desc"); // asc|desc

    const sorted = React.useMemo(() => {
        const arr = [...expenses];
        arr.sort((a, b) => {
            let A, B;
            if (
                sortKey ===
                "date"
            ) {
                A = a.date;
                B = b.date;
            } else if (
                sortKey ===
                "branch"
            ) {
                A = a.branch;
                B = b.branch;
            } else if (
                sortKey ===
                "vehicle"
            ) {
                A = a.vehicle;
                B = b.vehicle;
            } else if (
                sortKey ===
                "category"
            ) {
                A = a.category;
                B = b.category;
            } else if (
                sortKey ===
                "amount"
            ) {
                A = a.amount;
                B = b.amount;
            } else {
                A = a.date;
                B = b.date;
            }
            if (A < B)
                return sortDir ===
                "asc"
                    ? -1
                    : 1;
            if (A > B)
                return sortDir ===
                "asc"
                    ? 1
                    : -1;
            return 0;
        });
        return arr;
    }, [
        expenses,
        sortKey,
        sortDir,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            sorted.length /
            pageSize
        )
    );
    const current =
        sorted.slice(
            (page - 1) *
            pageSize,
            page *
            pageSize
        );

    React.useEffect(() => {
        if (page > totalPages)
            setPage(
                totalPages
            );
    }, [totalPages, page]);

    const headerCell = (
        key,
        label
    ) => (
        <th
            className="px-3 py-2 font-medium text-[11px] text-slate-600 uppercase tracking-wide cursor-pointer select-none"
            onClick={() => {
                if (
                    sortKey ===
                    key
                ) {
                    setSortDir(
                        (d) =>
                            d ===
                            "asc"
                                ? "desc"
                                : "asc"
                    );
                } else {
                    setSortKey(
                        key
                    );
                    setSortDir(
                        "asc"
                    );
                }
            }}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {sortKey ===
                key ? (
                    sortDir ===
                    "asc" ? (
                        <span className="text-[10px] text-slate-500">
                            ▲
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-500">
                            ▼
                        </span>
                    )
                ) : null}
            </span>
        </th>
    );

    const sumAmount =
        expenses.reduce(
            (s, e) =>
                s +
                Number(
                    e.amount ||
                    0
                ),
            0
        );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                {/* THEAD */}
                <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    {headerCell(
                        "date",
                        "Ngày"
                    )}
                    {headerCell(
                        "branch",
                        "Chi nhánh"
                    )}
                    {headerCell(
                        "vehicle",
                        "Xe"
                    )}
                    {headerCell(
                        "category",
                        "Loại chi phí"
                    )}
                    {headerCell(
                        "amount",
                        "Số tiền"
                    )}
                    <th className="px-3 py-2 font-medium text-[11px] text-slate-600 uppercase tracking-wide">
                        Ghi chú
                    </th>
                </tr>
                </thead>

                {/* TBODY */}
                <tbody>
                {current.map(
                    (ex) => (
                        <tr
                            key={
                                ex.id
                            }
                            className="border-b border-slate-200 hover:bg-slate-50/70"
                        >
                            <td className="px-3 py-2 text-[12px] text-slate-500 whitespace-nowrap align-top">
                                {
                                    ex.date
                                }
                            </td>

                            <td className="px-3 py-2 text-sm text-slate-800 align-top">
                                {
                                    ex.branch
                                }
                            </td>

                            <td className="px-3 py-2 text-sm text-slate-700 align-top">
                                {
                                    ex.vehicle
                                }
                            </td>

                            <td className="px-3 py-2 text-[11px] align-top">
                                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 border border-slate-300 text-slate-700">
                                        {CATEGORY_LABELS[
                                                ex
                                                    .category
                                                ] ||
                                            ex.category}
                                    </span>
                            </td>

                            <td className="px-3 py-2 text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap align-top">
                                {fmtVND(
                                    ex.amount
                                )}{" "}
                                đ
                            </td>

                            <td className="px-3 py-2 text-[12px] text-slate-500 align-top">
                                {ex.notes ||
                                    "—"}
                            </td>
                        </tr>
                    )
                )}

                {current.length ===
                0 ? (
                    <tr>
                        <td
                            colSpan={
                                6
                            }
                            className="px-3 py-6 text-center text-slate-500 text-sm"
                        >
                            Không
                            có chi
                            phí
                            nào
                            trong
                            khoảng
                            lọc.
                        </td>
                    </tr>
                ) : null}
                </tbody>

                {/* TFOOT tổng tiền */}
                <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-[12px] text-slate-600">
                    <td
                        className="px-3 py-2"
                        colSpan={
                            4
                        }
                    >
                        Tổng
                        (hiển
                        thị):
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                        {fmtVND(
                            sumAmount
                        )}{" "}
                        đ
                    </td>
                    <td className="px-3 py-2" />
                </tr>
                </tfoot>
            </table>

            {/* Pagination */}
            <div className="flex flex-wrap items-start gap-3 justify-between px-3 py-3 border-t border-slate-200 bg-slate-50 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        disabled={
                            page <=
                            1
                        }
                        onClick={() =>
                            setPage(
                                Math.max(
                                    1,
                                    page -
                                    1
                                )
                            )
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ←
                    </button>

                    <div className="text-slate-700 text-sm">
                        Trang{" "}
                        <span className="font-medium text-slate-900">
                            {page}
                        </span>
                        /{" "}
                        <span className="font-medium text-slate-900">
                            {
                                totalPages
                            }
                        </span>
                    </div>

                    <button
                        disabled={
                            page >=
                            totalPages
                        }
                        onClick={() =>
                            setPage(
                                Math.min(
                                    totalPages,
                                    page +
                                    1
                                )
                            )
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        →
                    </button>

                    <select
                        value={
                            pageSize
                        }
                        onChange={(
                            e
                        ) => {
                            const n =
                                Number(
                                    e
                                        .target
                                        .value
                                ) ||
                                10;
                            setPageSize(
                                n
                            );
                            setPage(
                                1
                            );
                        }}
                        className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    >
                        {[10, 20, 50].map(
                            (n) => (
                                <option
                                    key={
                                        n
                                    }
                                    value={
                                        n
                                    }
                                >
                                    {n}
                                    /trang
                                </option>
                            )
                        )}
                    </select>
                </div>

                {/*<div className="text-[11px] text-slate-500 flex items-start gap-1 max-w-[320px] leading-relaxed">*/}
                {/*    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />*/}
                {/*    <div>*/}
                {/*        Prototype.*/}
                {/*        Khi nối*/}
                {/*        API*/}
                {/*        thật:*/}
                {/*        bảng hỗ*/}
                {/*        trợ phân*/}
                {/*        trang*/}
                {/*        server &*/}
                {/*        sort*/}
                {/*        server-side.*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>
        </div>
    );
}

/* ================= Export Excel helper (.xlsx giả lập) ================= */
function exportExcel(rows) {
    const header = [
        "date",
        "branch",
        "vehicle",
        "category",
        "amount",
        "notes",
    ].join(",");

    const bodyRows = rows.map(
        (r) =>
            [
                JSON.stringify(
                    r.date ||
                    ""
                ),
                JSON.stringify(
                    r.branch ||
                    ""
                ),
                JSON.stringify(
                    r.vehicle ||
                    ""
                ),
                JSON.stringify(
                    CATEGORY_LABELS[
                        r
                            .category
                        ] ||
                    r.category ||
                    ""
                ),
                r.amount ||
                0,
                JSON.stringify(
                    r.notes ||
                    ""
                ),
            ].join(",")
    );

    const EOL = "\r\n";
    const csv = [
        header,
        ...bodyRows,
    ].join(EOL);

    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8",
        }
    );
    const url =
        URL.createObjectURL(
            blob
        );
    const a =
        document.createElement(
            "a"
        );
    a.href = url;
    a.download =
        "expense-report-" +
        Date.now() +
        ".xlsx"; // mock
    document.body.appendChild(
        a
    );
    a.click();
    a.remove();
    URL.revokeObjectURL(
        url
    );
}

/* ================= Mock data ================= */
// id, date(YYYY-MM-DD), branch, vehicle, category, amount(VND), notes
const DEMO_EXPENSES = [
    {
        id: 1,
        date: "2025-10-20",
        branch: "Hà Nội",
        vehicle:
            "29A-12345",
        category:
            "FUEL",
        amount: 1500000,
        notes: "Đổ dầu đi Hải Phòng",
    },
    {
        id: 2,
        date: "2025-10-20",
        branch: "Hà Nội",
        vehicle:
            "29A-12345",
        category:
            "PARKING",
        amount: 120000,
        notes: "Phí bến bãi container",
    },
    {
        id: 3,
        date: "2025-10-21",
        branch:
            "Hải Phòng",
        vehicle:
            "15C-77881",
        category:
            "MAINTENANCE",
        amount: 3200000,
        notes: "Bảo dưỡng định kỳ 5 vạn km",
    },
    {
        id: 4,
        date: "2025-10-22",
        branch:
            "Đà Nẵng",
        vehicle:
            "43B-99887",
        category:
            "INSURANCE",
        amount: 2500000,
        notes: "Gia hạn BH trách nhiệm dân sự",
    },
    {
        id: 5,
        date: "2025-10-22",
        branch: "Hà Nội",
        vehicle:
            "29A-12345",
        category:
            "FUEL",
        amount: 900000,
        notes: "Nhiên liệu chạy nội thành",
    },
    {
        id: 6,
        date: "2025-10-23",
        branch:
            "TP.HCM",
        vehicle:
            "51D-66532",
        category:
            "SALARY",
        amount: 8000000,
        notes: "Tạm ứng lương tài xế tháng 10",
    },
    {
        id: 7,
        date: "2025-10-24",
        branch:
            "TP.HCM",
        vehicle:
            "51D-66532",
        category:
            "OTHER",
        amount: 400000,
        notes: "Rửa xe + vệ sinh nội thất",
    },
    {
        id: 8,
        date: "2025-10-24",
        branch:
            "Hải Phòng",
        vehicle:
            "15C-77881",
        category:
            "FUEL",
        amount: 1300000,
        notes: "Đầu ca sáng",
    },
    {
        id: 9,
        date: "2025-10-24",
        branch:
            "Hải Phòng",
        vehicle:
            "15C-77881",
        category:
            "PARKING",
        amount: 100000,
        notes: "Qua đêm kho Cảng",
    },
    {
        id: 10,
        date: "2025-10-24",
        branch: "Hà Nội",
        vehicle:
            "29A-12345",
        category:
            "MAINTENANCE",
        amount: 2100000,
        notes: "Thay má phanh trước",
    },
];

/* ================= Main Page: ExpenseReportPage (light) ================= */
export default function ExpenseReportPage() {
    const { toasts, push } = useToasts();
    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const currentUserId = React.useMemo(() => {
        const raw = getStoredUserId();
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isNaN(parsed) ? null : parsed;
    }, []);
    const isManagerView = currentRole === ROLES.MANAGER;
    const isConsultantView = currentRole === ROLES.CONSULTANT;
    const isAccountantView = currentRole === ROLES.ACCOUNTANT;
    const isBranchLocked = isManagerView || isConsultantView || isAccountantView;

    // Bộ lọc
    const [fromDate, setFromDate] = React.useState("");
    const [toDate, setToDate] = React.useState("");
    const [period, setPeriod] = React.useState("THIS_MONTH");
    const [branchId, setBranchId] = React.useState(null);
    const [vehicleId, setVehicleId] = React.useState(null);
    const [catFilter, setCatFilter] = React.useState("");

    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Data from API
    const [reportData, setReportData] = React.useState({
        totalExpense: 0,
        expenseByCategory: {},
        expenses: [],
    });

    const [branches, setBranches] = React.useState([]);
    const [vehicles, setVehicles] = React.useState([]);
    const [branchLockLoading, setBranchLockLoading] = React.useState(isBranchLocked);
    const [branchLockError, setBranchLockError] = React.useState("");
    const [branchLockName, setBranchLockName] = React.useState("");

    // Load branches and vehicles on mount
    React.useEffect(() => {
        (async () => {
            try {
                const branchesData = await listBranches({ size: 100 });
                setBranches(normalizeBranchOptions(branchesData));

                // For Accountant/Manager/Consultant: only load vehicles from their branch
                // For Admin: load all vehicles
                if (isBranchLocked && branchId != null) {
                    const vehiclesData = await listVehicles({ branchId, size: 100 });
                    setVehicles(normalizeVehicleOptions(vehiclesData));
                } else if (!isBranchLocked) {
                    const vehiclesData = await listVehicles({ size: 100 });
                    setVehicles(normalizeVehicleOptions(vehiclesData));
                }
            } catch (err) {
                console.error("Error loading options:", err);
            }
        })();
    }, [isBranchLocked, branchId]);

    // Lock branch filter for Manager and Consultant roles
    React.useEffect(() => {
        if (!isBranchLocked) {
            setBranchLockLoading(false);
            setBranchLockError("");
            setBranchLockName("");
            return;
        }
        if (currentUserId == null) {
            setBranchLockLoading(false);
            setBranchLockError("Không xác định được tài khoản hiện tại.");
            setBranchLockName("");
            setBranchId(null);
            return;
        }
        let cancelled = false;
        async function fetchBranch() {
            setBranchLockLoading(true);
            setBranchLockError("");
            try {
                const resp = await getEmployeeByUserId(currentUserId);
                if (cancelled) return;
                const employee = resp?.data || resp;
                const rawBranchId = employee?.branchId ?? employee?.branch?.id;
                if (rawBranchId == null) {
                    setBranchId(null);
                    setBranchLockName("");
                    setBranchLockError("Không tìm thấy chi nhánh phụ trách. Liên hệ Admin.");
                    return;
                }
                const parsed = Number(rawBranchId);
                if (Number.isNaN(parsed)) {
                    setBranchId(null);
                    setBranchLockName("");
                    setBranchLockError("Chi nhánh không hợp lệ.");
                    return;
                }
                setBranchId(parsed);
                setBranchLockName(employee?.branchName || employee?.branch?.branchName || employee?.branch?.name || "");
                setBranchLockError("");
            } catch (err) {
                if (!cancelled) {
                    setBranchId(null);
                    setBranchLockName("");
                    setBranchLockError("Không tải được chi nhánh phụ trách.");
                }
            } finally {
                if (!cancelled) {
                    setBranchLockLoading(false);
                }
            }
        }
        fetchBranch();
        return () => {
            cancelled = true;
        };
    }, [isBranchLocked, currentUserId]);

    // Load expense report
    const loadReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // expenseType filter chỉ áp dụng cho ExpenseRequests (không áp dụng cho Invoices vì costType đã bị xóa)
            const data = await getExpenseReport({
                branchId: branchId || undefined,
                vehicleId: vehicleId || undefined,
                expenseType: catFilter || undefined, // Filter theo loại chi phí
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                period: period || undefined,
            });
            setReportData(data || {
                totalExpense: 0,
                expenseByCategory: {},
                expenses: [],
            });
        } catch (err) {
            console.error("Error loading expense report:", err);
            setError(err.message || "Không thể tải báo cáo chi phí");
            push("Lỗi khi tải báo cáo chi phí", "error");
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, vehicleId, catFilter, fromDate, toDate, period]);

    const branchReady = !isBranchLocked || (!branchLockLoading && branchId != null);

    // Load on mount and when filters change
    React.useEffect(() => {
        if (!branchReady) {
            return;
        }
        loadReport();
    }, [loadReport, branchReady]);

    React.useEffect(() => {
        if (isBranchLocked && !branchLockLoading && branchId == null) {
            setInitialLoading(false);
        }
    }, [isBranchLocked, branchLockLoading, branchId]);

    const categoryOptions =
        React.useMemo(
            () =>
                Object.entries(
                    CATEGORY_LABELS
                ).map(
                    ([
                         value,
                         label,
                     ]) => ({
                        value,
                        label,
                    })
                ),
            []
        );

    // Transform expenses from API
    // costType đã bị xóa - tất cả Invoices sẽ có costType = null, chỉ ExpenseRequests có expenseType
    const filteredExpenses = React.useMemo(() => {
        return (reportData.expenses || []).map((exp) => ({
            id: exp.invoiceId,
            date: exp.invoiceDate ? new Date(exp.invoiceDate).toISOString().slice(0, 10) : "",
            branch: exp.branchName || "—",
            vehicle: exp.vehicleLicensePlate || "—",
            category: exp.costType || exp.expenseType || "OTHER", // costType có thể null, fallback sang expenseType hoặc OTHER
            amount: Number(exp.amount || 0),
            notes: exp.note || "—",
        }));
    }, [reportData.expenses]);

    // Total expense
    const totalExpense = Number(reportData.totalExpense || 0);

    // Dữ liệu cho pie / breakdown từ expenseByCategory
    const pieSlices = React.useMemo(() => {
        const categoryMap = reportData.expenseByCategory || {};
        const entries = Object.entries(categoryMap).map(([key, amount]) => ({
            key,
            label: CATEGORY_LABELS[key] || key,
            amount: Number(amount || 0),
        }));

        entries.sort((a, b) => b.amount - a.amount);
        const total = entries.reduce((s, x) => s + x.amount, 0);

        return entries.map((e, idx) => ({
            ...e,
            pct: total > 0 ? (e.amount / total) * 100 : 0,
            color: PALETTE[idx % PALETTE.length],
        }));
    }, [reportData.expenseByCategory]);

    // Refresh
    const onRefresh = () => {
        if (isBranchLocked && !branchReady) {
            push("Đang xác định chi nhánh của bạn...", "info");
            return;
        }
        loadReport();
        push("Đã làm mới báo cáo", "info");
    };

    // Export excel
    const onExportExcel = async () => {
        if (isBranchLocked && !branchReady) {
            push("Đang xác định chi nhánh của bạn...", "info");
            return;
        }
        try {
            // expenseType filter chỉ áp dụng cho ExpenseRequests
            await exportExpenseReportToExcel({
                branchId: branchId || undefined,
                vehicleId: vehicleId || undefined,
                expenseType: catFilter || undefined, // Filter theo loại chi phí
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                period: period || undefined,
            });
            push("Đã xuất báo cáo chi phí (Excel)", "success");
        } catch (err) {
            console.error("Export error:", err);
            push("Lỗi khi xuất Excel: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-wrap items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                    <PieChartIcon className="h-5 w-5" />
                </div>

                <div className="flex flex-col">
                    <div className="text-[11px] text-slate-500 leading-none mb-1">
                        Kế toán / Báo cáo
                    </div>

                    <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                        Báo cáo Chi phí
                    </h1>

                    <p className="text-slate-500 text-[13px]">
                        Cơ cấu chi phí ·
                        Tổng chi ·
                        Danh sách
                        chi tiết
                    </p>
                </div>
            </div>

            {/* FILTER BAR CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 mb-5">
                <FiltersBar
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    toDate={toDate}
                    setToDate={setToDate}
                    catFilter={catFilter}
                    setCatFilter={setCatFilter}
                    branchOptions={branches}
                    vehicleOptions={vehicles}
                    branchId={branchId}
                    setBranchId={setBranchId}
                    vehicleId={vehicleId}
                    setVehicleId={setVehicleId}
                    period={period}
                    setPeriod={setPeriod}
                    categoryOptions={categoryOptions}
                    onRefresh={onRefresh}
                    loading={loading}
                    onExportExcel={onExportExcel}
                    branchDisabled={isBranchLocked}
                    branchHelperText={branchLockName
                        ? `Chi nhánh ${branchLockName}`
                        : branchId != null
                            ? `Chi nhánh #${branchId}`
                            : ""}
                    branchLoading={branchLockLoading}
                    branchError={branchLockError}
                />
            </div>

            {/* TOTAL EXPENSE CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 mb-6">
                <div className="text-sm text-slate-500 mb-1">Tổng chi phí</div>
                <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                    {fmtVND(totalExpense)} đ
                </div>
            </div>

            {/* TABLE CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                    Chi tiết chi
                    phí (
                    {
                        filteredExpenses.length
                    }{" "}
                    dòng)
                </div>

                <ExpenseTable
                    expenses={
                        filteredExpenses
                    }
                />

                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                    Tổng chi phí: {fmtVND(totalExpense)} đ.
                    {error && <span className="text-rose-600 ml-2">Lỗi: {error}</span>}
                </div>
            </div>
        </div>
    );
}
