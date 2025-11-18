import React from "react";
import {
    FilePlus2,
    Search,
    Filter,
    RefreshCw,
    Mail,
    FileDown,
    BadgeDollarSign,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
} from "lucide-react";

import DepositModal from "./DepositModal.jsx";

/* ===== Helpers / constants ===== */
const BRAND_COLOR = "#0079BC";

const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    );

const cls = (...a) => a.filter(Boolean).join(" ");

const STATUS = {
    UNPAID: "UNPAID",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
};

const STATUS_LABEL = {
    UNPAID: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    OVERDUE: "Quá hạn",
};

/* trạng thái hóa đơn */
function StatusBadge({ status }) {
    const map = {
        UNPAID:
            "bg-amber-50 text-amber-700 border-amber-300",
        PAID: "bg-emerald-50 text-emerald-700 border-emerald-300",
        OVERDUE:
            "bg-rose-50 text-rose-700 border-rose-300",
    };
    return (
        <span
            className={cls(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                map[status] ||
                "bg-gray-100 text-gray-700 border-gray-300"
            )}
        >
            {STATUS_LABEL[status] || status}
        </span>
    );
}

/* ===== Toast mini ===== */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (
        msg,
        kind = "info",
        ttl = 2400
    ) => {
        const id = Math.random()
            .toString(36)
            .slice(2);
        setToasts((a) => [
            ...a,
            { id, msg, kind },
        ]);
        setTimeout(() => {
            setToasts((a) =>
                a.filter(
                    (t) => t.id !== id
                )
            );
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
                        "rounded-lg px-3 py-2 text-sm shadow border min-w-[220px] bg-white text-gray-800 border-gray-200",
                        t.kind ===
                        "success" &&
                        "bg-emerald-50 border-emerald-400 text-emerald-700",
                        t.kind ===
                        "error" &&
                        "bg-rose-50 border-rose-400 text-rose-700",
                        t.kind ===
                        "info" &&
                        "bg-white border-gray-200 text-gray-800"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* ===== Modal tạo HĐ từ đơn hàng hoàn thành ===== */
function CreateInvoiceModal({
                                open,
                                orders,
                                onCancel,
                                onCreate,
                            }) {
    const [selected, setSelected] =
        React.useState(null);
    const [q, setQ] = React.useState("");

    React.useEffect(() => {
        if (!open) {
            setSelected(null);
            setQ("");
        }
    }, [open]);

    if (!open) return null;

    const list = (orders || []).filter(
        (o) =>
            !q.trim() ||
            (
                o.code +
                " " +
                o.customer
            )
                .toLowerCase()
                .includes(
                    q
                        .trim()
                        .toLowerCase()
                )
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-2xl rounded-xl bg-white border border-gray-200 text-gray-900 shadow-xl"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
                    <FilePlus2
                        className="h-5 w-5"
                        style={{
                            color: BRAND_COLOR,
                        }}
                    />
                    <div className="font-semibold text-gray-900">
                        Tạo hóa đơn từ
                        đơn hàng hoàn
                        thành
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Search box */}
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 w-full shadow-sm">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) =>
                                setQ(
                                    e
                                        .target
                                        .value
                                )
                            }
                            placeholder="Tìm theo mã đơn / khách hàng"
                            className="bg-transparent outline-none text-sm placeholder:text-gray-400 text-gray-800 w-full"
                        />
                    </div>

                    {/* Table of completed orders */}
                    <div className="max-h-[360px] overflow-y-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 w-10" />
                                <th className="px-3 py-2 text-left font-medium">
                                    Mã
                                    đơn
                                </th>
                                <th className="px-3 py-2 text-left font-medium">
                                    Khách
                                    hàng
                                </th>
                                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                    Tổng
                                    tiền
                                </th>
                                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                                    Hoàn
                                    thành lúc
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {list.map(
                                (
                                    o
                                ) => (
                                    <tr
                                        key={
                                            o.id
                                        }
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-3 py-2">
                                            <input
                                                type="radio"
                                                name="order"
                                                checked={
                                                    selected ===
                                                    o.id
                                                }
                                                onChange={() =>
                                                    setSelected(
                                                        o.id
                                                    )
                                                }
                                                className="accent-[#0079BC]"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-gray-900 font-medium">
                                            {
                                                o.code
                                            }
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">
                                            {
                                                o.customer
                                            }
                                        </td>
                                        <td className="px-3 py-2 tabular-nums font-semibold text-gray-900">
                                            {fmtVND(
                                                o.total
                                            )}{" "}
                                            đ
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                            {
                                                o.completed_at
                                            }
                                        </td>
                                    </tr>
                                )
                            )}

                            {list.length ===
                                0 && (
                                    <tr>
                                        <td
                                            colSpan={
                                                5
                                            }
                                            className="px-3 py-8 text-center text-gray-500 text-sm"
                                        >
                                            Không
                                            có
                                            đơn
                                            phù
                                            hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                    <button
                        onClick={
                            onCancel
                        }
                        className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium shadow-sm"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={() =>
                            selected &&
                            onCreate(
                                selected
                            )
                        }
                        disabled={
                            !selected
                        }
                        className={cls(
                            "rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-1 hover:brightness-110",
                            !selected
                                ? "bg-gray-300 cursor-not-allowed"
                                : ""
                        )}
                        style={
                            !selected
                                ? undefined
                                : {
                                    backgroundColor:
                                    BRAND_COLOR,
                                    borderColor:
                                    BRAND_COLOR,
                                }
                        }
                    >
                        Tạo hóa
                        đơn
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===== Toolbar ===== */
function Toolbar({
                     query,
                     setQuery,
                     statusFilter,
                     setStatusFilter,
                     onCreateClick,
                     onRefresh,
                     onExportCsv,
                     loading,
                     debtMode,
                     toggleDebtMode,
                 }) {
    return (
        <div className="flex flex-wrap items-center gap-3 w-full">
            {/* nút tạo hóa đơn (ẩn khi ở công nợ) */}
            {!debtMode && (
                <button
                    onClick={
                        onCreateClick
                    }
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-1 hover:brightness-110"
                    style={{
                        backgroundColor:
                        BRAND_COLOR,
                        borderColor:
                        BRAND_COLOR,
                    }}
                >
                    <FilePlus2
                        className="h-4 w-4"
                        style={{
                            color: "white",
                        }}
                    />
                    <span>
                        Tạo hóa đơn
                    </span>
                </button>
            )}

            {/* Toggle chế độ công nợ */}
            <button
                onClick={
                    toggleDebtMode
                }
                className="rounded-lg border px-3 py-2 text-sm font-medium flex items-center gap-1 bg-white hover:bg-gray-50 shadow-sm"
                style={{
                    borderColor:
                    BRAND_COLOR,
                    color: BRAND_COLOR,
                }}
            >
                <BadgeDollarSign
                    className="h-4 w-4"
                    style={{
                        color: BRAND_COLOR,
                    }}
                />
                <span>
                    {debtMode
                        ? "Đang ở chế độ Công nợ"
                        : "Chế độ công nợ"}
                </span>
            </button>

            {/* spacer */}
            <div className="ml-auto" />

            {/* search */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) =>
                        setQuery(
                            e.target
                                .value
                        )
                    }
                    placeholder="Tìm số HĐ / khách hàng / mã đơn"
                    className="bg-transparent outline-none text-sm placeholder:text-gray-400 text-gray-800"
                />
            </div>

            {/* trạng thái filter (tắt khi công nợ) */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                    value={
                        statusFilter
                    }
                    disabled={
                        debtMode
                    }
                    onChange={(e) =>
                        setStatusFilter(
                            e.target
                                .value
                        )
                    }
                    className={cls(
                        "bg-transparent outline-none text-sm text-gray-800 disabled:text-gray-400"
                    )}
                >
                    <option value="">
                        Tất cả trạng
                        thái
                    </option>
                    <option value="UNPAID">
                        Chưa thanh
                        toán
                    </option>
                    <option value="PAID">
                        Đã thanh
                        toán
                    </option>
                    <option value="OVERDUE">
                        Quá hạn
                    </option>
                </select>
            </div>

            {/* export CSV */}
            <button
                onClick={
                    onExportCsv
                }
                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium shadow-sm flex items-center gap-1"
            >
                <FileDown className="h-4 w-4 text-gray-500" />
                <span>CSV</span>
            </button>

            {/* refresh */}
            <button
                onClick={
                    onRefresh
                }
                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium shadow-sm flex items-center gap-1"
            >
                <RefreshCw
                    className={cls(
                        "h-4 w-4 text-gray-500",
                        loading
                            ? "animate-spin"
                            : ""
                    )}
                />
                <span>
                    Làm mới
                </span>
            </button>
        </div>
    );
}

/* ===== InvoiceTable ===== */
function InvoiceTable({
                          items,
                          onRecordPayment,
                          onSendInvoice,
                          onExportPdf,
                      }) {
    const [page, setPage] =
        React.useState(1);
    const [pageSize, setPageSize] =
        React.useState(10);
    const [sortKey, setSortKey] =
        React.useState(
            "created_at"
        );
    const [sortDir, setSortDir] =
        React.useState("desc");

    const sorted = React.useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => {
            let A, B;
            if (
                sortKey ===
                "invoice_no"
            ) {
                A = a.invoice_no;
                B = b.invoice_no;
            } else if (
                sortKey ===
                "customer"
            ) {
                A = a.customer;
                B = b.customer;
            } else if (
                sortKey ===
                "order_code"
            ) {
                A = a.order_code;
                B = b.order_code;
            } else if (
                sortKey ===
                "total"
            ) {
                A = a.total;
                B = b.total;
            } else if (
                sortKey ===
                "paid"
            ) {
                A = a.paid;
                B = b.paid;
            } else if (
                sortKey ===
                "balance"
            ) {
                A =
                    a.total -
                    a.paid;
                B =
                    b.total -
                    b.paid;
            } else if (
                sortKey ===
                "status"
            ) {
                A = a.status;
                B = b.status;
            } else if (
                sortKey ===
                "due_at"
            ) {
                A = a.due_at || "";
                B = b.due_at || "";
            } else {
                A = a.created_at;
                B = b.created_at;
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
        items,
        sortKey,
        sortDir,
    ]);

    const totalPages =
        Math.max(
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
            className="px-3 py-2 font-medium cursor-pointer select-none text-gray-600 whitespace-nowrap text-xs sm:text-[13px]"
            onClick={() => {
                if (
                    sortKey ===
                    key
                )
                    setSortDir(
                        (
                            d
                        ) =>
                            d ===
                            "asc"
                                ? "desc"
                                : "asc"
                    );
                else {
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
                        <ChevronUp className="h-3 w-3 text-gray-500" />
                    ) : (
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                    )
                ) : null}
            </span>
        </th>
    );

    return (
        <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <tr>
                    {headerCell(
                        "invoice_no",
                        "Số hóa đơn"
                    )}
                    {headerCell(
                        "customer",
                        "Tên khách hàng"
                    )}
                    {headerCell(
                        "order_code",
                        "Mã đơn hàng"
                    )}
                    {headerCell(
                        "total",
                        "Tổng tiền"
                    )}
                    {headerCell(
                        "paid",
                        "Đã thanh toán"
                    )}
                    {headerCell(
                        "balance",
                        "Còn lại"
                    )}
                    {headerCell(
                        "due_at",
                        "Hạn TT"
                    )}
                    {headerCell(
                        "status",
                        "Trạng thái"
                    )}
                    <th className="px-3 py-2 font-medium text-gray-600 text-xs sm:text-[13px] whitespace-nowrap">
                        Hành động
                    </th>
                </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                {current.map(
                    (iv) => {
                        const balance =
                            Math.max(
                                0,
                                (iv.total ||
                                    0) -
                                (iv.paid ||
                                    0)
                            );
                        return (
                            <tr
                                key={
                                    iv.id
                                }
                                className="hover:bg-gray-50"
                            >
                                <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                                    {
                                        iv.invoice_no
                                    }
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-800">
                                    {
                                        iv.customer
                                    }
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-800">
                                    {
                                        iv.order_code
                                    }
                                </td>
                                <td className="px-3 py-2 text-sm font-semibold tabular-nums text-gray-900">
                                    {fmtVND(
                                        iv.total
                                    )}{" "}
                                    đ
                                </td>
                                <td className="px-3 py-2 text-sm tabular-nums text-gray-800">
                                    {fmtVND(
                                        iv.paid
                                    )}{" "}
                                    đ
                                </td>
                                <td className="px-3 py-2 text-sm tabular-nums text-gray-800">
                                    {fmtVND(
                                        balance
                                    )}{" "}
                                    đ
                                </td>
                                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">
                                    {iv.due_at ||
                                        "—"}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                    <StatusBadge status={iv.status} />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                        {/* Ghi nhận thanh toán */}
                                        <button
                                            onClick={() =>
                                                onRecordPayment(
                                                    iv
                                                )
                                            }
                                            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                        >
                                            <BadgeDollarSign className="h-3.5 w-3.5 text-gray-500" />
                                            <span>
                                                    Ghi
                                                    nhận
                                                </span>
                                        </button>

                                        {/* Gửi HĐ qua email */}
                                        <button
                                            onClick={() =>
                                                onSendInvoice(
                                                    iv
                                                )
                                            }
                                            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                        >
                                            <Mail className="h-3.5 w-3.5 text-gray-500" />
                                            <span>
                                                    Gửi
                                                    HĐ
                                                </span>
                                        </button>

                                        {/* Xuất PDF */}
                                        <button
                                            onClick={() =>
                                                onExportPdf(
                                                    iv
                                                )
                                            }
                                            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                        >
                                            <FileDown className="h-3.5 w-3.5 text-gray-500" />
                                            <span>
                                                    PDF
                                                </span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    }
                )}

                {current.length ===
                    0 && (
                        <tr>
                            <td
                                colSpan={
                                    9
                                }
                                className="px-3 py-6 text-center text-gray-500 text-sm"
                            >
                                Không
                                có hóa
                                đơn
                                nào.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 border-t border-gray-200 bg-white">
                <PaginationInfo
                    page={page}
                    totalPages={
                        totalPages
                    }
                    onPrev={() =>
                        setPage(
                            Math.max(
                                1,
                                page -
                                1
                            )
                        )
                    }
                    onNext={() =>
                        setPage(
                            Math.min(
                                totalPages,
                                page +
                                1
                            )
                        )
                    }
                    pageSize={
                        pageSize
                    }
                    setPageSize={(
                        n
                    ) => {
                        setPageSize(
                            n
                        );
                        setPage(
                            1
                        );
                    }}
                />

                <div className="text-xs text-gray-600">
                    Tổng:{" "}
                    {fmtVND(
                        items.reduce(
                            (
                                s,
                                it
                            ) =>
                                s +
                                Number(
                                    it.total ||
                                    0
                                ),
                            0
                        )
                    )}{" "}
                    đ
                </div>
            </div>
        </div>
    );
}

/* ===== PaginationInfo ===== */
function PaginationInfo({
                            page,
                            totalPages,
                            onPrev,
                            onNext,
                            pageSize,
                            setPageSize,
                        }) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <button
                disabled={page <= 1}
                onClick={onPrev}
                className={cls(
                    "rounded-lg border px-2 py-1.5 bg-white text-gray-700 shadow-sm hover:bg-gray-50 flex items-center justify-center",
                    page <= 1
                        ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                        : "border-gray-300"
                )}
            >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>

            <div className="text-gray-700 text-sm">
                Trang{" "}
                <span className="font-medium">
                    {page}
                </span>
                /
                <span className="font-medium">
                    {totalPages}
                </span>
            </div>

            <button
                disabled={
                    page >=
                    totalPages
                }
                onClick={
                    onNext
                }
                className={cls(
                    "rounded-lg border px-2 py-1.5 bg-white text-gray-700 shadow-sm hover:bg-gray-50 flex items-center justify-center",
                    page >=
                    totalPages
                        ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                        : "border-gray-300"
                )}
            >
                <ChevronRight className="h-4 w-4 text-gray-500" />
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
                }}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-sm outline-none hover:bg-gray-50"
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
                            className="text-gray-800"
                        >
                            {
                                n
                            }
                            /trang
                        </option>
                    )
                )}
            </select>
        </div>
    );
}

/* ===== CSV export ===== */
function exportCSV(invoices) {
    const header = [
        "invoice_no",
        "customer",
        "order_code",
        "total",
        "paid",
        "balance",
        "status",
        "created_at",
        "due_at",
    ].join(",");

    const rows =
        invoices.map((iv) =>
            [
                JSON.stringify(
                    iv.invoice_no ||
                    ""
                ),
                JSON.stringify(
                    iv.customer ||
                    ""
                ),
                JSON.stringify(
                    iv.order_code ||
                    ""
                ),
                iv.total || 0,
                iv.paid || 0,
                Math.max(
                    0,
                    (iv.total ||
                        0) -
                    (iv.paid ||
                        0)
                ),
                JSON.stringify(
                    iv.status ||
                    ""
                ),
                JSON.stringify(
                    iv.created_at ||
                    ""
                ),
                JSON.stringify(
                    iv.due_at ||
                    ""
                ),
            ].join(",")
        );

    const EOL = "\r\n";
    const csv = [header, ...rows].join(
        EOL
    );

    // BOM để Excel hiểu UTF-8 tiếng Việt
    const blob = new Blob(
        ["\uFEFF" + csv],
        {
            type: "text/csv;charset=utf-8;",
        }
    );
    const url = URL.createObjectURL(
        blob
    );
    const a =
        document.createElement(
            "a"
        );
    a.href = url;
    a.download =
        "invoices-" +
        Date.now() +
        ".csv";
    document.body.appendChild(
        a
    );
    a.click();
    a.remove();
    URL.revokeObjectURL(
        url
    );
}

/* ===== demo đơn hàng hoàn thành để tạo hóa đơn ===== */
const COMPLETED_ORDERS = [
    {
        id: 701,
        code: "ORD-705",
        customer: "Công ty A",
        total: 2_400_000,
        completed_at:
            "2025-10-21 15:20",
    },
    {
        id: 702,
        code: "ORD-706",
        customer: "Công ty E",
        total: 7_100_000,
        completed_at:
            "2025-10-22 11:05",
    },
    {
        id: 703,
        code: "ORD-707",
        customer: "Công ty F",
        total: 4_350_000,
        completed_at:
            "2025-10-23 10:40",
    },
];

/* ===== logic ưu tiên công nợ =====
   OVERDUE trước UNPAID; sau đó due_at cũ nhất lên trước
*/
function sortDebtPriority(list) {
    const rank = (s) =>
        s === STATUS.OVERDUE
            ? 0
            : s === STATUS.UNPAID
                ? 1
                : 2;
    return [...list].sort(
        (a, b) => {
            const rA = rank(
                a.status
            );
            const rB = rank(
                b.status
            );
            if (rA !== rB)
                return (
                    rA - rB
                );
            const dA = a.due_at
                ? new Date(
                    a.due_at
                ).getTime()
                : Infinity;
            const dB = b.due_at
                ? new Date(
                    b.due_at
                ).getTime()
                : Infinity;
            return (
                dA - dB
            );
        }
    );
}

/* ===== Main Page ===== */
export default function InvoiceManagement() {
    const { toasts, push } =
        useToasts();

    const [loading, setLoading] =
        React.useState(false);
    const [query, setQuery] =
        React.useState("");
    const [
        statusFilter,
        setStatusFilter,
    ] = React.useState("");
    const [createOpen, setCreateOpen] =
        React.useState(false);
    const [invoices, setInvoices] =
        React.useState(
            DEMO_INVOICES
        );

    // modal thanh toán (DepositModal)
    const [depositOpen, setDepositOpen] =
        React.useState(false);
    const [
        depositCtx,
        setDepositCtx,
    ] = React.useState(null);
    const [
        depositTotals,
        setDepositTotals,
    ] = React.useState({
        total: 0,
        paid: 0,
    });

    // chế độ công nợ
    const [
        debtMode,
        setDebtMode,
    ] = React.useState(false);
    const toggleDebtMode = () =>
        setDebtMode(
            (v) => !v
        );

    // lọc data (và sort ưu tiên công nợ)
    const filtered =
        React.useMemo(
            () => {
                const q =
                    query
                        .trim()
                        .toLowerCase();

                let base =
                    invoices.filter(
                        (
                            iv
                        ) =>
                            !q
                                ? true
                                : (
                                    iv.invoice_no +
                                    " " +
                                    iv.customer +
                                    " " +
                                    iv.order_code
                                )
                                    .toLowerCase()
                                    .includes(
                                        q
                                    )
                    );

                if (
                    debtMode
                ) {
                    base =
                        base.filter(
                            (
                                iv
                            ) =>
                                iv.status ===
                                STATUS.UNPAID ||
                                iv.status ===
                                STATUS.OVERDUE
                        );
                    base =
                        sortDebtPriority(
                            base
                        );
                } else if (
                    statusFilter
                ) {
                    base =
                        base.filter(
                            (
                                iv
                            ) =>
                                iv.status ===
                                statusFilter
                        );
                }

                return base;
            },
            [
                invoices,
                query,
                statusFilter,
                debtMode,
            ]
        );

    const onRefresh =
        () => {
            setLoading(
                true
            );
            setTimeout(
                () => {
                    setLoading(
                        false
                    );
                    push(
                        debtMode
                            ? "Đã đồng bộ công nợ (demo)"
                            : "Đã làm mới danh sách hóa đơn (demo)",
                        "info"
                    );
                },
                500
            );
        };

    const onExportCsv =
        () => {
            exportCSV(
                filtered
            );
            push(
                debtMode
                    ? "Đã export CSV công nợ"
                    : "Đã export CSV hóa đơn",
                "info"
            );
        };

    const onCreateClick =
        () =>
            setCreateOpen(
                true
            );

    const onCreate = (
        orderId
    ) => {
        const order =
            COMPLETED_ORDERS.find(
                (o) =>
                    o.id ===
                    orderId
            );
        if (!order)
            return;

        const nextNo =
            "INV-2025-" +
            String(
                invoices.length +
                1
            ).padStart(
                3,
                "0"
            );

        const newIv = {
            id:
                Math.max(
                    0,
                    ...invoices.map(
                        (
                            x
                        ) =>
                            x.id
                    )
                ) + 1,
            invoice_no:
            nextNo,
            customer:
            order.customer,
            order_code:
            order.code,
            total:
            order.total,
            paid: 0,
            status:
            STATUS.UNPAID,
            created_at:
                new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    ),
            due_at:
                new Date(
                    Date.now() +
                    1000 *
                    60 *
                    60 *
                    24 *
                    30
                )
                    .toISOString()
                    .slice(
                        0,
                        10
                    ),
        };

        setInvoices(
            (arr) => [
                newIv,
                ...arr,
            ]
        );
        setCreateOpen(
            false
        );
        push(
            "Đã tạo hóa đơn " +
            newIv.invoice_no,
            "success"
        );
        // TODO: POST /api/v1/accountant/invoices { order_id }
    };

    // helper để tính trạng thái mới sau khi thu tiền
    const computeNextStatus =
        (
            total,
            paid,
            due_at
        ) => {
            const bal =
                Math.max(
                    0,
                    Number(
                        total ||
                        0
                    ) -
                    Number(
                        paid ||
                        0
                    )
                );
            if (bal <= 0)
                return STATUS.PAID;
            const pastDue =
                due_at &&
                new Date(
                    due_at
                ) <
                new Date();
            return pastDue
                ? STATUS.OVERDUE
                : STATUS.UNPAID;
        };

    // mở modal ghi nhận thanh toán
    const onRecordPayment =
        (iv) => {
            setDepositCtx({
                type: "invoice",
                id: iv.id,
                // tiêu đề đẹp hơn: INV-xxx · KH
                title: `${iv.invoice_no} · ${iv.customer}`,
            });
            setDepositTotals({
                total: Number(
                    iv.total ||
                    0
                ),
                paid: Number(
                    iv.paid ||
                    0
                ),
            });
            setDepositOpen(
                true
            );
        };

    // gửi HĐ qua email
    const onSendInvoice =
        (iv) => {
            push(
                "Đã gửi hóa đơn " +
                iv.invoice_no +
                " qua email",
                "info"
            );
            // TODO: API gửi mail
        };

    // xuất PDF mock
    const onExportPdf =
        (iv) => {
            push(
                "Xuất PDF (design-only) cho " +
                iv.invoice_no,
                "info"
            );
            // TODO: generate pdf thật
        };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-5">
            <Toasts toasts={toasts} />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <FilePlus2
                    className="h-6 w-6"
                    style={{
                        color: BRAND_COLOR,
                    }}
                />
                <h1 className="text-2xl font-semibold text-gray-900">
                    Invoice
                    Management
                </h1>

                {debtMode ? (
                    <div
                        className="ml-auto rounded-lg border px-2 py-1 text-[11px] font-medium flex items-center gap-1 bg-white shadow-sm"
                        style={{
                            borderColor:
                            BRAND_COLOR,
                            color: BRAND_COLOR,
                        }}
                    >
                        Chế độ
                        công nợ
                        (UNPAID /
                        OVERDUE
                        · ưu
                        tiên nợ
                        cũ)
                    </div>
                ) : (
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={
                                onRefresh
                            }
                            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium shadow-sm flex items-center gap-1"
                        >
                            <RefreshCw
                                className={cls(
                                    "h-4 w-4 text-gray-500",
                                    loading
                                        ? "animate-spin"
                                        : ""
                                )}
                            />
                            <span>
                                Làm
                                mới
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Toolbar card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5 shadow-sm">
                <Toolbar
                    query={
                        query
                    }
                    setQuery={
                        setQuery
                    }
                    statusFilter={
                        statusFilter
                    }
                    setStatusFilter={
                        setStatusFilter
                    }
                    onCreateClick={
                        onCreateClick
                    }
                    onRefresh={
                        onRefresh
                    }
                    onExportCsv={
                        onExportCsv
                    }
                    loading={
                        loading
                    }
                    debtMode={
                        debtMode
                    }
                    toggleDebtMode={
                        toggleDebtMode
                    }
                />
            </div>

            {/* Table card */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center gap-2">
                    {debtMode
                        ? "Danh sách công nợ khách hàng"
                        : "Danh sách hóa đơn"}
                </div>

                <InvoiceTable
                    items={
                        filtered
                    }
                    onRecordPayment={
                        onRecordPayment
                    }
                    onSendInvoice={
                        onSendInvoice
                    }
                    onExportPdf={
                        onExportPdf
                    }
                />

                <div className="px-4 py-2 border-t border-gray-200 text-[11px] text-gray-500 bg-white leading-relaxed">
                    Design-only.
                    Khi chốt
                    backend sẽ
                    nối API
                    thật:
                    GET
                    /api/v1/accountant/invoices
                    (có thể
                    kèm
                    status=UNPAID,OVERDUE
                    &
                    sort_by=due_date&order=asc
                    khi
                    debtMode
                    = true)
                </div>
            </div>

            {/* Modals */}
            {!debtMode && (
                <CreateInvoiceModal
                    open={
                        createOpen
                    }
                    orders={
                        COMPLETED_ORDERS
                    }
                    onCancel={() =>
                        setCreateOpen(
                            false
                        )
                    }
                    onCreate={
                        onCreate
                    }
                />
            )}

            <DepositModal
                open={
                    depositOpen
                }
                context={
                    depositCtx
                }
                totals={
                    depositTotals
                }
                defaultAmount={Math.max(
                    0,
                    depositTotals.total -
                    depositTotals.paid
                )}
                modeLabel="Thanh toán"
                allowOverpay={
                    false
                }
                onClose={() =>
                    setDepositOpen(
                        false
                    )
                }
                onSubmitted={(
                    { amount },
                    ctx
                ) => {
                    // cập nhật local paid/status
                    setInvoices(
                        (
                            arr
                        ) =>
                            arr.map(
                                (
                                    x
                                ) => {
                                    if (
                                        String(
                                            x.id
                                        ) !==
                                        String(
                                            ctx.id
                                        )
                                    )
                                        return x;

                                    const paidNow =
                                        (x.paid ||
                                            0) +
                                        Number(
                                            amount ||
                                            0
                                        );

                                    return {
                                        ...x,
                                        paid: paidNow,
                                        status: computeNextStatus(
                                            x.total,
                                            paidNow,
                                            x.due_at
                                        ),
                                    };
                                }
                            )
                    );
                    setDepositOpen(
                        false
                    );
                    push(
                        "Đã ghi nhận thanh toán",
                        "success"
                    );
                }}
            />
        </div>
    );
}

/* ===== DEMO_INVOICES ===== */
const DEMO_INVOICES = [
    {
        id: 1,
        invoice_no:
            "INV-2025-001",
        customer:
            "Công ty A",
        order_code:
            "ORD-701",
        total: 5_500_000,
        paid: 2_000_000,
        status:
        STATUS.UNPAID,
        created_at:
            "2025-10-15",
        due_at:
            "2025-11-15",
    },
    {
        id: 2,
        invoice_no:
            "INV-2025-002",
        customer:
            "Công ty B",
        order_code:
            "ORD-702",
        total: 3_250_000,
        paid: 3_250_000,
        status:
        STATUS.PAID,
        created_at:
            "2025-10-16",
        due_at:
            "2025-11-16",
    },
    {
        id: 3,
        invoice_no:
            "INV-2025-003",
        customer:
            "Công ty C",
        order_code:
            "ORD-703",
        total: 9_900_000,
        paid: 1_900_000,
        status:
        STATUS.OVERDUE,
        created_at:
            "2025-09-10",
        due_at:
            "2025-10-10",
    },
    {
        id: 4,
        invoice_no:
            "INV-2025-004",
        customer:
            "Công ty D",
        order_code:
            "ORD-704",
        total: 1_200_000,
        paid: 0,
        status:
        STATUS.UNPAID,
        created_at:
            "2025-10-20",
        due_at:
            "2025-11-20",
    },
];
