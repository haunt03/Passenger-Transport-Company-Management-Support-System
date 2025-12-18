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
    History,
    CheckCircle,
    XCircle,
    Clock,
    X,
    AlertTriangle,
    Phone,
    Info,
} from "lucide-react";

import DepositModal from "./DepositModal.jsx";
import {
    listInvoices,
    createInvoice,
    recordPayment,
    sendInvoice,
    generateInvoiceNumber,
    getPaymentHistory,
    confirmPayment,
    getPendingPayments,
    countPendingPayments,
} from "../../api/invoices";
import { listBookings, listBookingPayments } from "../../api/bookings";
import { exportInvoiceListToExcel, exportInvoiceToPdf } from "../../api/exports";
import { getCurrentRole, ROLES, getStoredUserId } from "../../utils/session";
import { getMyProfile } from "../../api/profile";
import { getBranchByUserId } from "../../api/branches";

/* ===== Helpers / constants ===== */
const BRAND_COLOR = "#0079BC";

const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    );

const cls = (...a) => a.filter(Boolean).join(" ");

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

    const isDestructive =
        requireReason ||
        (typeof title === "string" &&
            /từ chối|chưa nhận/i.test(title));

    const HeaderIcon = isDestructive ? AlertTriangle : CheckCircle;

    const renderMessage = () => {
        if (React.isValidElement(message)) {
            return message;
        }

        if (typeof message === "string") {
            const lines = message.split(/\n+/).map((l) => l.trim()).filter(Boolean);
            if (!lines.length) return null;

            return (
                <div className="space-y-1.5">
                    {lines.map((line, idx) => (
                        <p
                            key={idx}
                            className={idx === 0 ? "font-medium text-slate-900" : "text-slate-700"}
                        >
                            {line}
                        </p>
                    ))}
                </div>
            );
        }

        // Fallback: hiển thị object dưới dạng JSON
        if (message != null) {
            try {
                return (
                    <pre className="text-xs bg-slate-50 text-slate-700 rounded-md px-3 py-2 overflow-x-auto">
                        {JSON.stringify(message, null, 2)}
                    </pre>
                );
            } catch {
                return <div className="text-sm text-slate-700">{String(message)}</div>;
            }
        }

        return null;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div
                    className={cls(
                        "px-5 py-4 border-b flex items-center gap-3",
                        isDestructive
                            ? "bg-rose-50 border-rose-100 text-rose-700"
                            : "bg-sky-50 border-sky-100 text-sky-700"
                    )}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm">
                        <HeaderIcon
                            className={cls(
                                "h-5 w-5",
                                isDestructive ? "text-rose-600" : "text-sky-600"
                            )}
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="font-semibold text-sm md:text-base">
                            {title}
                        </div>
                        {isDestructive && (
                            <span className="text-xs md:text-[11px] opacity-80">
                                Hành động này có thể không thể hoàn tác.
                            </span>
                        )}
                    </div>
                </div>

                {/* body */}
                <div className="px-5 py-4 text-sm text-slate-700 space-y-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 mt-0.5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                            {renderMessage()}
                        </div>
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
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {requireReason && (
                        <p className="text-[11px] text-slate-500">
                            Vui lòng ghi rõ lý do để hệ thống lưu lại cho việc đối soát sau này.
                        </p>
                    )}
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
                        className={cls(
                            "rounded-md px-3 py-2 text-sm font-medium shadow-sm transition-colors",
                            isDestructive
                                ? "bg-rose-600 hover:bg-rose-500 text-white"
                                : "bg-sky-600 hover:bg-sky-500 text-white"
                        )}
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}

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
            "bg-info-50 text-info-700 border-info-300",
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
    const push = React.useCallback((
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
                     canCreate,
                 }) {
    return (
        <div className="flex flex-wrap items-center gap-3 w-full">
            {/* nút tạo hóa đơn (ẩn khi ở công nợ hoặc không có quyền) */}
            {!debtMode && canCreate && (
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
                          onViewPaymentHistory,
                          isAccountant = false,
                          onDirectRecord, // Handler để Accountant ghi nhận trực tiếp (không qua pending)
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
            if (sortKey === "invoice_no") {
                // Sắp xếp theo phần số ở cuối mã hóa đơn (VD: INV-HN-2025-0012 -> 12)
                const parseSeq = (code) => {
                    if (!code) return 0;
                    const match = String(code).match(/(\d+)\s*$/);
                    return match ? Number(match[1]) : 0;
                };
                A = parseSeq(a.invoice_no);
                B = parseSeq(b.invoice_no);
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
                                    {iv.invoice_no || `INV-${iv.id}`}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-800">
                                    <div>{iv.customer || "—"}</div>
                                    {iv.customerPhone && (
                                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {iv.customerPhone}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-800">
                                    {iv.order_code || "—"}
                                </td>
                                <td className="px-3 py-2 text-sm font-semibold tabular-nums text-gray-900">
                                    {fmtVND(iv.total || 0)} đ
                                </td>
                                <td className="px-3 py-2 text-sm tabular-nums text-gray-800">
                                    {fmtVND(iv.paid || 0)} đ
                                </td>
                                <td className="px-3 py-2 text-sm tabular-nums text-gray-800">
                                    {fmtVND(balance)} đ
                                </td>
                                <td className="px-3 py-2 text-[11px] text-gray-500 whitespace-nowrap">
                                    {iv.due_at || "—"}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                    <StatusBadge status={iv.status} />
                                    {isAccountant && (iv.pendingPaymentCount || 0) > 0 && (
                                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-medium">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>Chờ kế toán xác nhận ({iv.pendingPaymentCount})</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                        {/* Ghi nhận thanh toán - cho role khác (Driver, Consultant...) */}
                                        {iv.status !== STATUS.PAID && !isAccountant && (
                                            <button
                                                onClick={() => onRecordPayment(iv)}
                                                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                            >
                                                <BadgeDollarSign className="h-3.5 w-3.5 text-gray-500" />
                                                <span>Ghi nhận</span>
                                            </button>
                                        )}

                                        {/* Accountant: Xác nhận thanh toán khi có pending requests */}
                                        {iv.status !== STATUS.PAID && isAccountant && (iv.pendingPaymentCount || 0) > 0 && (
                                            <button
                                                onClick={() => onRecordPayment(iv)}
                                                className="rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                                                <span>Xác nhận ({(iv.pendingPaymentCount || 0)})</span>
                                            </button>
                                        )}

                                        {/* Accountant: Ghi nhận trực tiếp khi không còn pending request */}
                                        {iv.status !== STATUS.PAID && isAccountant && (iv.pendingPaymentCount || 0) === 0 && (
                                            <button
                                                onClick={() => onDirectRecord(iv)}
                                                className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                            >
                                                <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>Ghi nhận</span>
                                            </button>
                                        )}

                                        {/* Xem lịch sử thanh toán - chỉ hiển thị nếu có bookingId (mã đơn) */}
                                        {onViewPaymentHistory && iv.bookingId && (
                                            <button
                                                onClick={() => onViewPaymentHistory(iv)}
                                                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-1"
                                                title="Xem lịch sử thanh toán theo mã đơn"
                                            >
                                                <History className="h-3.5 w-3.5 text-gray-500" />
                                                <span>Lịch sử</span>
                                            </button>
                                        )}

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
    const { toasts, push } = useToasts();
    const role = getCurrentRole();
    // Accountant chỉ xem, không tạo hóa đơn thủ công
    const canCreate = role !== ROLES.ACCOUNTANT;

    const [loading, setLoading] = React.useState(false);
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [query, setQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");
    const [createOpen, setCreateOpen] = React.useState(false);
    const [invoices, setInvoices] = React.useState([]);
    const [completedOrders, setCompletedOrders] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);

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

    // payment history modal
    const [paymentHistoryOpen, setPaymentHistoryOpen] = React.useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(null);
    const [paymentHistory, setPaymentHistory] = React.useState([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);

    // chế độ công nợ
    const [
        debtMode,
        setDebtMode,
    ] = React.useState(false);
    const toggleDebtMode = () =>
        setDebtMode(
            (v) => !v
        );

    // Tab: Yêu cầu thanh toán chờ xác nhận
    const [activeTab, setActiveTab] = React.useState("invoices"); // "invoices" | "pending"
    const [pendingPayments, setPendingPayments] = React.useState([]);
    const [pendingCount, setPendingCount] = React.useState(0);
    const [loadingPending, setLoadingPending] = React.useState(false);

    // Modal xác nhận thanh toán cho 1 hóa đơn cụ thể (cho Accountant)
    const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
    const [confirmModalInvoice, setConfirmModalInvoice] = React.useState(null);
    const [confirmModalPayments, setConfirmModalPayments] = React.useState([]);
    const [loadingConfirmModal, setLoadingConfirmModal] = React.useState(false);

    // Payment confirmation modal (giống AccountantDashboard)
    const [paymentConfirm, setPaymentConfirm] = React.useState({
        open: false,
        paymentId: null,
        status: null,
        paymentInfo: null,
    });

    // Branch ID của user (để filter cho accountant)
    const [userBranchId, setUserBranchId] = React.useState(null);

    // Load user branch ID (cho accountant filter)
    React.useEffect(() => {
        if (role === ROLES.ACCOUNTANT) {
            (async () => {
                try {
                    const userId = getStoredUserId();
                    if (userId) {
                        const profile = await getMyProfile();
                        // Thử lấy branchId từ profile
                        let branchId = profile?.branchId || profile?.branch?.id || profile?.branch?.branchId;

                        // Nếu không có trong profile, thử lấy từ API branch
                        if (!branchId) {
                            try {
                                const branch = await getBranchByUserId(userId);
                                branchId = branch?.id || branch?.branchId;
                            } catch (err) {
                                console.warn("Could not get branch by userId:", err);
                            }
                        }

                        if (branchId) {
                            setUserBranchId(Number(branchId));
                        }
                    }
                } catch (err) {
                    console.error("Error loading user branch:", err);
                }
            })();
        }
    }, [role]);

    // Load invoices from API
    const loadInvoices = React.useCallback(async () => {
        // QUAN TRỌNG: Accountant phải đợi userBranchId load xong trước khi load invoices
        if (role === ROLES.ACCOUNTANT && userBranchId === null) {
            // Chưa load xong branchId, đợi thêm
            return;
        }

        setLoading(true);
        try {
            const params = {
                page,
                size: 20,
                sortBy: debtMode ? "dueDate" : "createdAt",
                sortDir: debtMode ? "asc" : "desc",
            };

            // QUAN TRỌNG: Accountant chỉ xem hóa đơn của chi nhánh mình
            if (role === ROLES.ACCOUNTANT) {
                if (!userBranchId) {
                    // Nếu không có branchId, không load invoices (tránh load tất cả)
                    setLoading(false);
                    setInitialLoading(false);
                    push("Không thể xác định chi nhánh của bạn. Vui lòng liên hệ quản trị viên.", "error");
                    return;
                }
                params.branchId = userBranchId;
            }

            if (debtMode) {
                params.overdueOnly = true;
            } else if (statusFilter) {
                params.paymentStatus = statusFilter;
            }

            if (query.trim()) {
                params.keyword = query.trim();
            }

            const response = await listInvoices(params);

            // Debug: Log thông tin filter và response
            console.log("[InvoiceManagement] Load invoices params:", {
                role,
                userBranchId,
                branchId: params.branchId,
                page: params.page,
                statusFilter,
                debtMode,
                query: params.keyword
            });

            // Handle paginated response
            let invoiceList = [];
            if (response && response.content) {
                invoiceList = response.content || [];
                setInvoices(invoiceList);
                setTotalPages(response.totalPages || 1);
            } else if (Array.isArray(response)) {
                invoiceList = response;
                setInvoices(invoiceList);
                setTotalPages(1);
            } else {
                setInvoices([]);
            }

            // Debug: Log danh sách hóa đơn
            console.log("[InvoiceManagement] Loaded invoices:", {
                total: invoiceList.length,
                invoices: invoiceList.map(iv => ({
                    id: iv.id,
                    invoice_no: iv.invoice_no,
                    customer: iv.customer,
                    bookingId: iv.bookingId,
                    order_code: iv.order_code,
                    branchId: iv.branchId || iv.branch?.id || iv.branch?.branchId,
                    total: iv.total,
                    paid: iv.paid,
                    remaining: iv.remaining,
                    status: iv.status,
                    dueDate: iv.dueDate
                }))
            });

            // Debug: Log để kiểm tra filter branchId
            if (role === ROLES.ACCOUNTANT && userBranchId) {
                const invoicesFromOtherBranch = invoiceList.filter(iv => {
                    const ivBranchId = iv.branchId || iv.branch?.id || iv.branch?.branchId;
                    return ivBranchId && Number(ivBranchId) !== Number(userBranchId);
                });
                if (invoicesFromOtherBranch.length > 0) {
                    console.warn("[InvoiceManagement] ⚠️ Có hóa đơn từ chi nhánh khác:", invoicesFromOtherBranch);
                } else {
                    console.log("[InvoiceManagement] ✅ Tất cả hóa đơn đều thuộc chi nhánh", userBranchId);
                }
            }
        } catch (err) {
            console.error("Error loading invoices:", err);
            push("Lỗi khi tải danh sách hóa đơn: " + (err.message || "Lỗi không xác định"), "error");
            setInvoices([]);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [page, debtMode, statusFilter, query, push, role, userBranchId]);

    // Load completed orders for create invoice modal
    const loadCompletedOrders = React.useCallback(async () => {
        try {
            const response = await listBookings({ status: "COMPLETED" });
            // Handle paginated response
            const orders = response?.content || response?.data?.content || response?.data || response || [];
            const formatted = (Array.isArray(orders) ? orders : []).map(order => {
                const bookingId = order.bookingId || order.id;

                // Extract branchId from multiple possible sources
                const branchId = order.branchId
                    || (order.branch && (order.branch.id || order.branch.branchId))
                    || (order.branchId && Number(order.branchId))
                    || null;

                // Extract customerId from multiple possible sources
                const customerId = order.customerId
                    || (order.customer && (order.customer.id || order.customer.customerId))
                    || (order.customerId && Number(order.customerId))
                    || null;

                return {
                    id: bookingId,
                    code: order.bookingCode || order.code || (bookingId ? `ORD-${bookingId}` : "ORD-?"),
                    customer: order.customerName || (order.customer && order.customer.fullName) || (order.customer && order.customer.name) || order.customer || "—",
                    total: order.totalPrice || order.totalCost || order.total || 0,
                    completed_at: order.completedAt || order.completed_at || order.updatedAt || order.createdAt || "—",
                    branchId: branchId,
                    customerId: customerId
                };
            }).filter(order => {
                // Only include orders that have both branchId and customerId
                return order.branchId != null && order.customerId != null;
            });

            console.log("Loaded completed orders:", formatted);
            setCompletedOrders(formatted);
        } catch (err) {
            console.error("Error loading completed orders:", err);
            push("Lỗi khi tải danh sách đơn hàng hoàn thành: " + (err?.data?.message || err?.message || "Lỗi không xác định"), "error");
            setCompletedOrders([]);
        }
    }, [push]);

    // Load pending payments (for accountant)
    const loadPendingPayments = React.useCallback(async () => {
        setLoadingPending(true);
        try {
            // Accountant chỉ xem pending payments của chi nhánh mình
            const branchId = role === ROLES.ACCOUNTANT ? userBranchId : null;
            const payments = await getPendingPayments(branchId);
            setPendingPayments(Array.isArray(payments) ? payments : []);
        } catch (err) {
            console.error("Error loading pending payments:", err);
            push("Lỗi khi tải yêu cầu thanh toán: " + (err?.message || "Lỗi không xác định"), "error");
            setPendingPayments([]);
        } finally {
            setLoadingPending(false);
        }
    }, [push, role, userBranchId]);

    // Load pending count
    const loadPendingCount = React.useCallback(async () => {
        try {
            // Accountant chỉ đếm pending payments của chi nhánh mình
            const branchId = role === ROLES.ACCOUNTANT ? userBranchId : null;
            const count = await countPendingPayments(branchId);
            setPendingCount(count || 0);
        } catch (err) {
            console.error("Error loading pending count:", err);
        }
    }, [role, userBranchId]);

    // Load data on mount and when filters change
    React.useEffect(() => {
        // Đợi userBranchId load xong (cho Accountant) trước khi load invoices
        if (activeTab === "invoices") {
            if (role === ROLES.ACCOUNTANT && userBranchId === null) {
                // Chưa load xong branchId, đợi thêm
                return;
            }
            loadInvoices();
        } else if (activeTab === "pending") {
            loadPendingPayments();
        }
    }, [loadInvoices, loadPendingPayments, activeTab, role, userBranchId]);

    // Load pending count on mount (for badge)
    React.useEffect(() => {
        loadPendingCount();
    }, [loadPendingCount]);

    React.useEffect(() => {
        if (createOpen) {
            loadCompletedOrders();
        }
    }, [createOpen, loadCompletedOrders]);

    // Transform API response to UI format
    const transformedInvoices = React.useMemo(() => {
        return invoices.map((iv) => ({
            id: iv.invoiceId,
            invoice_no: iv.invoiceNumber || `INV-${iv.invoiceId}`,
            customer: iv.customerName || "—",
            customerEmail: iv.customerEmail,
            customerPhone: iv.customerPhone || iv.customer_phone,
            order_code: iv.bookingId ? `ORD-${iv.bookingId}` : "—",
            total: Number(iv.amount || 0),
            paid: Number(iv.paidAmount || 0),
            balance: Number(iv.balance || 0),
            status: iv.paymentStatus || "UNPAID",
            created_at: iv.invoiceDate ? new Date(iv.invoiceDate).toISOString().slice(0, 10) : "",
            due_at: iv.dueDate || "",
            daysOverdue: iv.daysOverdue || 0,
            pendingPaymentCount: iv.pendingPaymentCount || 0, // Số lượng payment requests đang chờ xác nhận
        }));
    }, [invoices]);

    // Filter and sort (client-side for now, can be moved to server)
    const filtered = React.useMemo(() => {
        let base = [...transformedInvoices];

        // Filter theo query (search)
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            base = base.filter((iv) => {
                const invoiceNo = (iv.invoice_no || "").toLowerCase();
                const customer = (iv.customer || "").toLowerCase();
                const orderCode = (iv.order_code || "").toLowerCase();
                return invoiceNo.includes(q) || customer.includes(q) || orderCode.includes(q);
            });
        }

        // Filter theo status (nếu không ở debtMode)
        if (!debtMode && statusFilter) {
            base = base.filter((iv) => iv.status === statusFilter);
        }

        // Filter theo debtMode
        if (debtMode) {
            base = base.filter((iv) =>
                iv.status === STATUS.UNPAID || iv.status === STATUS.OVERDUE
            );
            base = sortDebtPriority(base);
        }

        return base;
    }, [transformedInvoices, debtMode, query, statusFilter]);

    const onRefresh = () => {
        loadInvoices();
        push(
            debtMode
                ? "Đã đồng bộ công nợ"
                : "Đã làm mới danh sách hóa đơn",
            "info"
        );
    };

    const onExportCsv = async () => {
        try {
            await exportInvoiceListToExcel({
                paymentStatus: debtMode ? "UNPAID" : statusFilter || undefined,
            });
            push(
                debtMode
                    ? "Đã export Excel công nợ"
                    : "Đã export Excel hóa đơn",
                "success"
            );
        } catch (err) {
            console.error("Export error:", err);
            push("Lỗi khi export: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    const onCreateClick =
        () =>
            setCreateOpen(
                true
            );

    const onCreate = async (bookingId) => {
        const order = completedOrders.find((o) => o.id === bookingId);
        if (!order) {
            push("Không tìm thấy đơn hàng", "error");
            return;
        }

        console.log("Selected order for invoice creation:", order);

        // Validate required fields with better error messages
        if (!order.branchId) {
            push(`Đơn hàng ${order.code || order.id} không có thông tin chi nhánh. Vui lòng kiểm tra lại đơn hàng.`, "error");
            return;
        }
        if (!order.customerId) {
            push(`Đơn hàng ${order.code || order.id} không có thông tin khách hàng. Vui lòng kiểm tra lại đơn hàng.`, "error");
            return;
        }
        if (!order.total || Number(order.total) <= 0) {
            push(`Tổng tiền đơn hàng ${order.code || order.id} không hợp lệ (${order.total}). Vui lòng kiểm tra lại.`, "error");
            return;
        }

        setLoading(true);
        try {
            // Generate invoice number
            let invoiceNumber = null;
            try {
                const invoiceNumberData = await generateInvoiceNumber(order.branchId);
                invoiceNumber = invoiceNumberData?.data?.invoiceNumber || invoiceNumberData?.invoiceNumber;
            } catch (err) {
                console.warn("Failed to generate invoice number, will use auto-generated:", err);
                // Continue without invoice number, backend will generate
            }

            // Create invoice
            const request = {
                branchId: Number(order.branchId),
                bookingId: Number(order.id),
                customerId: Number(order.customerId),
                type: "INCOME",
                amount: Number(order.total || 0),
                paymentTerms: "NET_7",
                note: `Tạo từ đơn hàng ${order.code || order.id}`,
            };

            console.log("Creating invoice with request:", request);

            const response = await createInvoice(request);
            const newInvoice = response?.data || response;

            setCreateOpen(false);
            push(`Đã tạo hóa đơn ${newInvoice?.invoiceNumber || invoiceNumber || "thành công"}`, "success");
            loadInvoices(); // Reload list
        } catch (err) {
            console.error("Error creating invoice:", err);

            // Extract error message from different possible formats
            let errorMessage = "Lỗi không xác định";
            if (err?.data?.message) {
                errorMessage = err.data.message;
            } else if (err?.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === "string") {
                errorMessage = err;
            }

            push(`Lỗi khi tạo hóa đơn: ${errorMessage}`, "error");
        } finally {
            setLoading(false);
        }
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

    // mở modal ghi nhận/xác nhận thanh toán
    const onRecordPayment = async (iv) => {
        // Nếu là Accountant → mở modal xác nhận (không tạo mới payment)
        if (role === ROLES.ACCOUNTANT) {
            setConfirmModalInvoice(iv);
            setConfirmModalOpen(true);
            setLoadingConfirmModal(true);
            try {
                // Lấy lịch sử thanh toán của hóa đơn này
                const history = await getPaymentHistory(iv.id);
                const allPayments = Array.isArray(history) ? history : (history?.data || []);
                // Lọc các payment đang PENDING
                const pendingList = allPayments.filter(p => p.confirmationStatus === "PENDING");
                setConfirmModalPayments(pendingList);
            } catch (err) {
                console.error("Error loading payments:", err);
                push("Lỗi khi tải yêu cầu thanh toán", "error");
                setConfirmModalPayments([]);
            } finally {
                setLoadingConfirmModal(false);
            }
        } else {
            // Role khác (Driver, Consultant...) → mở DepositModal để tạo payment request
            setDepositCtx({
                type: "invoice",
                id: iv.id,
                title: `${iv.invoice_no} · ${iv.customer}`,
            });
            setDepositTotals({
                total: Number(iv.total || 0),
                paid: Number(iv.paid || 0),
            });
            setDepositOpen(true);
        }
    };

    // Accountant ghi nhận trực tiếp (không có pending request) → mở DepositModal với CONFIRMED
    const onDirectRecord = (iv) => {
        setDepositCtx({
            type: "invoice",
            id: iv.id,
            title: `${iv.invoice_no} · ${iv.customer}`,
        });
        setDepositTotals({
            total: Number(iv.total || 0),
            paid: Number(iv.paid || 0),
        });
        setDepositOpen(true);
    };

    // Gửi HĐ qua email
    const onSendInvoice = async (iv) => {
        // Get customer email from invoice
        const customerEmail = iv.customer_email || iv.customerEmail;

        if (!customerEmail) {
            push("❌ Không tìm thấy email khách hàng", "error", 3000);
            return;
        }

        // Show loading notification
        push(`📧 Đang gửi hóa đơn ${iv.invoice_no}...`, "info", 2000);

        try {
            await sendInvoice(iv.id, {
                email: customerEmail,
                message: `Hóa đơn ${iv.invoice_no} từ TranspoManager`
            });
            push(`✅ Đã gửi hóa đơn ${iv.invoice_no} đến ${customerEmail}`, "success", 4000);
        } catch (err) {
            console.error("Error sending invoice:", err);
            const errorMsg = err?.data?.message || err?.message || "Lỗi không xác định";
            push(`❌ Lỗi khi gửi email: ${errorMsg}`, "error", 4000);
        }
    };

    // Xuất PDF
    const onExportPdf = async (iv) => {
        try {
            await exportInvoiceToPdf(iv.id);
            push(`Đã xuất PDF cho ${iv.invoice_no}`, "success");
        } catch (err) {
            console.error("Error exporting PDF:", err);
            push("Lỗi khi xuất PDF: " + (err.message || "Lỗi không xác định"), "error");
        }
    };

    // Xem lịch sử thanh toán - theo mã đơn (bookingId)
    const onViewPaymentHistory = async (iv) => {
        // Chỉ xem được nếu có bookingId (mã đơn)
        if (!iv.bookingId) {
            push("Không thể xem lịch sử thanh toán: Hóa đơn này không có mã đơn hàng", "error");
            return;
        }

        setSelectedInvoiceId(iv.id);
        setPaymentHistoryOpen(true);
        setLoadingHistory(true);
        try {
            // Gọi API lấy payment theo bookingId (mã đơn)
            const history = await listBookingPayments(iv.bookingId);
            setPaymentHistory(Array.isArray(history) ? history : (history?.data ? history.data : []));
        } catch (err) {
            console.error("Error loading payment history:", err);
            push("Lỗi khi tải lịch sử thanh toán: " + (err.message || "Lỗi không xác định"), "error");
            setPaymentHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Mở modal xác nhận thanh toán (giống AccountantDashboard)
    const handlePaymentConfirmClick = React.useCallback((paymentId, status, payment = null) => {
        setPaymentConfirm({
            open: true,
            paymentId: paymentId,
            status: status,
            paymentInfo: payment ? {
                amount: payment.amount,
                invoiceId: payment.invoiceId,
                invoiceNumber: payment.invoiceNumber,
                bookingCode: payment.bookingCode,
                paymentMethod: payment.paymentMethod,
                note: payment.note,
            } : null,
        });
    }, []);

    // Xác nhận thanh toán sau khi user confirm trong modal
    const confirmPaymentRequest = React.useCallback(async (paymentId, status) => {
        try {
            await confirmPayment(paymentId, status);
            push(
                status === "CONFIRMED"
                    ? "Đã xác nhận nhận tiền"
                    : "Đã đánh dấu chưa nhận được tiền",
                "success"
            );

            // Reload payment history
            if (selectedInvoiceId) {
                const history = await getPaymentHistory(selectedInvoiceId);
                setPaymentHistory(Array.isArray(history) ? history : (history?.data ? history.data : []));
            }
            // Reload confirm modal payments nếu đang mở
            if (confirmModalOpen && confirmModalInvoice) {
                const history = await getPaymentHistory(confirmModalInvoice.id);
                const allPayments = Array.isArray(history) ? history : (history?.data || []);
                const pendingList = allPayments.filter(p => p.confirmationStatus === "PENDING");
                setConfirmModalPayments(pendingList);
                // Nếu hết pending → đóng modal
                if (pendingList.length === 0) {
                    setConfirmModalOpen(false);
                    setConfirmModalInvoice(null);
                }
            }
            loadInvoices(); // Reload invoices để cập nhật tổng thanh toán
            loadPendingPayments(); // Reload pending payments list
            loadPendingCount(); // Update pending count badge

            setPaymentConfirm({
                open: false,
                paymentId: null,
                status: null,
                paymentInfo: null,
            });
        } catch (err) {
            console.error("Error confirming payment:", err);
            push("Lỗi khi xác nhận thanh toán: " + (err?.data?.message || err?.message || "Lỗi không xác định"), "error");
        }
    }, [selectedInvoiceId, confirmModalOpen, confirmModalInvoice, push, loadInvoices, loadPendingPayments, loadPendingCount]);

    // Xác nhận thanh toán (giữ lại cho PaymentHistoryModal - dùng window.confirm vì không có payment info)
    const onConfirmPayment = async (paymentId, status) => {
        const isConfirm = status === "CONFIRMED";
        const confirmText = isConfirm
            ? "Bạn có chắc chắn đã nhận đủ số tiền này và muốn xác nhận 'ĐÃ NHẬN'?"
            : "Bạn có chắc chắn muốn đánh dấu 'CHƯA NHẬN ĐƯỢC' cho khoản thanh toán này?";

        // Popup xác nhận trước khi cập nhật trạng thái (chỉ dùng cho PaymentHistoryModal)
        const ok = window.confirm(confirmText);
        if (!ok) return;

        try {
            await confirmPayment(paymentId, status);
            push(
                isConfirm
                    ? "Đã xác nhận nhận tiền"
                    : "Đã đánh dấu chưa nhận được tiền",
                "success"
            );
            // Reload payment history
            if (selectedInvoiceId) {
                const history = await getPaymentHistory(selectedInvoiceId);
                setPaymentHistory(Array.isArray(history) ? history : (history?.data ? history.data : []));
            }
            // Reload confirm modal payments nếu đang mở
            if (confirmModalOpen && confirmModalInvoice) {
                const history = await getPaymentHistory(confirmModalInvoice.id);
                const allPayments = Array.isArray(history) ? history : (history?.data || []);
                const pendingList = allPayments.filter(p => p.confirmationStatus === "PENDING");
                setConfirmModalPayments(pendingList);
                // Nếu hết pending → đóng modal
                if (pendingList.length === 0) {
                    setConfirmModalOpen(false);
                    setConfirmModalInvoice(null);
                }
            }
            loadInvoices(); // Reload invoices để cập nhật tổng thanh toán
            loadPendingPayments(); // Reload pending payments list
            loadPendingCount(); // Update pending count badge
        } catch (err) {
            console.error("Error confirming payment:", err);
            push("Lỗi khi xác nhận thanh toán: " + (err?.data?.message || err?.message || "Lỗi không xác định"), "error");
        }
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

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={cls(
                        "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                        activeTab === "invoices"
                            ? "text-[#0079BC] border-[#0079BC]"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                    )}
                >
                    <span className="flex items-center gap-2">
                        <FilePlus2 className="h-4 w-4" />
                        Danh sách hóa đơn
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("pending")}
                    className={cls(
                        "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        activeTab === "pending"
                            ? "text-[#0079BC] border-[#0079BC]"
                            : pendingCount > 0
                                ? "text-rose-600 border-transparent hover:text-rose-700"
                                : "text-gray-500 border-transparent hover:text-gray-700"
                    )}
                >
                    <Clock className="h-4 w-4" />
                    Yêu cầu thanh toán chờ xác nhận
                    {pendingCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white min-w-[20px] text-center">
                            {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Invoices Tab Content */}
            {activeTab === "invoices" && (
                <>
                    {/* Toolbar card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 mb-5 shadow-sm">
                        <Toolbar
                            query={query}
                            setQuery={setQuery}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            onCreateClick={onCreateClick}
                            onRefresh={onRefresh}
                            onExportCsv={onExportCsv}
                            loading={loading}
                            debtMode={debtMode}
                            toggleDebtMode={toggleDebtMode}
                            canCreate={canCreate}
                        />
                    </div>

                    {/* Table card */}
                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center gap-2">
                            {debtMode
                                ? "Danh sách công nợ khách hàng"
                                : "Danh sách hóa đơn"}
                        </div>

                        {initialLoading ? (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                Đang tải dữ liệu...
                            </div>
                        ) : (
                            <>
                                <InvoiceTable
                                    items={filtered}
                                    onRecordPayment={onRecordPayment}
                                    onSendInvoice={onSendInvoice}
                                    onExportPdf={onExportPdf}
                                    onViewPaymentHistory={onViewPaymentHistory}
                                    isAccountant={role === ROLES.ACCOUNTANT}
                                    onDirectRecord={onDirectRecord}
                                />
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            Trang {page + 1} / {totalPages}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPage(Math.max(0, page - 1))}
                                                disabled={page === 0}
                                                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                                            >
                                                Trước
                                            </button>
                                            <button
                                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                                disabled={page >= totalPages - 1}
                                                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                                            >
                                                Sau
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="px-4 py-2 border-t border-gray-200 text-[11px] text-gray-500 bg-white leading-relaxed">
                            Tổng: {invoices.length} hóa đơn.
                            {debtMode && " Chế độ công nợ: chỉ hiển thị UNPAID/OVERDUE, sắp xếp theo due date."}
                        </div>
                    </div>
                </>
            )}

            {/* Pending Payments Tab Content */}
            {activeTab === "pending" && (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-info-500" />
                            Yêu cầu thanh toán từ tài xế/tư vấn viên đang chờ xác nhận
                        </div>
                        <button
                            onClick={() => {
                                loadPendingPayments();
                                loadPendingCount();
                            }}
                            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 text-sm font-medium shadow-sm flex items-center gap-1"
                        >
                            <RefreshCw className={cls("h-4 w-4", loadingPending ? "animate-spin" : "")} />
                            Làm mới
                        </button>
                    </div>

                    {loadingPending ? (
                        <div className="px-4 py-12 text-center text-gray-500 text-sm">
                            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                            Đang tải...
                        </div>
                    ) : pendingPayments.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500">
                            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                            <div className="text-sm font-medium text-gray-700">Không có yêu cầu thanh toán nào đang chờ xác nhận</div>
                            <div className="text-xs text-gray-500 mt-1">Tất cả yêu cầu đã được xử lý</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {pendingPayments.map((payment, idx) => (
                                <div key={`pending-${payment.paymentId}-${idx}`} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-lg font-bold text-gray-900 tabular-nums">
                                                    {fmtVND(payment.amount || 0)} đ
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-info-50 text-info-700 border border-info-300">
                                                    <Clock className="h-3 w-3" />
                                                    Chờ xác nhận
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Hóa đơn:</span>
                                                    <span className="text-gray-900">{payment.invoiceNumber || `INV-${payment.invoiceId}`}</span>
                                                    {payment.customerName && (
                                                        <span className="text-gray-500">• {payment.customerName}</span>
                                                    )}
                                                </div>
                                                {payment.bookingCode && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Mã đơn:</span>
                                                        <span>{payment.bookingCode}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Phương thức:</span>
                                                    <span>{payment.paymentMethod === "CASH" ? "Tiền mặt" : payment.paymentMethod === "TRANSFER" ? "Chuyển khoản" : payment.paymentMethod}</span>
                                                </div>
                                                {payment.paymentDate && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Thời gian:</span>
                                                        <span>{new Date(payment.paymentDate).toLocaleString("vi-VN")}</span>
                                                    </div>
                                                )}
                                                {payment.note && (
                                                    <div className="mt-2 text-xs text-gray-500 italic">
                                                        "{payment.note}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handlePaymentConfirmClick(payment.paymentId, "CONFIRMED", payment)}
                                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Đã nhận
                                            </button>
                                            <button
                                                onClick={() => handlePaymentConfirmClick(payment.paymentId, "REJECTED", payment)}
                                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Chưa nhận được
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="px-4 py-2 border-t border-gray-200 text-[11px] text-gray-500 bg-white">
                        Xác thực tiền đã nhận từ tài xế/tư vấn viên. Chọn "Đã nhận" để ghi nhận số tiền vào hóa đơn.
                    </div>
                </div>
            )}

            {/* Modals */}
            {!debtMode && canCreate && (
                <CreateInvoiceModal
                    open={createOpen}
                    orders={completedOrders}
                    onCancel={() => setCreateOpen(false)}
                    onCreate={onCreate}
                />
            )}

            <DepositModal
                open={depositOpen}
                context={depositCtx}
                totals={depositTotals}
                defaultAmount={Math.max(
                    0,
                    depositTotals.total - depositTotals.paid
                )}
                modeLabel="Thanh toán"
                allowOverpay={false}
                onClose={() => setDepositOpen(false)}
                onSubmitted={() => {
                    // DepositModal handles the API call internally
                    // Just reload the list after successful submission
                    setDepositOpen(false);
                    push("Đã ghi nhận thanh toán", "success");
                    loadInvoices(); // Reload to get updated balance
                }}
            />

            {/* Payment History Modal */}
            {paymentHistoryOpen && (
                <PaymentHistoryModal
                    open={paymentHistoryOpen}
                    invoiceId={selectedInvoiceId}
                    paymentHistory={paymentHistory}
                    loading={loadingHistory}
                    onClose={() => {
                        setPaymentHistoryOpen(false);
                        setSelectedInvoiceId(null);
                        setPaymentHistory([]);
                    }}
                    onConfirm={onConfirmPayment}
                />
            )}

            {/* Modal xác nhận thanh toán cho Accountant */}
            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => {
                        setConfirmModalOpen(false);
                        setConfirmModalInvoice(null);
                        setConfirmModalPayments([]);
                    }} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"
                             style={{ backgroundColor: BRAND_COLOR }}>
                            <div className="text-white">
                                <h3 className="text-lg font-semibold">Xác thực tiền đã nhận</h3>
                                {confirmModalInvoice && (
                                    <p className="text-sm opacity-90">{confirmModalInvoice.invoice_no} · {confirmModalInvoice.customer}</p>
                                )}
                            </div>
                            <button onClick={() => {
                                setConfirmModalOpen(false);
                                setConfirmModalInvoice(null);
                                setConfirmModalPayments([]);
                            }} className="text-white/80 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            {loadingConfirmModal ? (
                                <div className="py-8 text-center text-gray-500">
                                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                                    Đang tải...
                                </div>
                            ) : confirmModalPayments.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                                    <p className="text-gray-700 font-medium">Không có yêu cầu thanh toán nào đang chờ xác nhận</p>
                                    <p className="text-sm text-gray-500 mt-1">Tất cả yêu cầu đã được xử lý hoặc chưa có yêu cầu mới</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Có <strong>{confirmModalPayments.length}</strong> yêu cầu thanh toán đang chờ xác nhận:
                                    </p>
                                    {confirmModalPayments.map((payment, idx) => (
                                        <div key={`confirm-${payment.paymentId}-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="text-lg font-bold text-gray-900 mb-2">
                                                        {fmtVND(payment.amount)} đ
                                                    </div>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Phương thức:</span>
                                                            <span>{payment.paymentMethod === "CASH" ? "Tiền mặt" : payment.paymentMethod === "TRANSFER" ? "Chuyển khoản" : payment.paymentMethod}</span>
                                                        </div>
                                                        {payment.paymentDate && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">Thời gian:</span>
                                                                <span>{new Date(payment.paymentDate).toLocaleString("vi-VN")}</span>
                                                            </div>
                                                        )}
                                                        {payment.referenceNumber && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">Mã GD:</span>
                                                                <span>{payment.referenceNumber}</span>
                                                            </div>
                                                        )}
                                                        {payment.note && (
                                                            <div className="mt-2 text-xs text-gray-500 italic">
                                                                "{payment.note}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handlePaymentConfirmClick(payment.paymentId, "CONFIRMED", payment)}
                                                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Đã nhận
                                                    </button>
                                                    <button
                                                        onClick={() => handlePaymentConfirmClick(payment.paymentId, "REJECTED", payment)}
                                                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Chưa nhận được
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => {
                                    setConfirmModalOpen(false);
                                    setConfirmModalInvoice(null);
                                    setConfirmModalPayments([]);
                                }}
                                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Confirmation Modal (giống AccountantDashboard) */}
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

/* ===== Payment History Modal ===== */
function PaymentHistoryModal({ open, invoiceId, paymentHistory, loading, onClose, onConfirm }) {
    if (!open) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case "CONFIRMED":
                return "bg-emerald-50 text-emerald-700 border-emerald-300";
            case "REJECTED":
                return "bg-rose-50 text-rose-700 border-rose-300";
            case "PENDING":
            default:
                return "bg-info-50 text-info-700 border-info-300";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "CONFIRMED":
                return "Đã xác nhận";
            case "REJECTED":
                return "Đã từ chối";
            case "PENDING":
            default:
                return "Chờ xác nhận";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "CONFIRMED":
                return <CheckCircle className="h-4 w-4" />;
            case "REJECTED":
                return <XCircle className="h-4 w-4" />;
            case "PENDING":
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <History className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                        <h2 className="text-lg font-semibold text-gray-900">Lịch sử thanh toán</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                    ) : paymentHistory.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Chưa có lịch sử thanh toán
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {paymentHistory.map((payment, idx) => (
                                <div
                                    key={`history-${payment.paymentId}-${idx}`}
                                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg font-bold text-gray-900 tabular-nums">
                                                    {fmtVND(payment.amount || 0)} đ
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${getStatusColor(payment.confirmationStatus || "PENDING")}`}>
                                                    {getStatusIcon(payment.confirmationStatus || "PENDING")}
                                                    {getStatusLabel(payment.confirmationStatus || "PENDING")}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Phương thức:</span>
                                                    <span>{payment.paymentMethod || "Không có"}</span>
                                                </div>
                                                {payment.paymentDate && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Ngày:</span>
                                                        <span>{new Date(payment.paymentDate).toLocaleString("vi-VN")}</span>
                                                    </div>
                                                )}
                                                {payment.bankName && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Ngân hàng:</span>
                                                        <span>{payment.bankName}</span>
                                                    </div>
                                                )}
                                                {payment.referenceNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Số tham chiếu:</span>
                                                        <span>{payment.referenceNumber}</span>
                                                    </div>
                                                )}
                                                {payment.note && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <span className="text-xs text-gray-500">{payment.note}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons - chỉ hiển thị nếu chưa xác nhận */}
                                        {(payment.confirmationStatus === "PENDING" || !payment.confirmationStatus) && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => onConfirm(payment.paymentId, "CONFIRMED")}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                    Đã nhận
                                                </button>
                                                <button
                                                    onClick={() => onConfirm(payment.paymentId, "REJECTED")}
                                                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Chưa nhận được
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
//
// /* ===== DEMO_INVOICES ===== */
// const DEMO_INVOICES = [
//     {
//         id: 1,
//         invoice_no:
//             "INV-2025-001",
//         customer:
//             "Công ty A",
//         order_code:
//             "ORD-701",
//         total: 5_500_000,
//         paid: 2_000_000,
//         status:
//         STATUS.UNPAID,
//         created_at:
//             "2025-10-15",
//         due_at:
//             "2025-11-15",
//     },
//     {
//         id: 2,
//         invoice_no:
//             "INV-2025-002",
//         customer:
//             "Công ty B",
//         order_code:
//             "ORD-702",
//         total: 3_250_000,
//         paid: 3_250_000,
//         status:
//         STATUS.PAID,
//         created_at:
//             "2025-10-16",
//         due_at:
//             "2025-11-16",
//     },
//     {
//         id: 3,
//         invoice_no:
//             "INV-2025-003",
//         customer:
//             "Công ty C",
//         order_code:
//             "ORD-703",
//         total: 9_900_000,
//         paid: 1_900_000,
//         status:
//         STATUS.OVERDUE,
//         created_at:
//             "2025-09-10",
//         due_at:
//             "2025-10-10",
//     },
//     {
//         id: 4,
//         invoice_no:
//             "INV-2025-004",
//         customer:
//             "Công ty D",
//         order_code:
//             "ORD-704",
//         total: 1_200_000,
//         paid: 0,
//         status:
//         STATUS.UNPAID,
//         created_at:
//             "2025-10-20",
//         due_at:
//             "2025-11-20",
//     },
// ];
