import React from "react";
import {
    BarChart3,
    RefreshCw,
    Search,
    Filter,
    TrendingUp,
    TrendingDown,
    Check,
    X,
    ReceiptText,
    BadgeDollarSign,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Download,
    CalendarRange,
    Building2,
    Info,
    Clock,
    CheckCircle,
    XCircle,
    CreditCard,
} from "lucide-react";
import { getAccountingDashboard } from "../../api/accounting";
import { listBranches } from "../../api/branches";
import {
    getPendingApprovals,
    approveApprovalRequest,
    rejectApprovalRequest,
} from "../../api/notifications";
import { getPendingPayments, confirmPayment } from "../../api/invoices";
import { getPendingExpenseRequests, approveExpenseRequest, rejectExpenseRequest } from "../../api/expenses";
import { getEmployeeByUserId } from "../../api/employees";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

/**
 * AccountantDashboard – (LIGHT THEME giống AdminBranchListPage)
 * Vai trò: Accountant (Kế toán)
 * Trạng thái: Thiết kế chi tiết (demo data + luồng mô phỏng). Chưa nối API thật.
 *
 * API tham chiếu:
 *  GET  /api/v1/accountant/dashboard
 *  POST /api/v1/accountant/expenses/{expenseId}/approve
 *  POST /api/v1/accountant/expenses/{expenseId}/reject
 *
 * Ghi chú:
 * - Biểu đồ doanh thu / chi phí / net
 * - KPI công nợ
 * - Hàng đợi yêu cầu chi phí chờ duyệt + bulk duyệt / từ chối
 * - Export CSV
 *
 * Tone màu: nền xám nhạt, card trắng viền slate-200, accent xanh trời (#0079BC ~ sky-600),
 * giống style của AdminBranchListPage.
 */

/* ===========================
   Utils & constants
=========================== */
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    );
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Demo queue yêu cầu chi phí (REMOVED - chỉ dùng data từ API)
const DEMO_QUEUE_OLD = [
    {
        id: 901,
        creator: "Driver · Văn A",
        type: "MAINTENANCE",
        amount: 2000000,
        trip: "—",
        created_at: "2025-10-20 09:20",
        attachments: ["bien-nhan-901.pdf"],
    },
    {
        id: 902,
        creator: "Coordinator · Mai B",
        type: "INSURANCE",
        amount: 3800000,
        trip: "ORD-712",
        created_at: "2025-10-21 14:05",
        attachments: [],
    },
    {
        id: 903,
        creator: "Driver · Lâm C",
        type: "PARKING",
        amount: 150000,
        trip: "—",
        created_at: "2025-10-22 18:42",
        attachments: ["parking-903.jpg"],
    },
    {
        id: 904,
        creator: "Coordinator · Hùng D",
        type: "INSPECTION",
        amount: 950000,
        trip: "—",
        created_at: "2025-10-23 10:15",
        attachments: [],
    },
    {
        id: 905,
        creator: "Driver · Thuỷ E",
        type: "OTHER",
        amount: 420000,
        trip: "—",
        created_at: "2025-10-23 15:33",
        attachments: ["note.txt"],
    },
    {
        id: 906,
        creator: "Driver · Phúc F",
        type: "MAINTENANCE",
        amount: 1200000,
        trip: "—",
        created_at: "2025-10-24 08:11",
        attachments: [],
    },
    {
        id: 907,
        creator: "Coordinator · Chi G",
        type: "PARKING",
        amount: 200000,
        trip: "ORD-730",
        created_at: "2025-10-24 09:00",
        attachments: [],
    },
    {
        id: 908,
        creator: "Driver · Bình H",
        type: "INSPECTION",
        amount: 1100000,
        trip: "—",
        created_at: "2025-10-24 10:40",
        attachments: ["bill-908.pdf"],
    },
    {
        id: 909,
        creator: "Driver · Nam I",
        type: "OTHER",
        amount: 300000,
        trip: "—",
        created_at: "2025-10-24 11:10",
        attachments: [],
    },
    {
        id: 910,
        creator: "Coordinator · Hoa K",
        type: "INSURANCE",
        amount: 5000000,
        trip: "ORD-735",
        created_at: "2025-10-24 12:25",
        attachments: [],
    },
];

// map type -> label tiếng Việt
const TYPE_LABEL = {
    MAINTENANCE: "Bảo dưỡng",
    INSURANCE: "Bảo hiểm",
    INSPECTION: "Đăng kiểm",
    PARKING: "Bến bãi",
    OTHER: "Khác",
    INCOME: "Thu",
    EXPENSE: "Chi",
};

// Period options
const PERIOD_OPTIONS = [
    { value: "TODAY", label: "Hôm nay" },
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
    { value: "YTD", label: "Năm nay (YTD)" },
];

/* ===========================
   Toasts (light)
=========================== */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback((msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
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

/* ===========================
   ConfirmModal (light style)
=========================== */
function ConfirmModal({
                          open,
                          title,
                          message,
                          requireReason = false,
                          onCancel,
                          onConfirm,
                      }) {
    const [reason, setReason] = React.useState("");

    React.useEffect(() => {
        if (!open) setReason("");
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-md rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                    <div className="font-semibold text-slate-900">
                        {title}
                    </div>
                </div>

                {/* body */}
                <div className="px-5 py-4 text-sm text-slate-700 space-y-3">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">{message}</div>
                    </div>

                    {requireReason ? (
                        <div>
                            <div className="text-xs text-slate-600 mb-1">
                                Lý do (bắt buộc khi từ chối)
                            </div>
                            <textarea
                                value={reason}
                                onChange={(e) =>
                                    setReason(e.target.value)
                                }
                                rows={3}
                                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                                placeholder="Nhập lý do từ chối"
                            />
                        </div>
                    ) : null}
                </div>

                {/* footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={() =>
                            onConfirm(
                                requireReason
                                    ? reason.trim()
                                    : undefined
                            )
                        }
                        className="rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium shadow-sm transition-colors"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===========================
   Biểu đồ Doanh thu / Chi phí / Net
   (SVG thuần, light mode)
=========================== */
function RevExpChart({ data = [] }) {
    // layout
    const padding = { t: 20, r: 16, b: 26, l: 36 };
    const W = 820,
        H = 250;
    const innerW = W - padding.l - padding.r;
    const innerH = H - padding.t - padding.b;

    // Fix: Handle empty data or all zeros
    const values = data.length > 0
        ? data.map((d) => Math.max(Number(d.revenue || 0), Number(d.expense || 0)))
        : [0];
    const maxValue = Math.max(...values);
    const maxY = maxValue > 0 ? maxValue * 1.3 : 100; // Default to 100 if all zeros

    // Fix: Prevent division by zero
    const dataLength = Math.max(1, data.length);
    const barGroupW = innerW / dataLength;
    const barW = Math.min(
        20,
        Math.max(10, barGroupW * 0.34)
    );
    const yTo = (val) => {
        if (maxY <= 0) return padding.t + innerH; // Bottom of chart if no data
        return padding.t + innerH - (val / maxY) * innerH;
    };

    // net path points
    const netPoints = data.map((d, i) => {
        const x =
            padding.l +
            i * barGroupW +
            barGroupW / 2;
        const y = yTo(
            Math.max(0, d.revenue - d.expense)
        );
        return { x, y };
    });
    let netPath = "";
    netPoints.forEach((p, i) => {
        netPath +=
            (i === 0 ? "M" : "L") +
            p.x +
            "," +
            p.y +
            " ";
    });

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[250px]"
        >
            {/* grid lines */}
            {[0.25, 0.5, 0.75, 1].map(
                (t, i) => {
                    const y =
                        padding.t +
                        innerH * (1 - t);
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
                }
            )}

            {/* bars (Doanh thu & Chi phí) */}
            {data.length > 0 ? data.map((d, i) => {
                const x0 = padding.l + i * barGroupW + (barGroupW - barW * 2 - 6) / 2;
                const ry = 3;

                const revenue = Number(d.revenue || 0);
                const expense = Number(d.expense || 0);
                const yRev = yTo(revenue);
                const yExp = yTo(expense);
                const hRev = Math.max(0, innerH - (yRev - padding.t));
                const hExp = Math.max(0, innerH - (yExp - padding.t));

                // Validate to prevent NaN or invalid values
                if (isNaN(yRev) || isNaN(yExp) || isNaN(hRev) || isNaN(hExp) ||
                    !isFinite(yRev) || !isFinite(yExp) || !isFinite(hRev) || !isFinite(hExp)) {
                    return null;
                }

                return (
                    <g key={d.month || i}>
                        <rect
                            x={x0}
                            y={yRev}
                            width={barW}
                            height={Math.max(0, hRev)}
                            rx={ry}
                            className="fill-emerald-500/80"
                        />
                        <rect
                            x={x0 + barW + 6}
                            y={yExp}
                            width={barW}
                            height={Math.max(0, hExp)}
                            rx={ry}
                            className="fill-rose-500/80"
                        />
                        <text
                            x={padding.l + i * barGroupW + barGroupW / 2}
                            y={H - 6}
                            textAnchor="middle"
                            className="fill-slate-500 text-[10px] font-medium"
                        >
                            {d.month || `T${i + 1}`}
                        </text>
                    </g>
                );
            }) : (
                // Empty state
                <text
                    x={W / 2}
                    y={H / 2}
                    textAnchor="middle"
                    className="fill-slate-400 text-sm"
                >
                    Không có dữ liệu
                </text>
            )}

            {/* net line */}
            {netPath.trim() && !netPath.includes('NaN') && (
                <path
                    d={netPath.trim()}
                    className="stroke-sky-500"
                    strokeWidth="2"
                    fill="none"
                />
            )}
            {netPoints.map((p, i) => {
                if (isNaN(p.x) || isNaN(p.y)) return null;
                return (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={2.5}
                        className="fill-sky-500"
                    />
                );
            })}

            {/* legend (SVG group) */}
            <g
                transform={`translate(${
                    W - 260
                }, ${padding.t})`}
            >
                <LegendSwatchRect
                    x={0}
                    label="Doanh thu"
                    className="fill-emerald-500/80"
                />
                <LegendSwatchRect
                    x={100}
                    label="Chi phí"
                    className="fill-rose-500/80"
                />
                <LegendSwatchLine
                    x={180}
                    label="Lợi nhuận ròng"
                />
            </g>
        </svg>
    );
}

function LegendSwatchRect({ x, label, className }) {
    return (
        <g transform={`translate(${x}, 0)`}>
            <rect
                x={0}
                y={-8}
                width={10}
                height={10}
                className={className}
                rx={2}
            />
            <text
                x={14}
                y={0}
                className="fill-slate-600 text-[11px]"
                dominantBaseline="central"
            >
                {label}
            </text>
        </g>
    );
}

function LegendSwatchLine({ x, label }) {
    return (
        <g transform={`translate(${x}, 0)`}>
            <line
                x1={0}
                y1={-3}
                x2={12}
                y2={-3}
                className="stroke-sky-500"
                strokeWidth={2}
            />
            <circle
                cx={6}
                cy={-3}
                r={2}
                className="fill-sky-500"
            />
            <text
                x={16}
                y={-3}
                className="fill-slate-600 text-[11px]"
                dominantBaseline="central"
            >
                {label}
            </text>
        </g>
    );
}

/* ===========================
   KPI Card (light)
=========================== */
function KpiCard({ title, value, delta, up }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">
                {title}
            </div>

            <div className="mt-1 flex items-end gap-2">
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                    {fmtVND(value)} đ
                </div>

                <div
                    className={cls(
                        "text-xs flex items-center gap-1 font-medium",
                        up
                            ? "text-primary-600"
                            : "text-rose-600"
                    )}
                >
                    {up ? (
                        <TrendingUp className="h-4 w-4" />
                    ) : (
                        <TrendingDown className="h-4 w-4" />
                    )}
                    {Math.abs(
                        Number(delta || 0)
                    ).toFixed(1)}
                    %
                </div>
            </div>
        </div>
    );
}

/* ===========================
   Export CSV helper
=========================== */
function exportCSV(items) {
    const header = [
        "id",
        "creator",
        "type",
        "amount",
        "trip",
        "created_at",
    ].join(",");
    const rows = items.map((it) =>
        [
            it.id,
            JSON.stringify(
                it.creator || ""
            ),
            JSON.stringify(
                TYPE_LABEL[it.type] ||
                it.type ||
                ""
            ),
            it.amount,
            JSON.stringify(
                it.trip || ""
            ),
            JSON.stringify(
                it.created_at || ""
            ),
        ].join(",")
    );

    const EOL = "\r\n";
    const csv = [header, ...rows].join(EOL);

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
        "expense-queue-" +
        Date.now() +
        ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ===========================
   QueueTable (light theme)
   - sort
   - paging
   - bulk select
   - inline expand
   - confirm modal tích hợp
=========================== */
function QueueTable({
                        items,
                        onApprove,
                        onReject,
                    }) {
    const [page, setPage] =
        React.useState(1);
    const [pageSize, setPageSize] =
        React.useState(8);

    const [sortKey, setSortKey] =
        React.useState("created_at");
    const [sortDir, setSortDir] =
        React.useState("desc"); // "asc" | "desc"

    const [expanded, setExpanded] =
        React.useState(new Set());
    const [selected, setSelected] =
        React.useState(new Set());

    const [confirm, setConfirm] =
        React.useState({
            open: false,
            mode: null,
            ids: [],
        });

    // toggle expand row
    const toggleExpand = (id) =>
        setExpanded((s) => {
            const n = new Set(s);
            n.has(id)
                ? n.delete(id)
                : n.add(id);
            return n;
        });

    // toggle row checkbox
    const toggleSelect = (id) =>
        setSelected((s) => {
            const n = new Set(s);
            n.has(id)
                ? n.delete(id)
                : n.add(id);
            return n;
        });

    // sort
    const sorted = React.useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => {
            let A, B;
            if (sortKey === "amount") {
                A = a.amount;
                B = b.amount;
            } else if (
                sortKey === "type"
            ) {
                A = a.type;
                B = b.type;
            } else if (
                sortKey === "creator"
            ) {
                A = a.creator;
                B = b.creator;
            } else {
                A = a.created_at;
                B = b.created_at;
            }
            if (A < B)
                return sortDir === "asc"
                    ? -1
                    : 1;
            if (A > B)
                return sortDir === "asc"
                    ? 1
                    : -1;
            return 0;
        });
        return arr;
    }, [items, sortKey, sortDir]);

    // pagination
    const totalPages = Math.max(
        1,
        Math.ceil(sorted.length / pageSize)
    );
    const current = sorted.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    React.useEffect(() => {
        if (page > totalPages)
            setPage(totalPages);
    }, [totalPages, page]);

    // toggle select all on current page
    const allSelectedOnPage =
        current.every((it) =>
            selected.has(it.id)
        );
    const toggleSelectAllPage = () => {
        const set = new Set(selected);
        if (allSelectedOnPage) {
            current.forEach((it) =>
                set.delete(it.id)
            );
        } else {
            current.forEach((it) =>
                set.add(it.id)
            );
        }
        setSelected(set);
    };

    // header cell with sort caret
    const headerCell = (key, label) => (
        <th
            className="px-3 py-2 font-medium text-slate-600 text-xs cursor-pointer select-none"
            onClick={() => {
                if (
                    sortKey === key
                ) {
                    setSortDir((d) =>
                        d === "asc"
                            ? "desc"
                            : "asc"
                    );
                } else {
                    setSortKey(key);
                    setSortDir("asc");
                }
            }}
        >
            <span className="inline-flex items-center gap-1 uppercase tracking-wide">
                {label}
                {sortKey === key ? (
                    sortDir ===
                    "asc" ? (
                        <ChevronUp className="h-3 w-3 text-slate-500" />
                    ) : (
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                    )
                ) : null}
            </span>
        </th>
    );

    // tổng tiền
    const sumAmount = items.reduce(
        (s, it) =>
            s + Number(it.amount || 0),
        0
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                {/* THEAD */}
                <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-3 py-2 w-10">
                        <input
                            type="checkbox"
                            checked={
                                allSelectedOnPage
                            }
                            onChange={
                                toggleSelectAllPage
                            }
                            className="accent-sky-600"
                        />
                    </th>
                    {headerCell(
                        "creator",
                        "Người tạo"
                    )}
                    {headerCell(
                        "type",
                        "Loại chi phí"
                    )}
                    {headerCell(
                        "amount",
                        "Số tiền"
                    )}
                    {headerCell(
                        "trip",
                        "Chuyến đi"
                    )}
                    {headerCell(
                        "created_at",
                        "Tạo lúc"
                    )}
                    <th className="px-3 py-2 font-medium text-slate-600 text-xs uppercase tracking-wide">
                        Hành động
                    </th>
                </tr>
                </thead>

                {/* TBODY */}
                <tbody>
                {current.map((it) => (
                    <React.Fragment
                        key={it.id}
                    >
                        <tr className="border-b border-slate-200 hover:bg-slate-50/70">
                            <td className="px-3 py-2 align-top">
                                <input
                                    type="checkbox"
                                    checked={selected.has(
                                        it.id
                                    )}
                                    onChange={() =>
                                        toggleSelect(
                                            it.id
                                        )
                                    }
                                    className="accent-sky-600"
                                />
                            </td>

                            <td className="px-3 py-2 align-top text-sm text-slate-800">
                                {it.creator}
                            </td>

                            <td className="px-3 py-2 align-top text-sm">
                                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 border border-slate-300 text-slate-700">
                                        {TYPE_LABEL[
                                                it
                                                    .type
                                                ] ||
                                            it.type}
                                    </span>
                            </td>

                            <td className="px-3 py-2 align-top text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap">
                                {fmtVND(
                                    it.amount
                                )}{" "}
                                đ
                            </td>

                            <td className="px-3 py-2 align-top text-sm text-slate-700 whitespace-nowrap">
                                {it.trip ||
                                    "—"}
                            </td>

                            <td className="px-3 py-2 align-top text-[12px] text-slate-500 whitespace-nowrap">
                                {
                                    it.created_at
                                }
                            </td>

                            <td className="px-3 py-2 align-top">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setConfirm(
                                                {
                                                    open: true,
                                                    mode: "approve",
                                                    ids: [
                                                        it.id,
                                                    ],
                                                }
                                            )
                                        }
                                        className="inline-flex items-center gap-1 rounded-md border border-sky-500 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 shadow-sm transition-colors"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>
                                                Duyệt
                                            </span>
                                    </button>

                                    <button
                                        onClick={() =>
                                            setConfirm(
                                                {
                                                    open: true,
                                                    mode: "reject",
                                                    ids: [
                                                        it.id,
                                                    ],
                                                }
                                            )
                                        }
                                        className="inline-flex items-center gap-1 rounded-md border border-rose-500 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 shadow-sm transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        <span>
                                                Từ
                                                chối
                                            </span>
                                    </button>

                                    <button
                                        onClick={() =>
                                            toggleExpand(
                                                it.id
                                            )
                                        }
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                                    >
                                        Chi
                                        tiết
                                    </button>
                                </div>
                            </td>
                        </tr>

                        {expanded.has(
                            it.id
                        ) ? (
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <td
                                    colSpan={
                                        7
                                    }
                                    className="px-6 py-3"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-slate-700">
                                        <div>
                                                <span className="text-slate-500">
                                                    ID:
                                                </span>{" "}
                                            #
                                            {
                                                it.id
                                            }
                                        </div>
                                        <div>
                                                <span className="text-slate-500">
                                                    Loại:
                                                </span>{" "}
                                            {TYPE_LABEL[
                                                    it.type
                                                    ] ||
                                                it.type}
                                        </div>
                                        <div>
                                                <span className="text-slate-500">
                                                    Số
                                                    tiền:
                                                </span>{" "}
                                            {fmtVND(
                                                it.amount
                                            )}{" "}
                                            đ
                                        </div>
                                        <div className="md:col-span-3">
                                                <span className="text-slate-500">
                                                    Ghi chú:
                                                </span>{" "}
                                            {it.note || "—"}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : null}
                    </React.Fragment>
                ))}

                {current.length ===
                0 ? (
                    <tr>
                        <td
                            colSpan={
                                7
                            }
                            className="px-3 py-6 text-center text-slate-500 text-sm"
                        >
                            Không
                            có yêu
                            cầu nào
                            phù hợp.
                        </td>
                    </tr>
                ) : null}
                </tbody>

                {/* TFOOT tổng số tiền */}
                <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/70 text-[12px] text-slate-600">
                    <td
                        className="px-3 py-2"
                        colSpan={
                            2
                        }
                    >
                        Tổng
                        (tất cả
                        kết
                        quả):
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                        {fmtVND(
                            sumAmount
                        )}{" "}
                        đ
                    </td>
                    <td
                        className="px-3 py-2"
                        colSpan={
                            4
                        }
                    />
                </tr>
                </tfoot>
            </table>

            {/* Pagination + bulk actions bar */}
            <div className="flex flex-wrap items-center gap-3 justify-between px-3 py-3 border-t border-slate-200 bg-slate-50 text-sm">
                {/* left: paging */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        disabled={page <= 1}
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
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
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
                        <ChevronRight className="h-4 w-4 text-slate-600" />
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
                                8;
                            setPageSize(
                                n
                            );
                            setPage(
                                1
                            );
                        }}
                        className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    >
                        {[8, 12, 20, 50].map(
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

                {/* right: bulk actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() =>
                            setConfirm({
                                open: true,
                                mode: "approve",
                                ids: Array.from(
                                    selected
                                ),
                            })
                        }
                        disabled={
                            selected
                                .size ===
                            0
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-sky-500 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="h-3.5 w-3.5" />
                        Duyệt đã chọn
                    </button>

                    <button
                        onClick={() =>
                            setConfirm({
                                open: true,
                                mode: "reject",
                                ids: Array.from(
                                    selected
                                ),
                            })
                        }
                        disabled={
                            selected
                                .size ===
                            0
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="h-3.5 w-3.5" />
                        Từ chối đã
                        chọn
                    </button>

                    <button
                        onClick={() =>
                            exportCSV(
                                items
                            )
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <Download className="h-3.5 w-3.5 text-slate-600" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Confirm modal */}
            <ConfirmModal
                open={confirm.open}
                title={
                    confirm.mode ===
                    "approve"
                        ? "Xác nhận duyệt"
                        : "Xác nhận từ chối"
                }
                message={
                    confirm.ids.length >
                    1
                        ? `Áp dụng cho ${String(
                            confirm
                                .ids
                                .length
                        )} yêu cầu.`
                        : `Áp dụng cho yêu cầu #${String(
                            confirm
                                .ids[0]
                        )}.`
                }
                requireReason={
                    confirm.mode ===
                    "reject"
                }
                onCancel={() =>
                    setConfirm({
                        open: false,
                        mode: null,
                        ids: [],
                    })
                }
                onConfirm={(reason) => {
                    const ids =
                        confirm.ids;
                    setConfirm({
                        open: false,
                        mode: null,
                        ids: [],
                    });
                    if (
                        confirm.mode ===
                        "approve"
                    ) {
                        ids.forEach(
                            (id) =>
                                onApprove &&
                                onApprove(
                                    id
                                )
                        );
                    } else {
                        ids.forEach(
                            (id) =>
                                onReject &&
                                onReject(
                                    id,
                                    reason
                                )
                        );
                    }
                }}
            />
        </div>
    );
}

/* ===========================
   Trang chính AccountantDashboard (light)
=========================== */
export default function AccountantDashboard() {
    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const [query, setQuery] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState("");
    const [approvalQueue, setApprovalQueue] = React.useState([]);
    const [queueLoading, setQueueLoading] = React.useState(false);
    const [queueError, setQueueError] = React.useState("");

    // Pending payment requests from drivers/consultants
    const [pendingPayments, setPendingPayments] = React.useState([]);
    const [pendingPaymentsLoading, setPendingPaymentsLoading] = React.useState(false);
    const [pendingPaymentsError, setPendingPaymentsError] = React.useState("");

    // Payment confirmation modal state
    const [paymentConfirm, setPaymentConfirm] = React.useState({
        open: false,
        paymentId: null,
        status: null, // "CONFIRMED" | "REJECTED"
        paymentInfo: null, // Thông tin payment để hiển thị trong popup
    });

    const [branchId, setBranchId] = React.useState(null);
    const [branches, setBranches] = React.useState([]);
    const [period, setPeriod] = React.useState("THIS_MONTH");
    const [userBranchId, setUserBranchId] = React.useState(null); // Chi nhánh của user hiện tại
    const [branchLocked, setBranchLocked] = React.useState(false); // Khóa dropdown cho accountant

    const { toasts, push } = useToasts();
    const role = getCurrentRole();
    const isAccountant = role === ROLES.ACCOUNTANT;

    // Dashboard data from API
    const [dashboardData, setDashboardData] = React.useState({
        totalRevenue: 0,
        totalExpense: 0,
        netProfit: 0,
        arBalance: 0,
        apBalance: 0,
        invoicesDueIn7Days: 0,
        overdueInvoices: 0,
        collectionRate: 0,
        expenseToRevenueRatio: 0,
        revenueChart: [],
        expenseChart: [],
        expenseByCategory: {},
        pendingApprovals: [],
        topCustomers: [],
    });

    // Load branches and user's branch on mount
    React.useEffect(() => {
        (async () => {
            try {
                // Load branches
                const branchesData = await listBranches({ size: 100 });
                setBranches(Array.isArray(branchesData) ? branchesData : []);

                // Nếu là accountant, lấy branchId từ employee record
                if (isAccountant) {
                    const userId = getStoredUserId();
                    if (userId) {
                        try {
                            const emp = await getEmployeeByUserId(userId);
                            const empBranchId = emp?.branchId || emp?.branch?.id || emp?.branch?.branchId;
                            if (empBranchId) {
                                setUserBranchId(empBranchId);
                                setBranchId(empBranchId);
                                setBranchLocked(true); // Khóa dropdown
                            }
                        } catch (err) {
                            console.error("Error loading employee branch:", err);
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading branches:", err);
            }
        })();
    }, [isAccountant]);

    // Load dashboard data with fallback
    const loadDashboard = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        const defaultData = {
            totalRevenue: 0,
            totalExpense: 0,
            netProfit: 0,
            arBalance: 0,
            apBalance: 0,
            invoicesDueIn7Days: 0,
            overdueInvoices: 0,
            collectionRate: 0,
            expenseToRevenueRatio: 0,
            revenueChart: [],
            expenseChart: [],
            expenseByCategory: {},
            pendingApprovals: [],
            topCustomers: [],
        };

        try {
            // Try main dashboard endpoint first
            const data = await getAccountingDashboard({
                branchId: branchId || undefined,
                period,
            });

            if (data && typeof data === 'object') {
                setDashboardData({
                    ...defaultData,
                    ...data,
                    // Ensure numeric values
                    totalRevenue: Number(data.totalRevenue || 0),
                    totalExpense: Number(data.totalExpense || 0),
                    netProfit: Number(data.netProfit || data.totalRevenue - data.totalExpense || 0),
                    arBalance: Number(data.arBalance || 0),
                    apBalance: Number(data.apBalance || 0),
                    collectionRate: Number(data.collectionRate || 0),
                    expenseToRevenueRatio: Number(data.expenseToRevenueRatio || 0),
                });
            } else {
                setDashboardData(defaultData);
            }
        } catch (err) {
            console.error("Error loading dashboard:", err);

            // Try fallback: load individual stats
            try {
                const { getTotalRevenue, getTotalExpense, getARBalance } = await import("../../api/accounting");
                const params = { branchId: branchId || undefined, period };

                const [revenueRes, expenseRes, arRes] = await Promise.allSettled([
                    getTotalRevenue(params),
                    getTotalExpense(params),
                    getARBalance(params),
                ]);

                const revenue = revenueRes.status === 'fulfilled' ? Number(revenueRes.value?.total || revenueRes.value || 0) : 0;
                const expense = expenseRes.status === 'fulfilled' ? Number(expenseRes.value?.total || expenseRes.value || 0) : 0;
                const ar = arRes.status === 'fulfilled' ? Number(arRes.value?.total || arRes.value || 0) : 0;

                setDashboardData({
                    ...defaultData,
                    totalRevenue: revenue,
                    totalExpense: expense,
                    netProfit: revenue - expense,
                    arBalance: ar,
                });

                push("Dữ liệu dashboard được tải từ nguồn phụ", "info");
            } catch (fallbackErr) {
                console.error("Fallback also failed:", fallbackErr);
                setError("Không thể tải dữ liệu dashboard. API chưa sẵn sàng.");
                setDashboardData(defaultData);
                push("Lỗi khi tải dữ liệu dashboard", "error");
            }
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, period]);

    const loadApprovalQueue = React.useCallback(async () => {
        setQueueLoading(true);
        setQueueError("");
        try {
            // Sử dụng API riêng cho expense requests
            const response = await getPendingExpenseRequests(branchId || undefined);
            const list = Array.isArray(response)
                ? response
                : response?.data || response?.items || [];

            // Map expense requests sang format tương thích với QueueTable
            const mappedQueue = list.map((expense) => ({
                id: expense.id || expense.expenseRequestId,
                approvalType: "EXPENSE_REQUEST",
                requestedByName: expense.requesterName || expense.driverName || expense.creatorName || "—",
                requestedAt: expense.createdAt || expense.requestedAt || expense.created_at,
                details: {
                    type: expense.type || expense.expenseType || "EXPENSE",
                    amount: expense.amount || 0,
                    note: expense.note || expense.description || "",
                    requesterName: expense.requesterName || expense.driverName || expense.creatorName || "—",
                    tripId: expense.tripId || null,
                    bookingCode: expense.bookingCode || null,
                },
                branchName: expense.branchName || null,
            }));

            setApprovalQueue(mappedQueue);
        } catch (err) {
            console.error("Error loading expense requests:", err);
            setQueueError(err.message || "Không tải được hàng đợi duyệt chi phí.");
            setApprovalQueue([]);
        } finally {
            setQueueLoading(false);
        }
    }, [branchId]);

    // Load pending payment requests from drivers/consultants
    const loadPendingPayments = React.useCallback(async () => {
        setPendingPaymentsLoading(true);
        setPendingPaymentsError("");
        try {
            const payments = await getPendingPayments(branchId || undefined);
            setPendingPayments(Array.isArray(payments) ? payments : []);
        } catch (err) {
            console.error("Error loading pending payments:", err);
            setPendingPaymentsError(err.message || "Không tải được yêu cầu thanh toán.");
            setPendingPayments([]);
        } finally {
            setPendingPaymentsLoading(false);
        }
    }, [branchId]);

    // Load dashboard on mount and when filters change
    React.useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    React.useEffect(() => {
        loadApprovalQueue();
    }, [loadApprovalQueue]);

    React.useEffect(() => {
        loadPendingPayments();
    }, [loadPendingPayments]);

    // Filter pending approvals
    const filteredQueue = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return (approvalQueue || []).filter((item) => {
            const details = item.details || {};
            const rawType = (details.type || "EXPENSE").toUpperCase();
            const typeMatch =
                !typeFilter ||
                rawType === typeFilter ||
                (typeFilter === "EXPENSE" && rawType !== "INCOME");
            const haystack = [
                details.requesterName || item.requestedByName || "",
                TYPE_LABEL[rawType] || rawType,
                details.note || "",
                item.branchName || "",
            ]
                .join(" ")
                .toLowerCase();
            const searchMatch = !q || haystack.includes(q);
            return typeMatch && searchMatch;
        });
    }, [approvalQueue, query, typeFilter]);

    const approveOne = React.useCallback(
        async (expenseRequestId) => {
            try {
                console.log("[AccountantDashboard] Approving expense request:", expenseRequestId);
                await approveExpenseRequest(expenseRequestId);
                push(`Đã duyệt yêu cầu chi phí #${expenseRequestId}`, "success");
                // Reload both dashboard and queue
                loadApprovalQueue();
                loadDashboard();
            } catch (err) {
                console.error("Approve expense request failed:", err);
                const errorMsg = err?.response?.data?.message || err.message || "Không thể duyệt yêu cầu";
                push(errorMsg, "error");
            }
        },
        [loadApprovalQueue, loadDashboard, push]
    );

    const rejectOne = React.useCallback(
        async (expenseRequestId, reason) => {
            try {
                console.log("[AccountantDashboard] Rejecting expense request:", expenseRequestId, reason);
                await rejectExpenseRequest(expenseRequestId, reason || "");
                push(`Đã từ chối yêu cầu chi phí #${expenseRequestId}${reason ? " · " + reason : ""}`, "info");
                // Reload both dashboard and queue
                loadApprovalQueue();
                loadDashboard();
            } catch (err) {
                console.error("Reject expense request failed:", err);
                const errorMsg = err?.response?.data?.message || err.message || "Không thể từ chối yêu cầu";
                push(errorMsg, "error");
            }
        },
        [loadApprovalQueue, loadDashboard, push]
    );

    // Handle payment confirmation request (show popup first)
    const handlePaymentConfirmClick = React.useCallback(
        (paymentId, status, paymentInfo) => {
            setPaymentConfirm({
                open: true,
                paymentId,
                status,
                paymentInfo,
            });
        },
        []
    );

    // Confirm/Reject payment request from driver/consultant (after popup confirmation)
    const confirmPaymentRequest = React.useCallback(
        async (paymentId, status) => {
            try {
                console.log("[AccountantDashboard] Confirming payment:", paymentId, status);
                await confirmPayment(paymentId, status);
                push(`${status === "CONFIRMED" ? "Đã xác nhận nhận tiền" : "Đã đánh dấu chưa nhận được tiền"}`, "success");
                // Reload pending payments and dashboard
                loadPendingPayments();
                loadDashboard();
                // Close modal
                setPaymentConfirm({
                    open: false,
                    paymentId: null,
                    status: null,
                    paymentInfo: null,
                });
            } catch (err) {
                console.error("Confirm payment failed:", err);
                const errorMsg = err?.response?.data?.message || err.message || "Không thể xử lý yêu cầu thanh toán";
                push(errorMsg, "error");
            }
        },
        [loadPendingPayments, loadDashboard, push]
    );

    // Transform chart data from API
    const chartData = React.useMemo(() => {
        const revenueChart = dashboardData.revenueChart || [];
        const expenseChart = dashboardData.expenseChart || [];

        // Combine revenue and expense by month (group daily data by month)
        const dateMap = {};

        // Process revenue data - accumulate by month
        revenueChart.forEach((item) => {
            if (!item || !item.date) return;
            try {
                // Parse date (format: YYYY-MM-DD)
                const dateStr = item.date.toString();
                const month = dateStr.length >= 7 ? dateStr.substring(5, 7) : "01";
                if (!dateMap[month]) {
                    dateMap[month] = { month, revenue: 0, expense: 0 };
                }
                // Accumulate revenue (convert to millions)
                dateMap[month].revenue += Number(item.value || 0) / 1000000;
            } catch (e) {
                console.warn("Error parsing revenue date:", item.date, e);
            }
        });

        // Process expense data - accumulate by month
        expenseChart.forEach((item) => {
            if (!item || !item.date) return;
            try {
                // Parse date (format: YYYY-MM-DD)
                const dateStr = item.date.toString();
                const month = dateStr.length >= 7 ? dateStr.substring(5, 7) : "01";
                if (!dateMap[month]) {
                    dateMap[month] = { month, revenue: 0, expense: 0 };
                }
                // Accumulate expense (convert to millions)
                dateMap[month].expense += Number(item.value || 0) / 1000000;
            } catch (e) {
                console.warn("Error parsing expense date:", item.date, e);
            }
        });

        // Generate months array - only show months that have data or current month
        const currentMonth = new Date().getMonth() + 1;
        const currentMonthStr = String(currentMonth).padStart(2, '0');
        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

        // If we have data, use all months, otherwise show last 6 months
        const hasData = Object.keys(dateMap).length > 0;
        const monthsToShow = hasData
            ? months
            : months.slice(Math.max(0, currentMonth - 6), currentMonth);

        const result = monthsToShow.map((m) => {
            if (dateMap[m]) {
                return {
                    month: m,
                    revenue: Number(dateMap[m].revenue.toFixed(2)),
                    expense: Number(dateMap[m].expense.toFixed(2))
                };
            }
            return { month: m, revenue: 0, expense: 0 };
        });

        return result.length > 0 ? result : [{ month: currentMonthStr, revenue: 0, expense: 0 }];
    }, [dashboardData.revenueChart, dashboardData.expenseChart]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            {/* Toasts */}
            <Toasts toasts={toasts} />

            {/* HEADER giống vibe AdminBranchListPage */}
            <div className="flex flex-wrap items-start gap-4 mb-5">
                {/* Left block: icon + title + desc */}
                <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                        <BarChart3 className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col">
                        <div className="text-[11px] text-slate-500 leading-none mb-1">
                            Kế toán / Tài chính
                        </div>

                        <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                            Dashboard Kế toán
                        </h1>

                        <p className="text-slate-500 text-[13px]">
                            Doanh thu · Chi phí · Công
                            nợ · Yêu cầu chi phí chờ
                            duyệt
                        </p>
                    </div>
                </div>

                {/* Right block: filters + refresh */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                    {/* Period */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                        <CalendarRange className="h-4 w-4 text-slate-500" />
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

                    {/* Chi nhánh - Accountant chỉ xem chi nhánh của mình */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <select
                            value={branchId || ""}
                            onChange={(e) => {
                                if (branchLocked) return; // Không cho đổi nếu đã khóa
                                const val = e.target.value;
                                setBranchId(val ? Number(val) : null);
                            }}
                            disabled={branchLocked}
                            className={cls(
                                "bg-transparent outline-none text-[13px]",
                                branchLocked ? "text-slate-500 cursor-not-allowed" : "text-slate-900"
                            )}
                        >
                            {!branchLocked && <option value="">Tất cả chi nhánh</option>}
                            {branches.map((b) => (
                                <option key={b.branchId} value={b.branchId}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw
                            className={cls(
                                "h-4 w-4 text-slate-500",
                                loading ? "animate-spin" : ""
                            )}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
                    <Info className="h-4 w-4 text-rose-500" />
                    <span>{error}</span>
                    <button
                        onClick={loadDashboard}
                        className="ml-auto text-rose-600 hover:underline text-xs font-medium"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* TOP SECTION: Chart (left) + KPIs (right) */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-5">
                {/* Biểu đồ Doanh thu vs Chi phí */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                        <BadgeDollarSign className="h-4 w-4 text-primary-600" />
                        <span className="font-medium text-slate-700">
                            Doanh thu vs Chi phí
                            (tháng)
                        </span>
                        {loading && (
                            <RefreshCw className="h-3.5 w-3.5 text-slate-400 animate-spin ml-auto" />
                        )}
                    </div>
                    <div className="p-3">
                        {initialLoading ? (
                            <div className="h-[250px] flex items-center justify-center text-slate-400">
                                <RefreshCw className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <RevExpChart data={chartData} />
                        )}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-rows-3 gap-5">
                    <KpiCard
                        title="Công nợ phải thu (A/R)"
                        value={Number(dashboardData.arBalance || 0)}
                        delta={dashboardData.collectionRate ? Number(dashboardData.collectionRate) : 0}
                        up={true}
                    />
                    <KpiCard
                        title="Tổng chi phí"
                        value={Number(dashboardData.totalExpense || 0)}
                        delta={0}
                        up={false}
                    />
                    <KpiCard
                        title="Tổng doanh thu"
                        value={Number(dashboardData.totalRevenue || 0)}
                        delta={dashboardData.collectionRate ? Number(dashboardData.collectionRate) : 0}
                        up={true}
                    />
                </div>
            </div>

            {/* QUEUE CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* header của queue */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-primary-600" />
                        <div className="font-medium text-slate-700">
                            Yêu cầu chi phí
                            chờ duyệt
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {filteredQueue.length}{" "}
                            mục
                        </div>
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {/* search box */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                            <Search className="h-4 w-4 text-slate-500" />
                            <input
                                value={
                                    query
                                }
                                onChange={(
                                    e
                                ) =>
                                    setQuery(
                                        e
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Tìm người tạo / loại / mã chuyến"
                                className="bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400"
                            />
                        </div>

                        {/* filter loại */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-sm">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <select
                                value={
                                    typeFilter
                                }
                                onChange={(
                                    e
                                ) =>
                                    setTypeFilter(
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
                                </option>
                                <option value="INCOME">Thu</option>
                                <option value="EXPENSE">Chi</option>
                                {Object.entries(
                                    TYPE_LABEL
                                )
                                    .filter(([k]) => k !== "INCOME" && k !== "EXPENSE")
                                    .map(
                                        ([
                                             v,
                                             l,
                                         ]) => (
                                            <option
                                                key={
                                                    v
                                                }
                                                value={
                                                    v
                                                }
                                            >
                                                {
                                                    l
                                                }
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>
                    </div>
                </div>

                {/* bảng queue */}
                {queueLoading ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        Đang tải dữ liệu...
                    </div>
                ) : queueError ? (
                    <div className="px-4 py-8 text-center text-rose-600 text-sm">
                        {queueError}
                        <button
                            onClick={loadApprovalQueue}
                            className="ml-2 text-sky-600 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : (
                    <QueueTable
                        items={filteredQueue.map((item) => {
                            const details = item.details || {};
                            return {
                                id: item.id,
                                creator: details.requesterName || item.requestedByName || "—",
                                type: (details.type || "EXPENSE").toUpperCase(),
                                amount: Number(details.amount || 0),
                                trip: item.branchName || "—",
                                created_at: fmtDateTime(item.requestedAt || item.createdAt),
                                note: details.note || item.requestReason || "",
                            };
                        })}
                        onApprove={approveOne}
                        onReject={rejectOne}
                    />
                )}

                {/* footer note */}
                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                    Yêu cầu chi phí chờ duyệt: {approvalQueue.length} mục.
                    HĐ đến hạn 7 ngày: {dashboardData.invoicesDueIn7Days || 0}.
                    HĐ quá hạn: {dashboardData.overdueInvoices || 0}.
                </div>
            </div>

            {/* PENDING PAYMENT REQUESTS CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mt-5">
                {/* header */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-sm text-slate-600 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-sky-600" />
                        <div className="font-medium text-slate-700">
                            Yêu cầu thanh toán chờ xác nhận
                        </div>
                        {pendingPayments.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-500 text-white">
                                {pendingPayments.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={loadPendingPayments}
                        disabled={pendingPaymentsLoading}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cls("h-3.5 w-3.5", pendingPaymentsLoading ? "animate-spin" : "")} />
                        Làm mới
                    </button>
                </div>

                {/* content */}
                {pendingPaymentsLoading ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Đang tải...
                    </div>
                ) : pendingPaymentsError ? (
                    <div className="px-4 py-8 text-center text-rose-600 text-sm">
                        {pendingPaymentsError}
                        <button
                            onClick={loadPendingPayments}
                            className="ml-2 text-sky-600 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : pendingPayments.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                        <div className="text-sm font-medium text-slate-700">Không có yêu cầu thanh toán nào đang chờ</div>
                        <div className="text-xs text-slate-500 mt-1">Tất cả yêu cầu đã được xử lý</div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {pendingPayments.map((payment, idx) => (
                            <div key={`pending-payment-${payment.paymentId}-${idx}`} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-lg font-bold text-slate-900 tabular-nums">
                                                {fmtVND(payment.amount || 0)} đ
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-info-50 text-info-700 border border-info-300">
                                                <Clock className="h-3 w-3" />
                                                Chờ xác nhận
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-500">Hóa đơn:</span>
                                                <span className="text-slate-900">{payment.invoiceNumber || `INV-${payment.invoiceId}`}</span>
                                                {payment.customerName && (
                                                    <span className="text-slate-500">· {payment.customerName}</span>
                                                )}
                                            </div>
                                            {payment.bookingCode && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-500">Mã đơn:</span>
                                                    <span>{payment.bookingCode}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-500">Phương thức:</span>
                                                <span>{payment.paymentMethod === "CASH" ? "Tiền mặt" : payment.paymentMethod === "TRANSFER" ? "Chuyển khoản" : payment.paymentMethod || "—"}</span>
                                            </div>
                                            {payment.paymentDate && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-500">Thời gian:</span>
                                                    <span>{fmtDateTime(payment.paymentDate)}</span>
                                                </div>
                                            )}
                                            {payment.note && (
                                                <div className="mt-1 text-xs text-slate-500 italic">
                                                    "{payment.note}"
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handlePaymentConfirmClick(payment.paymentId, "CONFIRMED", payment)}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Đã nhận
                                        </button>
                                        <button
                                            onClick={() => handlePaymentConfirmClick(payment.paymentId, "REJECTED", payment)}
                                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Chưa nhận được
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* footer note */}
                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                    Xác thực tiền đã nhận từ tài xế/tư vấn viên. Chọn "Đã nhận" để ghi nhận số tiền vào hóa đơn.
                </div>
            </div>

            {/* Payment Confirmation Modal */}
            <ConfirmModal
                open={paymentConfirm.open}
                title={
                    paymentConfirm.status === "CONFIRMED"
                        ? "Xác nhận đã nhận tiền"
                        : "Xác nhận chưa nhận được tiền"
                }
                message={
                    paymentConfirm.paymentInfo ? (
                        <div className="space-y-2">
                            <div className="font-semibold text-slate-900">
                                {paymentConfirm.status === "CONFIRMED"
                                    ? "Bạn có chắc chắn đã nhận đủ số tiền này?"
                                    : "Bạn có chắc chắn muốn đánh dấu 'CHƯA NHẬN ĐƯỢC' cho khoản thanh toán này?"}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Số tiền:</span>
                                    <span className="font-semibold text-slate-900">
                                        {fmtVND(paymentConfirm.paymentInfo.amount || 0)} đ
                                    </span>
                                </div>
                                {paymentConfirm.paymentInfo.invoiceNumber && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Hóa đơn:</span>
                                        <span className="text-slate-900">
                                            {paymentConfirm.paymentInfo.invoiceNumber || `INV-${paymentConfirm.paymentInfo.invoiceId}`}
                                        </span>
                                    </div>
                                )}
                                {paymentConfirm.paymentInfo.bookingCode && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Mã đơn:</span>
                                        <span className="text-slate-900">{paymentConfirm.paymentInfo.bookingCode}</span>
                                    </div>
                                )}
                                {paymentConfirm.paymentInfo.paymentMethod && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Phương thức:</span>
                                        <span className="text-slate-900">
                                            {paymentConfirm.paymentInfo.paymentMethod === "CASH"
                                                ? "Tiền mặt"
                                                : paymentConfirm.paymentInfo.paymentMethod === "TRANSFER"
                                                    ? "Chuyển khoản"
                                                    : paymentConfirm.paymentInfo.paymentMethod === "QR"
                                                        ? "QR Code"
                                                        : paymentConfirm.paymentInfo.paymentMethod}
                                        </span>
                                    </div>
                                )}
                                {paymentConfirm.paymentInfo.note && (
                                    <div className="pt-1">
                                        <span className="text-slate-600">Ghi chú: </span>
                                        <span className="text-slate-700 italic">"{paymentConfirm.paymentInfo.note}"</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        paymentConfirm.status === "CONFIRMED"
                            ? "Bạn có chắc chắn đã nhận đủ số tiền này và muốn xác nhận 'ĐÃ NHẬN'?"
                            : "Bạn có chắc chắn muốn đánh dấu 'CHƯA NHẬN ĐƯỢC' cho khoản thanh toán này?"
                    )
                }
                requireReason={false}
                onCancel={() =>
                    setPaymentConfirm({
                        open: false,
                        paymentId: null,
                        status: null,
                        paymentInfo: null,
                    })
                }
                onConfirm={() => {
                    if (paymentConfirm.paymentId && paymentConfirm.status) {
                        confirmPaymentRequest(paymentConfirm.paymentId, paymentConfirm.status);
                    }
                }}
            />
        </div>
    );
}
