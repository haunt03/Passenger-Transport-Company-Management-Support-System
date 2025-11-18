// ConsultantOrdersPage.jsx (LIGHT THEME)
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { listBookings, createBooking } from "../../api/bookings";
import { listBranches } from "../../api/branches";
import {
    ClipboardList,
    PlusCircle,
    Search,
    Filter,
    Calendar,
    User,
    MapPin,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Eye,
    Pencil,
    Loader2,
    AlertTriangle,
    X,
    Clock,
    CarFront,
} from "lucide-react";

/**
 * Module 4 – Quản lý báo giá & đặt chuyến
 *
 * Trang này gom:
 *  - Danh sách đơn hàng (filter + sort + paging)
 *  - Modal tạo đơn hàng mới
 *  - Modal xem chi tiết đơn
 *  - Modal chỉnh sửa đơn
 *
 * Tất cả dữ liệu hiện là mock trong state.
 * Sau này bạn chỉ cần:
 *   - thay setTimeout(...) bằng fetch(...)
 *   - điều chỉnh onSave(...) để POST/PUT lên API thật
 */

/* --------------------------------------------------------- */
/* helpers                                                   */
/* --------------------------------------------------------- */
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtDateTime = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${MM}/${yyyy} ${hh}:${mm}`;
};

const fmtDateOnly = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${MM}/${yyyy}`;
};

const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0))) +
    " đ";

/* --------------------------------------------------------- */
/* Toast system (light)                                      */
/* --------------------------------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    };
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "rounded-md px-3 py-2 shadow-sm border bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-green-200 bg-green-50 text-green-700",
                        t.kind === "error" &&
                        "border-red-200 bg-red-50 text-red-700",
                        t.kind === "info" &&
                        "border-slate-200 bg-white text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* --------------------------------------------------------- */
/* constants / status helpers                                */
/* --------------------------------------------------------- */
const ORDER_STATUS = {
    DRAFT: "DRAFT",
    PENDING: "PENDING",
    ASSIGNED: "ASSIGNED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
};

const ORDER_STATUS_LABEL = {
    DRAFT: "Nháp",
    PENDING: "Chờ xử lý",
    ASSIGNED: "Đã phân xe",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
};

function OrderStatusPill({ status }) {
    let colorCls = "";
    if (status === "DRAFT") {
        colorCls =
            "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
    } else if (status === "PENDING") {
        colorCls =
            "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    } else if (status === "ASSIGNED") {
        colorCls =
            "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    } else if (status === "COMPLETED") {
        colorCls =
            "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    } else if (status === "CANCELLED") {
        colorCls =
            "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    } else {
        colorCls =
            "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
    }

    return (
        <span
            className={cls(
                "inline-flex items-center rounded-md px-2 py-[2px] text-[11px] font-medium whitespace-nowrap",
                colorCls
            )}
        >
            {ORDER_STATUS_LABEL[status] || status}
        </span>
    );
}

/* --------------------------------------------------------- */
/* MOCK DATA                                                 */
/* --------------------------------------------------------- */
// Fallback mock; thực tế sẽ dùng dữ liệu từ BE qua /api/vehicle-categories
const VEHICLE_CATEGORIES = [
    { id: "SEDAN4", label: "Sedan 4 chỗ", seats: 4 },
    { id: "SUV7", label: "SUV 7 chỗ", seats: 7 },
    { id: "BUS16", label: "Minibus 16 chỗ", seats: 16 },
];

const MOCK_ORDERS = [
    {
        id: 1001,
        code: "ORD-2025-001",
        status: ORDER_STATUS.PENDING,
        customer_name: "Nguyễn Văn A",
        customer_phone: "0901 234 567",
        customer_email: "a@example.com",
        pickup: "Sân bay Nội Bài T1",
        dropoff: "Khách sạn Pearl Westlake",
        pickup_time: "2025-10-26 08:30",
        dropoff_eta: "2025-10-26 09:30",
        vehicle_category: "Sedan 4 chỗ",
        vehicle_category_id: "SEDAN4",
        vehicle_count: 1,
        pax_count: 2,
        quoted_price: 1200000,
        discount_amount: 0,
        notes: "Khách có 2 vali. Muốn xuất hóa đơn công ty.",
    },
    {
        id: 1002,
        code: "ORD-2025-002",
        status: ORDER_STATUS.ASSIGNED,
        customer_name: "Công ty TNHH ABC",
        customer_phone: "0934 888 222",
        customer_email: "sales@abc.com",
        pickup: "Văn phòng ABC - Q1",
        dropoff: "Sân bay Tân Sơn Nhất",
        pickup_time: "2025-10-27 06:00",
        dropoff_eta: "2025-10-27 06:45",
        vehicle_category: "SUV 7 chỗ",
        vehicle_category_id: "SUV7",
        vehicle_count: 2,
        pax_count: 5,
        quoted_price: 3200000,
        discount_amount: 200000,
        notes: "Đón VIP lúc 6h đúng.",
    },
    {
        id: 1003,
        code: "ORD-2025-003",
        status: ORDER_STATUS.DRAFT,
        customer_name: "Phạm Thị B",
        customer_phone: "0987 555 111",
        customer_email: "b@example.com",
        pickup: "Hà Nội",
        dropoff: "Hải Phòng",
        pickup_time: "2025-10-28 13:00",
        dropoff_eta: "2025-10-28 15:30",
        vehicle_category: "Minibus 16 chỗ",
        vehicle_category_id: "BUS16",
        vehicle_count: 1,
        pax_count: 12,
        quoted_price: 4500000,
        discount_amount: 500000,
        notes: "Đi công tác đoàn. Yêu cầu hóa đơn đỏ.",
    },
    {
        id: 1004,
        code: "ORD-2025-004",
        status: ORDER_STATUS.COMPLETED,
        customer_name: "Trần Minh K",
        customer_phone: "0912 000 333",
        customer_email: "k@example.com",
        pickup: "Đà Nẵng",
        dropoff: "Hội An",
        pickup_time: "2025-10-20 10:00",
        dropoff_eta: "2025-10-20 11:10",
        vehicle_category: "Sedan 4 chỗ",
        vehicle_category_id: "SEDAN4",
        vehicle_count: 1,
        pax_count: 2,
        quoted_price: 900000,
        discount_amount: 0,
        notes: "Khách du lịch, trả tiền mặt.",
    },
    {
        id: 1005,
        code: "ORD-2025-005",
        status: ORDER_STATUS.CANCELLED,
        customer_name: "Lê Thị Q",
        customer_phone: "0909 222 444",
        customer_email: "q@example.com",
        pickup: "Quận 7",
        dropoff: "Bình Dương",
        pickup_time: "2025-10-22 14:00",
        dropoff_eta: "2025-10-22 15:00",
        vehicle_category: "SUV 7 chỗ",
        vehicle_category_id: "SUV7",
        vehicle_count: 1,
        pax_count: 3,
        quoted_price: 1100000,
        discount_amount: 0,
        notes: "Khách báo hủy trước 2h do đổi lịch.",
    },
];

/* --------------------------------------------------------- */
/* FILTER BAR                                                */
/* --------------------------------------------------------- */
function FilterBar({
                       statusFilter,
                       setStatusFilter,
                       dateFilter,
                       setDateFilter,
                       searchText,
                       setSearchText,
                       onClickCreate,
                       onRefresh,
                       loadingRefresh,
                   }) {
    return (
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
            {/* CTA tạo đơn hàng mới */}
            <div className="flex items-center gap-2">
                <button
                    className="rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-[13px] px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 flex items-center gap-2"
                    onClick={onClickCreate}
                    type="button"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>Tạo đơn hàng mới</span>
                </button>
            </div>

            {/* grow */}
            <div className="flex-1" />

            {/* filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                {/* Trạng thái */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 min-w-[180px] shadow-sm">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-700 flex-1"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="PENDING">Chờ xử lý</option>
                        <option value="ASSIGNED">Đã phân xe</option>
                        <option value="COMPLETED">Hoàn thành</option>
                        <option value="CANCELLED">Đã huỷ</option>
                    </select>
                </div>

                {/* Ngày đi */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 min-w-[170px] shadow-sm">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-700 flex-1"
                    />
                </div>

                {/* Tìm kiếm */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 min-w-[220px] shadow-sm">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Tìm mã đơn / SĐT khách..."
                        className="bg-transparent outline-none text-sm placeholder:text-slate-400 text-slate-700 flex-1"
                    />
                </div>

                {/* Refresh */}
                <button
                    onClick={onRefresh}
                    type="button"
                    className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-[13px] text-slate-700 px-3 py-2 flex items-center gap-2 min-w-[110px] justify-center shadow-sm"
                >
                    {loadingRefresh ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                        <ClipboardList className="h-4 w-4 text-slate-500" />
                    )}
                    <span>Làm mới</span>
                </button>
            </div>
        </div>
    );
}

/* --------------------------------------------------------- */
/* TABLE                                                      */
/* --------------------------------------------------------- */

function OrdersTable({
                         items,
                         page,
                         setPage,
                         pageSize,
                         setPageSize,
                         totalPages,
                         sortKey,
                         setSortKey,
                         sortDir,
                         setSortDir,
                         onViewDetail,
                         onEdit,
                     }) {
    const headerCell = (key, label) => (
        <th
            className="px-3 py-2 font-medium cursor-pointer select-none text-slate-500 text-[12px]"
            onClick={() => {
                if (sortKey === key) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                } else {
                    setSortKey(key);
                    setSortDir("asc");
                }
            }}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {sortKey === key ? (
                    sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                    ) : (
                        <ChevronDown className="h-3 w-3" />
                    )
                ) : null}
            </span>
        </th>
    );

    const start = (page - 1) * pageSize;
    const current = items.slice(start, start + pageSize);

    const canEdit = (status) =>
        status === ORDER_STATUS.DRAFT || status === ORDER_STATUS.PENDING;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="text-xs border-b border-slate-200 bg-slate-100/70">
                <tr>
                    {headerCell("code", "Mã đơn")}
                    {headerCell("customer_name", "Khách hàng")}
                    {headerCell("pickup", "Lịch trình")}
                    {headerCell("pickup_time", "Ngày đi")}
                    {headerCell("quoted_price", "Giá trị")}
                    {headerCell("status", "Trạng thái")}
                    <th className="px-3 py-2 font-medium text-slate-500 text-[12px]">
                        Hành động
                    </th>
                </tr>
                </thead>

                <tbody>
                {current.map((o) => (
                    <tr
                        key={o.id}
                        className="border-b border-slate-200 hover:bg-slate-50"
                    >
                        {/* Mã đơn */}
                        <td className="px-3 py-2 text-[13px] font-semibold text-slate-900 whitespace-nowrap">
                            {o.code}
                        </td>

                        {/* Khách hàng */}
                        <td className="px-3 py-2 text-[13px] text-slate-700 whitespace-nowrap">
                            <div className="flex items-start gap-2">
                                <User className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium text-slate-900 leading-tight">
                                        {o.customer_name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 leading-tight break-all">
                                        {o.customer_phone}
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* Lịch trình */}
                        <td className="px-3 py-2 text-[13px] text-slate-700 min-w-[180px]">
                            <div className="flex items-start gap-2 leading-snug">
                                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <div className="text-slate-900 font-medium">
                                        {o.pickup} → {o.dropoff}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {o.vehicle_category} ·{" "}
                                        {o.vehicle_count} xe
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* Ngày đi */}
                        <td className="px-3 py-2 text-[13px] text-slate-700 whitespace-nowrap">
                            <div className="leading-tight">
                                <div className="text-slate-900 font-medium tabular-nums">
                                    {fmtDateOnly(o.pickup_time)}
                                </div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                    {fmtDateTime(o.pickup_time).slice(-5)}{" "}
                                    ~{" "}
                                    {fmtDateTime(
                                        o.dropoff_eta
                                    ).slice(-5)}
                                </div>
                            </div>
                        </td>

                        {/* Giá trị */}
                        <td className="px-3 py-2 text-[13px] whitespace-nowrap tabular-nums">
                            <div className="flex items-start gap-1 text-emerald-600 font-semibold">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 mt-0.5" />
                                <span>{fmtVND(o.quoted_price)}</span>
                            </div>
                            {o.discount_amount > 0 ? (
                                <div className="text-[11px] text-slate-500 leading-tight">
                                    Giảm: {fmtVND(o.discount_amount)}
                                </div>
                            ) : null}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-2 text-[13px] whitespace-nowrap">
                            <OrderStatusPill status={o.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 text-[13px] whitespace-nowrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => onViewDetail(o)}
                                    className="rounded-md border border-sky-300 text-sky-700 bg-white hover:bg-sky-50 px-2.5 py-1.5 text-[12px] flex items-center gap-1 shadow-sm"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Chi tiết</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={!canEdit(o.status)}
                                    onClick={() => {
                                        if (canEdit(o.status)) onEdit(o);
                                    }}
                                    className={cls(
                                        "rounded-md border px-2.5 py-1.5 text-[12px] flex items-center gap-1 shadow-sm",
                                        canEdit(o.status)
                                            ? "border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50"
                                            : "border-slate-200 text-slate-400 bg-white cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span>Sửa</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}

                {current.length === 0 && (
                    <tr>
                        <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-slate-500 text-[13px]"
                        >
                            Không có đơn hàng phù hợp.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>

            {/* Paging footer */}
            <div className="flex items-center gap-2 justify-between px-3 py-3 border-t border-slate-200 bg-slate-50 text-sm">
                <div className="flex items-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() =>
                            setPage(Math.max(1, page - 1))
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        type="button"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="text-slate-600 text-[13px]">
                        Trang{" "}
                        <span className="font-medium text-slate-900">
                            {page}
                        </span>
                        /
                        <span className="font-medium text-slate-900">
                            {totalPages}
                        </span>
                    </div>

                    <button
                        disabled={page >= totalPages}
                        onClick={() =>
                            setPage(Math.min(totalPages, page + 1))
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        type="button"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const n = Number(e.target.value) || 10;
                            setPageSize(n);
                            setPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-[12px] text-slate-700 shadow-sm"
                    >
                        {[10, 20, 50].map((n) => (
                            <option key={n} value={n}>
                                {n}/trang
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-[11px] text-slate-500">
                    Tổng: {items.length} đơn
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------------------------- */
/* MODAL: CHI TIẾT ĐƠN (READ ONLY)                            */
/* --------------------------------------------------------- */
function OrderDetailModal({ open, order, onClose }) {
    if (!open || !order) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-3 bg-slate-50">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-slate-900">
                            <ClipboardList className="h-5 w-5 text-sky-600" />
                            <span>Đơn hàng {order.code}</span>
                            <OrderStatusPill status={order.status} />
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-3">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>
                                    {fmtDateTime(order.pickup_time)} →{" "}
                                    {fmtDateTime(order.dropoff_eta)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CarFront className="h-3.5 w-3.5 text-sky-600" />
                                <span>
                                    {order.vehicle_category} ·{" "}
                                    {order.vehicle_count} xe
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-200/60 p-1 text-slate-500"
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 text-[13px]">
                    {/* block Khách hàng */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
                            <User className="h-3.5 w-3.5 text-sky-600" />
                            Thông tin khách hàng
                        </div>
                        <div className="text-slate-900 font-medium">
                            {order.customer_name}
                        </div>
                        <div className="text-slate-600 text-[12px] break-all">
                            {order.customer_phone} · {order.customer_email}
                        </div>
                    </div>

                    {/* block Lịch trình */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                            Lịch trình
                        </div>
                        <div className="text-slate-900 font-medium">
                            {order.pickup} → {order.dropoff}
                        </div>
                        <div className="text-[12px] text-slate-600 leading-relaxed">
                            Đón: {fmtDateTime(order.pickup_time)} <br />
                            Dự kiến kết thúc:{" "}
                            {fmtDateTime(order.dropoff_eta)}
                        </div>
                        <div className="text-[12px] text-slate-600">
                            Số hành khách:{" "}
                            <span className="text-slate-900 font-medium">
                                {order.pax_count}
                            </span>{" "}
                            · Số xe:{" "}
                            <span className="text-slate-900 font-medium">
                                {order.vehicle_count}
                            </span>
                        </div>
                    </div>

                    {/* block Giá */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            Thông tin báo giá
                        </div>
                        <div className="text-slate-900 text-[13px] font-semibold flex items-baseline gap-2">
                            <span>{fmtVND(order.quoted_price)}</span>
                            {order.discount_amount > 0 ? (
                                <span className="text-[11px] text-slate-500 font-normal">
                                    (Giảm {fmtVND(order.discount_amount)})
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {/* block Notes */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            Ghi chú nội bộ
                        </div>
                        <div className="text-slate-700 leading-relaxed whitespace-pre-line text-[13px]">
                            {order.notes || "Không có ghi chú."}
                        </div>

                        {order.status === ORDER_STATUS.CANCELLED ||
                        order.status === ORDER_STATUS.DRAFT ? (
                            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-fit flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <span>
                                    Đơn đang ở trạng thái{" "}
                                    {ORDER_STATUS_LABEL[order.status]}. Hãy
                                    xác nhận lại với khách.
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-right">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 shadow-sm"
                        type="button"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------------------------- */
/* MODAL: FORM TẠO / SỬA ĐƠN HÀNG                             */
/* --------------------------------------------------------- */
/**
 * mode: "create" | "edit"
 * - create: hiển thị nút Lưu nháp / Đặt đơn
 * - edit: hiển thị nút Lưu thay đổi
 *
 * initialOrder:
 *   - khi edit => order đầy đủ
 *   - khi create => null
 *
 * onSave(resultOrder, mode)
 *   - resultOrder: object đã chuẩn hóa theo shape bảng
 *   - mode: "create" | "edit"
 */
function OrderFormModal({
                            open,
                            mode,
                            initialOrder,
                            onClose,
                            onSave,
                        }) {
    const isEdit = mode === "edit";

    // ------- form state
    const [phone, setPhone] = React.useState("");
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");

    const [hireType, setHireType] = React.useState("ONE_WAY"); // ONE_WAY / ROUND_TRIP / DAILY
    const [pickup, setPickup] = React.useState("");
    const [dropoff, setDropoff] = React.useState("");
    const [pickupTime, setPickupTime] = React.useState("");
    const [dropoffEta, setDropoffEta] = React.useState("");

    const [categoryId, setCategoryId] = React.useState("");
    // Vehicle categories từ BE
    const [categories, setCategories] = React.useState([]);
    const [loadingCats, setLoadingCats] = React.useState(false);
    // Branches (BE)
    const [branchId, setBranchId] = React.useState("");
    const [branches, setBranches] = React.useState([]);
    const [loadingBranches, setLoadingBranches] = React.useState(false);
    const [vehicleCount, setVehicleCount] = React.useState("1");
    const [paxCount, setPaxCount] = React.useState("1");

    // availability + pricing (mock)
    const [availabilityMsg, setAvailabilityMsg] = React.useState("");
    const [checkingAvail, setCheckingAvail] = React.useState(false);

    const [estimatedPrice, setEstimatedPrice] = React.useState(0);
    const [loadingPrice, setLoadingPrice] = React.useState(false);

    // discount / final price
    const [discountAmount, setDiscountAmount] =
        React.useState("0");
    const [finalPrice, setFinalPrice] = React.useState("0");

    // notes nội bộ
    const [notes, setNotes] = React.useState("");

    // error / saving
    const [error, setError] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    // Khi mở modal => load data (nếu edit) hoặc reset default (nếu create)
    React.useEffect(() => {
        if (!open) return;

        // tải danh sách loại xe từ BE
        let mounted = true;
        setLoadingCats(true);
        listVehicleCategories()
            .then((list) => {
                if (!mounted || !Array.isArray(list)) return;
                setCategories(list);
            })
            .catch(() => {})
            .finally(() => { if (mounted) setLoadingCats(false); });

        // Load branches
        setLoadingBranches(true);
        listBranches({ page: 0, size: 50 })
            .then((res) => {
                const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
                if (!mounted) return;
                setBranches(list);
                if (!branchId && list.length) setBranchId(String(list[0].branchId ?? list[0].id));
            })
            .catch(() => {})
            .finally(() => { if (mounted) setLoadingBranches(false); });

        if (isEdit && initialOrder) {
            setPhone(initialOrder.customer_phone || "");
            setName(initialOrder.customer_name || "");
            setEmail(initialOrder.customer_email || "");
            setHireType("ONE_WAY");
            setPickup(initialOrder.pickup || "");
            setDropoff(initialOrder.dropoff || "");
            setPickupTime(
                (initialOrder.pickup_time || "").replace(
                    " ",
                    "T"
                )
            );
            setDropoffEta(
                (initialOrder.dropoff_eta || "").replace(
                    " ",
                    "T"
                )
            );
            setCategoryId(String(initialOrder.vehicle_category_id || ""));
            setVehicleCount(
                String(initialOrder.vehicle_count || 1)
            );
            setPaxCount(String(initialOrder.pax_count || 1));

            setAvailabilityMsg("");
            setCheckingAvail(false);

            setEstimatedPrice(
                Number(initialOrder.quoted_price || 0) +
                Number(
                    initialOrder.discount_amount || 0
                )
            );
            setLoadingPrice(false);

            setDiscountAmount(
                String(initialOrder.discount_amount || 0)
            );
            setFinalPrice(
                String(initialOrder.quoted_price || 0)
            );

            setNotes(initialOrder.notes || "");

            setError("");
            setSaving(false);
        } else {
            setPhone("");
            setName("");
            setEmail("");
            setHireType("ONE_WAY");
            setPickup("");
            setDropoff("");
            setPickupTime("");
            setDropoffEta("");
            setCategoryId("");
            setVehicleCount("1");
            setPaxCount("1");
            setAvailabilityMsg("");
            setCheckingAvail(false);
            setEstimatedPrice(0);
            setLoadingPrice(false);
            setDiscountAmount("0");
            setFinalPrice("0");
            setNotes("");
            setError("");
            setSaving(false);
        }
    }, [open, isEdit, initialOrder]);

    // mock auto-fill khách cũ khi blur số điện thoại
    const lookupCustomerByPhone = () => {
        if (phone === "0901234567") {
            setName("Khách VIP Công ty Z");
            setEmail("vip@companyz.com");
        }
    };

    // mock check availability
    const checkAvailability = () => {
        if (!categoryId || !pickupTime || !dropoffEta) {
            setAvailabilityMsg(
                "Điền loại xe và thời gian để kiểm tra khả dụng."
            );
            return;
        }
        setCheckingAvail(true);
        setAvailabilityMsg("Đang kiểm tra...");
        setTimeout(() => {
            const count = Math.floor(Math.random() * 5) + 1;
            setAvailabilityMsg(
                count > 0
                    ? `Khả dụng: còn ${count} xe`
                    : "Cảnh báo: hết xe"
            );
            setCheckingAvail(false);
        }, 400);
    };

    // mock calculate price (ước lượng đơn giản theo tên loại xe)
    const calculatePrice = () => {
        if (!pickup || !dropoff || !categoryId) {
            setError(
                "Thiếu dữ liệu chuyến để tính giá (điểm đi/đến hoặc loại xe)."
            );
            return;
        }
        setLoadingPrice(true);
        setTimeout(() => {
            let base = 1200000;
            const sel = (categories || []).find(c => String(c.categoryId) === String(categoryId));
            const name = (sel?.categoryName || "").toLowerCase();
            if (name.includes("16")) base = 4500000;
            else if (name.includes("7")) base = 2500000;
            setEstimatedPrice(base);
            setFinalPrice((cur) =>
                Number(cur) > 0 ? cur : String(base)
            );
            setLoadingPrice(false);
            setError("");
        }, 400);
    };

    // validation
    const validCommon =
        phone.trim() &&
        name.trim() &&
        pickup.trim() &&
        dropoff.trim() &&
        pickupTime &&
        categoryId &&
        Number(finalPrice) > 0;

    // build object chuẩn shape table
    const buildOrderPayload = (statusOverride) => {
        const catObj = (categories && categories.length
                ? categories.map(c => ({ id: String(c.categoryId), label: c.categoryName }))
                : VEHICLE_CATEGORIES
        ).find((c) => String(c.id) === String(categoryId));
        return {
            branch_id: branchId ? String(branchId) : "",
            ...(isEdit
                ? {
                    id: initialOrder.id,
                    code: initialOrder.code,
                }
                : {}),

            status:
                statusOverride ||
                (initialOrder?.status || "DRAFT"),

            customer_name: name,
            customer_phone: phone,
            customer_email: email,

            pickup,
            dropoff,

            pickup_time: pickupTime.replace("T", " "),
            dropoff_eta: dropoffEta
                ? dropoffEta.replace("T", " ")
                : pickupTime.replace("T", " "),

            vehicle_category: catObj ? catObj.label : "—",
            vehicle_category_id: categoryId,
            vehicle_count: Number(vehicleCount) || 1,
            pax_count: Number(paxCount) || 1,

            quoted_price: Number(finalPrice) || 0,
            discount_amount:
                Number(discountAmount) || 0,
            notes,
        };
    };

    // submit create (draft)
    const saveDraft = async () => {
        if (!validCommon) {
            setError(
                "Vui lòng nhập đủ thông tin bắt buộc và giá hợp lệ."
            );
            return;
        }
        setSaving(true);
        setError("");
        await new Promise((r) => setTimeout(r, 400));
        const payload = buildOrderPayload("DRAFT");
        onSave(payload, "create");
        onClose();
    };

    // submit create (pending)
    const submitPending = async () => {
        if (!validCommon) {
            setError(
                "Vui lòng nhập đủ thông tin bắt buộc và giá hợp lệ."
            );
            return;
        }
        setSaving(true);
        setError("");
        await new Promise((r) => setTimeout(r, 400));
        const payload = buildOrderPayload("PENDING");
        onSave(payload, "create");
        onClose();
    };

    // submit edit
    const saveChanges = async () => {
        if (!validCommon) {
            setError(
                "Vui lòng nhập đủ thông tin bắt buộc và giá hợp lệ."
            );
            return;
        }
        setSaving(true);
        setError("");
        await new Promise((r) => setTimeout(r, 400));
        const payload = buildOrderPayload();
        onSave(payload, "edit");
        onClose();
    };

    if (!open) return null;

    const inputCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500";
    const labelCls = "text-[12px] text-slate-600 mb-1";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-3 bg-slate-50">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-slate-900">
                            <ClipboardList className="h-5 w-5 text-sky-600" />
                            {isEdit ? (
                                <>
                                    <span>
                                        Chỉnh sửa đơn{" "}
                                        {initialOrder?.code}
                                    </span>
                                    <OrderStatusPill
                                        status={
                                            initialOrder?.status ||
                                            "DRAFT"
                                        }
                                    />
                                </>
                            ) : (
                                <span>
                                    Tạo đơn hàng mới
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Nhập thông tin khách / hành trình /
                            báo giá
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md hover:bg-slate-200/60 p-1 text-slate-500"
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-6 text-[13px]">
                    {/* --- KHÁCH HÀNG --- */}
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-sky-600" />
                            Thông tin khách hàng
                        </div>

                        <div className="grid md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                                <div className={labelCls}>
                                    Số điện thoại *
                                </div>
                                <input
                                    className={inputCls}
                                    placeholder="VD: 0901234567"
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(
                                            e.target.value.replace(
                                                /[^0-9+]/g,
                                                ""
                                            )
                                        )
                                    }
                                    onBlur={lookupCustomerByPhone}
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Tự động fill tên/email nếu
                                    khách cũ
                                </div>
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Tên khách hàng *
                                </div>
                                <input
                                    className={inputCls}
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Email
                                </div>
                                <input
                                    className={inputCls}
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>
                    </section>

                    {/* --- HÀNH TRÌNH --- */}
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                            Hành trình & Thời gian
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                            <div>
                                <div className={labelCls}>
                                    Điểm đón *
                                </div>
                                <input
                                    className={inputCls}
                                    value={pickup}
                                    onChange={(e) =>
                                        setPickup(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Sân bay Nội Bài T1"
                                />
                            </div>
                            <div>
                                <div className={labelCls}>
                                    Điểm đến *
                                </div>
                                <input
                                    className={inputCls}
                                    value={dropoff}
                                    onChange={(e) =>
                                        setDropoff(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Khách sạn Pearl Westlake"
                                />
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Thời gian đón *
                                </div>
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={pickupTime}
                                    onChange={(e) =>
                                        setPickupTime(
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Kết thúc (dự kiến)
                                </div>
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={dropoffEta}
                                    onChange={(e) =>
                                        setDropoffEta(
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-3">
                            <div>
                                <div className={labelCls}>
                                    Chi nhánh
                                </div>
                                <select
                                    className={inputCls}
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                >
                                    <option value="">-- Chọn chi nhánh --</option>
                                    {branches.map((b) => (
                                        <option key={b.branchId ?? b.id} value={String(b.branchId ?? b.id)}>
                                            {b.branchName || `Branch #${b.branchId ?? b.id}`}
                                        </option>
                                    ))}
                                </select>
                                {loadingBranches && (
                                    <div className="text-xs text-slate-500 mt-1">Đang tải chi nhánh...</div>
                                )}
                            </div>
                            <div>
                                <div className={labelCls}>
                                    Hình thức thuê
                                </div>
                                <select
                                    className={inputCls}
                                    value={hireType}
                                    onChange={(e) =>
                                        setHireType(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="ONE_WAY">
                                        Một chiều
                                    </option>
                                    <option value="ROUND_TRIP">
                                        Hai chiều
                                    </option>
                                    <option value="DAILY">
                                        Thuê theo ngày
                                    </option>
                                </select>
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Loại xe yêu cầu *
                                </div>
                                <select
                                    className={inputCls}
                                    value={categoryId}
                                    onChange={(e) =>
                                        setCategoryId(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        -- Chọn loại xe --
                                    </option>
                                    {(categories.length ? categories : VEHICLE_CATEGORIES).map((c) => (
                                        <option
                                            key={c.categoryId ?? c.id}
                                            value={String(c.categoryId ?? c.id)}
                                        >
                                            {c.categoryName ?? c.label}
                                            {c.seats ? ` (${c.seats} chỗ)` : ""}
                                        </option>
                                    ))}
                                </select>
                                {loadingCats && (
                                    <div className="text-xs text-slate-500 mt-1">Đang tải loại xe...</div>
                                )}
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Số xe
                                </div>
                                <input
                                    className={inputCls}
                                    value={vehicleCount}
                                    onChange={(e) =>
                                        setVehicleCount(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                />
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Số hành khách
                                </div>
                                <input
                                    className={inputCls}
                                    value={paxCount}
                                    onChange={(e) =>
                                        setPaxCount(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center text-[11px] text-slate-500">
                            <button
                                type="button"
                                onClick={checkAvailability}
                                className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-2 text-slate-700 shadow-sm"
                            >
                                {checkingAvail ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                ) : (
                                    <CarFront className="h-3.5 w-3.5 text-sky-600" />
                                )}
                                <span>Kiểm tra xe trống</span>
                            </button>

                            <div className="text-slate-600 md:flex-1">
                                {availabilityMsg
                                    ? availabilityMsg
                                    : "Chưa kiểm tra"}
                            </div>
                        </div>
                    </section>

                    {/* --- GIÁ / GIẢM GIÁ --- */}
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            Báo giá
                        </div>

                        <div className="grid md:grid-cols-3 gap-3">
                            <div>
                                <div className={labelCls}>
                                    Giá hệ thống (ước tính)
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        className={inputCls + " tabular-nums"}
                                        value={
                                            estimatedPrice
                                                ? estimatedPrice
                                                : ""
                                        }
                                        readOnly
                                        placeholder="0"
                                    />
                                    <button
                                        type="button"
                                        onClick={calculatePrice}
                                        className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1 text-slate-700 shadow-sm"
                                    >
                                        {loadingPrice ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                        ) : (
                                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                        )}
                                        <span>Tính giá</span>
                                    </button>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Gọi API /calculate-price
                                </div>
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Giảm giá (VND)
                                </div>
                                <input
                                    className={inputCls + " tabular-nums"}
                                    value={discountAmount}
                                    onChange={(e) =>
                                        setDiscountAmount(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                    VD: ưu đãi khách quen
                                </div>
                            </div>

                            <div>
                                <div className={labelCls}>
                                    Giá báo khách cuối cùng *
                                </div>
                                <input
                                    className={inputCls + " tabular-nums"}
                                    value={finalPrice}
                                    onChange={(e) =>
                                        setFinalPrice(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Giá chốt để báo khách / xuất
                                    HĐ
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className={labelCls}>
                                Ghi chú nội bộ
                            </div>
                            <textarea
                                className={cls(
                                    inputCls,
                                    "min-h-[80px] resize-none"
                                )}
                                rows={3}
                                value={notes}
                                onChange={(e) =>
                                    setNotes(e.target.value)
                                }
                                placeholder="Ví dụ: Khách yêu cầu hoá đơn VAT công ty, thanh toán sau."
                            />
                        </div>
                    </section>

                    {/* lỗi form */}
                    {error ? (
                        <div className="text-red-600 text-[12px]">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2 justify-between items-center text-[13px]">
                    <div className="text-[11px] text-slate-400">
                        {isEdit
                            ? "PUT /api/orders/{orderId}"
                            : "POST /api/orders"}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                            type="button"
                        >
                            Huỷ
                        </button>

                        {isEdit ? (
                            <button
                                onClick={saveChanges}
                                disabled={saving}
                                type="button"
                                className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[13px] text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving
                                    ? "Đang lưu..."
                                    : "Lưu thay đổi"}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={saveDraft}
                                    disabled={saving}
                                    type="button"
                                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving
                                        ? "Đang lưu..."
                                        : "Lưu nháp"}
                                </button>

                                <button
                                    onClick={submitPending}
                                    disabled={saving}
                                    type="button"
                                    className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[13px] text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving
                                        ? "Đang gửi..."
                                        : "Đặt đơn"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------------------------- */
/* MAIN PAGE                                                 */
/* --------------------------------------------------------- */
export default function ConsultantOrdersPage() {
    const { toasts, push } = useToasts();
    const location = useLocation();
    const navigate = useNavigate();

    // filters
    const [statusFilter, setStatusFilter] = React.useState("");
    const [dateFilter, setDateFilter] = React.useState("");
    const [searchText, setSearchText] = React.useState("");

    // list data
    const [orders, setOrders] = React.useState(MOCK_ORDERS);

    // default branch to use when creating from quick modal
    const [defaultBranchId, setDefaultBranchId] = React.useState(null);
    React.useEffect(() => {
        (async () => {
            try {
                const res = await listBranches({ page: 0, size: 1 });
                const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
                if (list.length) setDefaultBranchId(list[0].branchId ?? list[0].id ?? null);
            } catch {}
        })();
    }, []);

    // load from backend on mount
    React.useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const list = await listBookings({});
                if (!mounted || !Array.isArray(list)) return;
                const mapped = list.map(b => ({
                    id: b.id,
                    code: `ORD-${b.id}`,
                    status: b.status || "PENDING",
                    customer_name: b.customerName,
                    customer_phone: b.customerPhone,
                    pickup: (b.routeSummary || "").split(" → ")[0] || "",
                    dropoff: (b.routeSummary || "").split(" → ")[1] || "",
                    pickup_time: b.startDate,
                    dropoff_eta: b.startDate,
                    vehicle_category: "",
                    vehicle_category_id: "",
                    vehicle_count: 1,
                    pax_count: 0,
                    quoted_price: b.totalCost,
                    discount_amount: 0,
                    notes: "",
                }));
                setOrders(mapped);
            } catch (e) {
                // keep mock if fails
                push("Không tải được danh sách đơn hàng", "error");
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    // if navigated back with refresh flag, reload list then clear state
    React.useEffect(() => {
        const st = location.state;
        if (st && st.refresh) {
            (async () => {
                try {
                    const list = await listBookings({});
                    const mapped = (list || []).map(b => ({
                        id: b.id,
                        code: `ORD-${b.id}`,
                        status: b.status || "PENDING",
                        customer_name: b.customerName,
                        customer_phone: b.customerPhone,
                        pickup: (b.routeSummary || "").split(" → ")[0] || "",
                        dropoff: (b.routeSummary || "").split(" → ")[1] || "",
                        pickup_time: b.startDate,
                        dropoff_eta: b.startDate,
                        vehicle_category: "",
                        vehicle_category_id: "",
                        vehicle_count: 1,
                        pax_count: 0,
                        quoted_price: b.totalCost,
                        discount_amount: 0,
                        notes: "",
                    }));
                    setOrders(mapped);
                    if (st.toast) push(st.toast, "success");
                } catch {}
                // clear navigation state
                navigate(location.pathname, { replace: true, state: {} });
            })();
        }
    }, [location]);

    // paging / sort
    const [sortKey, setSortKey] =
        React.useState("pickup_time");
    const [sortDir, setSortDir] = React.useState("asc");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    // refresh state
    const [loadingRefresh, setLoadingRefresh] =
        React.useState(false);

    // modal states
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [detailOrder, setDetailOrder] =
        React.useState(null);

    const [formOpen, setFormOpen] = React.useState(false);
    const [formMode, setFormMode] = React.useState("create"); // "create" | "edit"
    const [formOrder, setFormOrder] = React.useState(null);

    // lọc + sort
    const filteredSorted = React.useMemo(() => {
        const q = searchText.trim().toLowerCase();

        const afterFilter = orders.filter((o) => {
            if (statusFilter && o.status !== statusFilter)
                return false;
            if (
                dateFilter &&
                o.pickup_time &&
                !String(o.pickup_time).startsWith(
                    dateFilter
                )
            )
                return false;
            if (
                q &&
                !(
                    String(o.code)
                        .toLowerCase()
                        .includes(q) ||
                    String(o.customer_phone)
                        .toLowerCase()
                        .includes(q)
                )
            )
                return false;
            return true;
        });

        const arr = [...afterFilter];
        arr.sort((a, b) => {
            let A, B;
            if (sortKey === "code") {
                A = a.code;
                B = b.code;
            } else if (sortKey === "customer_name") {
                A = a.customer_name;
                B = b.customer_name;
            } else if (sortKey === "pickup_time") {
                A = a.pickup_time;
                B = b.pickup_time;
            } else if (sortKey === "quoted_price") {
                A = a.quoted_price;
                B = b.quoted_price;
            } else if (sortKey === "status") {
                A = a.status;
                B = b.status;
            } else {
                A = a.pickup_time;
                B = b.pickup_time;
            }
            if (A < B)
                return sortDir === "asc" ? -1 : 1;
            if (A > B)
                return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return arr;
    }, [
        orders,
        statusFilter,
        dateFilter,
        searchText,
        sortKey,
        sortDir,
    ]);

    // tổng trang
    const totalPages = Math.max(
        1,
        Math.ceil(filteredSorted.length / pageSize)
    );

    // nếu filter làm giảm data thì sửa page lại cho hợp lệ
    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    /* ------ handlers UI ------ */

    // chuyển sang trang tạo đơn
    const handleCreate = () => {
        navigate('/orders/new');
    };

    // chuyển sang trang chi tiết đơn
    const handleViewDetail = (order) => {
        if (order && order.id != null) {
            navigate(`/orders/${order.id}`);
            return;
        }
        // fallback: nếu thiếu id thì không điều hướng
    };

    // chuyển sang trang sửa / gán tài xế
    const handleEdit = (order) => {
        if (order && order.id != null) {
            navigate(`/orders/${order.id}/edit`, { state: { order } });
            return;
        }
        // fallback: open modal cũ nếu thiếu id
        setFormMode("edit");
        setFormOrder(order);
        setFormOpen(true);
    };

    // refresh from backend
    const handleRefresh = async () => {
        setLoadingRefresh(true);
        try {
            const list = await listBookings({});
            const mapped = (list || []).map(b => ({
                id: b.id,
                code: `ORD-${b.id}`,
                status: b.status || "PENDING",
                customer_name: b.customerName,
                customer_phone: b.customerPhone,
                pickup: (b.routeSummary || "").split(" → ")[0] || "",
                dropoff: (b.routeSummary || "").split(" → ")[1] || "",
                pickup_time: b.startDate,
                dropoff_eta: b.startDate,
                vehicle_category: "",
                vehicle_category_id: "",
                vehicle_count: 1,
                pax_count: 0,
                quoted_price: b.totalCost,
                discount_amount: 0,
                notes: "",
            }));
            setOrders(mapped);
            push("Đã làm mới danh sách đơn hàng", "success");
        } catch (e) {
            push("Không tải được danh sách đơn hàng", "error");
        } finally {
            setLoadingRefresh(false);
        }
    };

    /**
     * khi form create / edit bấm lưu,
     * resultOrder = object chuẩn (không có id/code khi create)
     */
    const handleSaveFromForm = async (resultOrder, mode) => {
        if (mode === "create") {
            // Map quick modal payload -> backend CreateBookingRequest
            const toIsoZ = (s) => {
                if (!s) return null;
                const d = new Date(String(s).replace(" ", "T"));
                return Number.isNaN(d.getTime()) ? null : d.toISOString();
            };
            const branchId = Number(resultOrder.branch_id || defaultBranchId || 1);
            try {
                await createBooking({
                    customer: {
                        fullName: resultOrder.customer_name,
                        phone: resultOrder.customer_phone,
                        email: resultOrder.customer_email,
                    },
                    branchId,
                    useHighway: false,
                    trips: [{
                        startTime: toIsoZ(resultOrder.pickup_time),
                        endTime: toIsoZ(resultOrder.dropoff_eta || resultOrder.pickup_time),
                        startLocation: resultOrder.pickup,
                        endLocation: resultOrder.dropoff,
                    }],
                    vehicles: [{
                        vehicleCategoryId: Number(resultOrder.vehicle_category_id),
                        quantity: Number(resultOrder.vehicle_count || 1),
                    }],
                    estimatedCost: Number(resultOrder.quoted_price || 0) + Number(resultOrder.discount_amount || 0),
                    discountAmount: Number(resultOrder.discount_amount || 0),
                    totalCost: Number(resultOrder.quoted_price || 0),
                    status: resultOrder.status || "DRAFT",
                    note: resultOrder.notes || "",
                });
                // refresh list from backend to show the new booking
                await handleRefresh();
                push("Đã tạo đơn hàng", "success");
            } catch (e) {
                push("Tạo đơn hàng thất bại", "error");
            }
        } else {
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === resultOrder.id
                        ? { ...o, ...resultOrder }
                        : o
                )
            );
            push(
                "Đã cập nhật đơn " +
                resultOrder.code,
                "success"
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-sky-600" />
                            <span>Danh sách đơn hàng</span>
                        </div>

                        <span className="rounded-md border border-slate-300 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium flex items-center gap-1">
                            <span>Chi nhánh của bạn</span>
                        </span>
                    </div>

                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2">
                        <span>
                            Theo dõi các đơn hàng trong chi
                            nhánh, trạng thái xử lý và giá
                            báo khách.
                        </span>
                    </div>

                    {orders.some(
                        (o) =>
                            o.status ===
                            ORDER_STATUS.CANCELLED ||
                            o.status ===
                            ORDER_STATUS.DRAFT
                    ) ? (
                        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 max-w-fit">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span>
                                Có đơn bị huỷ hoặc nháp. Hãy
                                kiểm tra và chốt lại với
                                khách.
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* FILTER CARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5 shadow-sm">
                <FilterBar
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    searchText={searchText}
                    setSearchText={setSearchText}
                    onClickCreate={handleCreate}
                    onRefresh={handleRefresh}
                    loadingRefresh={loadingRefresh}
                />
            </div>

            {/* TABLE CARD */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/70 text-[13px] text-slate-600 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                    <div className="font-medium text-slate-900">
                        Đơn hàng
                    </div>
                    <div className="text-[11px] text-slate-500">
                        ({filteredSorted.length} đơn)
                    </div>
                </div>

                <OrdersTable
                    items={filteredSorted}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalPages={totalPages}
                    sortKey={sortKey}
                    setSortKey={setSortKey}
                    sortDir={sortDir}
                    setSortDir={setSortDir}
                    onViewDetail={handleViewDetail}
                    onEdit={handleEdit}
                />

                <div className="px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50">
                    Design-only: Dữ liệu đang mock. Lọc
                    theo chi nhánh + phân trang thực sẽ do
                    API trả về.
                </div>
            </div>

            {/* MODAL CHI TIẾT */}
            <OrderDetailModal
                open={detailOpen}
                order={detailOrder}
                onClose={() => setDetailOpen(false)}
            />

            {/* MODAL TẠO / SỬA */}
            <OrderFormModal
                open={formOpen}
                mode={formMode}
                initialOrder={formOrder}
                onClose={() => setFormOpen(false)}
                onSave={handleSaveFromForm}
            />
        </div>
    );
}
