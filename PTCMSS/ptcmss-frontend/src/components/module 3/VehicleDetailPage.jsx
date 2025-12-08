// VehicleDetailPage.jsx (LIGHT THEME VERSION)
import React from "react";
import { useParams } from "react-router-dom";
import {
    getVehicle,
    updateVehicle,
    listVehicleCategories,
    getVehicleTrips,
    getVehicleExpenses,
    getVehicleMaintenance,
} from "../../api/vehicles";
import { listBranches } from "../../api/branches";
import { getCurrentRole, ROLES } from "../../utils/session";
import {
    CarFront,
    Wrench,
    Fuel,
    Clock,
    MapPin,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    Save,
    X,
    Gauge,
} from "lucide-react";

/**
 * M3.S6 - Vehicle Detail / Update Profile
 *
 * Tabs:
 *  1. Hồ sơ xe (cập nhật thông tin chính + trạng thái)
 *  2. Lịch sử chuyến đi (trip history)
 *  3. Chi phí & bảo trì (expenses)
 *
 * API sau này:
 *  GET /api/vehicles/{vehicleId}
 *  PUT /api/vehicles/{vehicleId}
 *  GET /api/vehicles/{vehicleId}/trips
 *  GET /api/vehicles/{vehicleId}/expenses
 */

/* ---------------- helpers ---------------- */
const cls = (...a) => a.filter(Boolean).join(" ");

// format "2025-10-26" -> "26/10/2025"
const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
};

// format datetime-ish -> "HH:MM DD/MM"
const fmtDateTimeShort = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${MM}`;
};

/* ---------------- status badge ---------------- */
const STATUS_LABEL = {
    AVAILABLE: "Sẵn sàng",
    INUSE: "Đang sử dụng",
    MAINTENANCE: "Bảo trì",
    INACTIVE: "Không hoạt động",
    COMPLETED: "Hoàn thành",
    ONGOING: "Đang thực hiện",
};

function VehicleStatusBadge({ status }) {
    // light pills
    let classes = "";
    let IconEl = null;

    if (status === "AVAILABLE") {
        classes =
            "bg-green-50 text-green-700 border-green-200";
        IconEl = (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        );
    } else if (status === "COMPLETED") {
        classes =
            "bg-green-50 text-green-700 border-green-200";
        IconEl = (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        );
    } else if (status === "ONGOING") {
        classes =
            "bg-sky-50 text-sky-700 border-sky-200";
        IconEl = (
            <CarFront className="h-3.5 w-3.5 text-sky-600" />
        );
    } else if (status === "INUSE") {
        classes =
            "bg-sky-50 text-sky-700 border-sky-200";
        IconEl = (
            <CarFront className="h-3.5 w-3.5 text-sky-600" />
        );
    } else if (status === "MAINTENANCE") {
        classes =
            "bg-amber-50 text-amber-700 border-amber-200";
        IconEl = (
            <Wrench className="h-3.5 w-3.5 text-amber-600" />
        );
    } else if (status === "INACTIVE") {
        classes =
            "bg-gray-50 text-gray-700 border-gray-200";
        IconEl = (
            <X className="h-3.5 w-3.5 text-gray-600" />
        );
    } else {
        classes =
            "bg-slate-100 text-slate-600 border-slate-300";
        IconEl = (
            <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
        );
    }

    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 rounded-md border px-2 py-[2px] text-[11px] font-medium leading-none",
                classes
            )}
        >
            {IconEl}
            <span>{STATUS_LABEL[status] || status}</span>
        </span>
    );
}

/* ---------------- toast system (light) ---------------- */
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
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "flex items-start gap-2 rounded-md border px-3 py-2 shadow-sm bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-green-200 text-green-700 bg-green-50",
                        t.kind === "error" &&
                        "border-red-200 text-red-700 bg-red-50"
                    )}
                >
                    {t.kind === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : null}
                    <div className="leading-snug">{t.msg}</div>
                </div>
            ))}
        </div>
    );
}

/* ---------------- Tab buttons ---------------- */
function TabBar({ active, setActive }) {
    const tabs = [
        { key: "PROFILE", label: "Hồ sơ xe" },
        { key: "TRIPS", label: "Lịch sử chuyến đi" },
        { key: "COSTS", label: "Chi phí & bảo trì" },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    onClick={() => setActive(t.key)}
                    className={cls(
                        "rounded-md px-3 py-2 text-[13px] font-medium border shadow-sm transition-colors",
                        active === t.key
                            ? "bg-white text-sky-700 border-sky-300 ring-2 ring-sky-500/20"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                    )}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}

/* ---------------- Tab 1: Hồ sơ xe ---------------- */
function VehicleProfileTab({ form, setForm, onSave, dirty, readOnly = false, isCoordinator = false }) {
    const numericOnly = (s) => s.replace(/[^0-9]/g, "");

    const handleChange = (field) => (e) => {
        if (readOnly) return;
        const val = e.target.value;
        if (field === "year") {
            setForm((f) => ({ ...f, [field]: numericOnly(val) }));
        } else {
            setForm((f) => ({ ...f, [field]: val }));
        }
    };

    const inputCls = cls(
        "w-full rounded-md border px-3 py-2 text-[13px] outline-none shadow-sm",
        "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
        readOnly && "bg-slate-100 text-slate-500 cursor-not-allowed"
    );

    const selectCls = cls(
        "w-full rounded-md border px-3 py-2 text-[13px] outline-none shadow-sm",
        "border-slate-300 bg-white text-slate-700",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
        readOnly && "bg-slate-100 text-slate-500 cursor-not-allowed"
    );

    return (
        <div className="space-y-5 text-[13px] text-slate-700">
            {/* card: form chính */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Biển số (read-only) */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Biển số xe
                        </div>
                        <input
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed"
                            value={form.license_plate}
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Danh mục xe */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Danh mục xe
                        </div>
                        {readOnly || isCoordinator ? (
                            <input
                                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed w-full"
                                value={form.category_name || "—"}
                                readOnly
                                disabled
                            />
                        ) : (
                            <select
                                className={selectCls}
                                value={form.category_id}
                                onChange={handleChange("category_id")}
                                disabled={readOnly}
                            >
                                {form._categoryOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name.includes('chỗ') ? c.name : `${c.name} (${c.seats} chỗ)`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Chi nhánh */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Chi nhánh quản lý
                        </div>
                        {readOnly ? (
                            <input
                                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed w-full"
                                value={form.branch_name || "—"}
                                readOnly
                                disabled
                            />
                        ) : (
                            <select
                                className={selectCls}
                                value={form.branch_id}
                                onChange={handleChange("branch_id")}
                                disabled={readOnly}
                            >
                                {form._branchOptions.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Trạng thái xe */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Trạng thái
                        </div>
                        <select
                            className={selectCls}
                            value={form.status}
                            onChange={handleChange("status")}
                            disabled={readOnly}
                        >
                            <option value="AVAILABLE">Sẵn sàng</option>
                            <option value="MAINTENANCE">Bảo trì</option>
                            <option value="INACTIVE">Ngưng sử dụng</option>
                        </select>
                    </div>

                    {/* Hãng sản xuất */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Hãng sản xuất
                        </div>
                        <input
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed"
                            value={form.brand}
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Dòng xe */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Dòng xe
                        </div>
                        <input
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed"
                            value={form.model}
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Năm sản xuất */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Năm sản xuất
                        </div>
                        <input
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed"
                            value={form.year}
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Số ghế */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Số ghế
                        </div>
                        {readOnly || isCoordinator ? (
                            <input
                                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed w-full"
                                value={form.capacity != null ? form.capacity : "—"}
                                readOnly
                                disabled
                            />
                        ) : (
                            <input
                                type="number"
                                min="1"
                                max="100"
                                className={inputCls}
                                value={form.capacity != null ? form.capacity : ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "") {
                                        setForm((f) => ({ ...f, capacity: null }));
                                    } else {
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num) && num > 0) {
                                            setForm((f) => ({ ...f, capacity: num }));
                                        }
                                    }
                                }}
                                disabled={readOnly}
                                placeholder="Nhập số ghế"
                            />
                        )}
                    </div>

                    {/* Ngày đăng kiểm tiếp theo */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Ngày đăng kiểm tiếp theo
                        </div>
                        {readOnly ? (
                            <input
                                type="date"
                                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed"
                                value={form.reg_due_date || ""}
                                readOnly
                                disabled
                            />
                        ) : (
                            <input
                                type="date"
                                className={inputCls}
                                value={form.reg_due_date || ""}
                                onChange={handleChange("reg_due_date")}
                                disabled={readOnly}
                            />
                        )}
                    </div>

                    {/* Hết hạn bảo hiểm TNDS */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Hết hạn bảo hiểm TNDS
                        </div>
                        <input
                            type="date"
                            className={selectCls}
                            value={form.ins_due_date || ""}
                            onChange={handleChange("ins_due_date")}
                            disabled={readOnly}
                        />
                    </div>

                    {/* Odometer (Quãng đường đã chạy) - Read-only */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Quãng đường đã chạy (km)
                        </div>
                        <input
                            type="text"
                            className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 font-medium cursor-not-allowed w-full"
                            value={form.odometer != null ? form.odometer.toLocaleString("vi-VN") : "—"}
                            readOnly
                            disabled
                        />
                    </div>
                </div>
            </div>

            {/* card: preview status */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700 flex flex-col gap-2 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-slate-800 font-medium">
                    <CarFront className="h-4 w-4 text-sky-600" />
                    <div>
                        {form.license_plate} ·{" "}
                        <span className="text-slate-900 font-semibold">
                            {form.model || "—"} {form.year || ""}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] leading-relaxed">
                    <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                            Đăng kiểm:{" "}
                            <span className="text-slate-800 font-medium">
                                {fmtDate(form.reg_due_date)}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-600">
                        <Wrench className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                            Trạng thái:{" "}
                            <span className="text-slate-800 font-medium">
                                {STATUS_LABEL[form.status] || form.status}
                            </span>
                        </span>
                    </div>

                    {form.odometer != null && (
                        <div className="flex items-center gap-1 text-slate-600">
                            <Gauge className="h-3.5 w-3.5 text-emerald-500" />
                            <span>
                                Quãng đường:{" "}
                                <span className="text-slate-800 font-medium">
                                    {form.odometer.toLocaleString("vi-VN")} km
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* save button row */}
            {!readOnly && (
                <div className="flex justify-end">
                    <button
                        disabled={!dirty}
                        onClick={onSave}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                            dirty
                                ? "bg-sky-600 hover:bg-sky-500 text-white"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        <span>Lưu thay đổi</span>
                    </button>
                </div>
            )}

            {/* dev note */}
            {/* <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 shadow-sm">
                Khi bấm Lưu thay đổi:
                {" "}PUT /api/vehicles/
                <span className="text-slate-700 font-medium">{form.id}</span>{" "}
                với body như status, reg_due_date, ins_due_date...
            </div> */}
        </div>
    );
}

/* ---------------- Tab 2: Lịch sử chuyến đi ---------------- */
function TripHistoryTab({ trips }) {
    // simple paging local
    const [page, setPage] = React.useState(1);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(trips.length / pageSize));
    const start = (page - 1) * pageSize;
    const slice = trips.slice(start, start + pageSize);

    return (
        <div className="space-y-4 text-[13px] text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                {/* header */}
                <div className="flex items-center gap-2 text-slate-800 font-medium text-[13px]">
                    <CarFront className="h-4 w-4 text-sky-600" />
                    <span>
                        Lịch sử chuyến đi ({trips.length})
                    </span>
                </div>

                {/* table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-[13px]">
                        <thead className="text-[11px] uppercase tracking-wide bg-slate-100/60 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-medium">Mã chuyến</th>
                                <th className="px-3 py-2 font-medium">Khách</th>
                                <th className="px-3 py-2 font-medium">Địa điểm đón</th>
                                <th className="px-3 py-2 font-medium">Thời gian đón</th>
                                <th className="px-3 py-2 font-medium text-right">Tình trạng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {slice.map((t) => (
                                <tr
                                    key={t.id}
                                    className="hover:bg-slate-50"
                                >
                                    <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                                        {t.code}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                        {t.customer_name}
                                        <div className="text-[11px] text-slate-500">
                                            {t.customer_phone}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">
                                        <div className="flex items-start gap-1 text-[12px] leading-relaxed">
                                            <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                            <span>{t.pickup}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                        <div className="flex items-start gap-1 text-[12px] leading-relaxed">
                                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>
                                                {fmtDateTimeShort(t.pickup_time)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                        <VehicleStatusBadge status={t.status} />
                                    </td>
                                </tr>
                            ))}

                            {slice.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-3 py-6 text-center text-slate-400 text-[13px]"
                                    >
                                        Chưa có chuyến nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* pager */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-slate-700">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(Math.max(1, page - 1))}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        >
                            <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </button>

                        <div className="text-slate-700">
                            Trang{" "}
                            <span className="font-medium">{page}</span>/
                            <span className="font-medium">{totalPages}</span>
                        </div>

                        <button
                            disabled={page >= totalPages}
                            onClick={() =>
                                setPage(Math.min(totalPages, page + 1))
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        >
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    <div className="text-[11px] text-slate-500">
                        Tổng chuyến: {trips.length}
                    </div>
                </div>

                {/* note */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 shadow-sm">
                    Dữ liệu từ API:
                    <br />
                    GET /api/vehicles/
                    <span className="text-slate-700 font-medium">123</span>
                    /trips
                </div>
            </div>
        </div>
    );
}

/* ---------------- Tab 3: Chi phí & bảo trì ---------------- */
function ExpenseHistoryTab({ expenses }) {
    const [page, setPage] = React.useState(1);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
    const start = (page - 1) * pageSize;
    const slice = expenses.slice(start, start + pageSize);

    const sumCost = slice.reduce(
        (acc, e) => acc + Number(e.amount || 0),
        0
    );

    return (
        <div className="space-y-4 text-[13px] text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                {/* header */}
                <div className="flex items-center gap-2 text-slate-800 font-medium text-[13px]">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span>
                        Chi phí & bảo trì ({expenses.length})
                    </span>
                </div>

                {/* table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-[13px]">
                        <thead className="text-[11px] uppercase tracking-wide bg-slate-100/60 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-medium">Ngày</th>
                                <th className="px-3 py-2 font-medium">Loại chi phí</th>
                                <th className="px-3 py-2 font-medium">Mô tả</th>
                                <th className="px-3 py-2 font-medium text-right">
                                    Số tiền
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {slice.map((e) => (
                                <tr
                                    key={e.id}
                                    className="hover:bg-slate-50"
                                >
                                    <td className="px-3 py-2 text-[12px] text-slate-700 whitespace-nowrap">
                                        <div className="flex items-start gap-1 leading-relaxed">
                                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span>{fmtDate(e.date)}</span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-[12px] text-slate-700 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {e.type === "FUEL" ? (
                                                <Fuel className="h-3.5 w-3.5 text-sky-600" />
                                            ) : (
                                                <Wrench className="h-3.5 w-3.5 text-amber-600" />
                                            )}
                                            <span className="font-medium text-slate-900">
                                                {e.type_label}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-2 text-[12px] text-slate-600">
                                        {e.note || "—"}
                                    </td>

                                    <td className="px-3 py-2 text-[12px] text-right whitespace-nowrap tabular-nums text-slate-900">
                                        {Number(e.amount || 0).toLocaleString(
                                            "vi-VN"
                                        )}
                                        đ
                                    </td>
                                </tr>
                            ))}

                            {slice.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-3 py-6 text-center text-slate-400 text-[13px]"
                                    >
                                        Chưa có chi phí nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* footer/pager + summary */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-slate-700">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(Math.max(1, page - 1))}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        >
                            <ChevronLeft className="h-4 w-4 text-slate-500" />
                        </button>

                        <div className="text-slate-700">
                            Trang{" "}
                            <span className="font-medium">{page}</span>/
                            <span className="font-medium">{totalPages}</span>
                        </div>

                        <button
                            disabled={page >= totalPages}
                            onClick={() =>
                                setPage(Math.min(totalPages, page + 1))
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        >
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-relaxed">
                        Tổng chi phí trang này:{" "}
                        <span className="text-slate-800 font-medium tabular-nums">
                            {sumCost.toLocaleString("vi-VN")}đ
                        </span>
                    </div>
                </div>

                {/* note */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 shadow-sm">
                    Dữ liệu từ API:
                    <br />
                    GET /api/vehicles/
                    <span className="text-slate-700 font-medium">123</span>
                    /expenses
                </div>
            </div>
        </div>
    );
}

/* ---------------- MAIN PAGE ---------------- */
export default function VehicleDetailPage() {
    const { toasts, push } = useToasts();
    const { vehicleId } = useParams();

    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const isAccountant = currentRole === ROLES.ACCOUNTANT;
    const isConsultant = currentRole === ROLES.CONSULTANT;
    const isCoordinator = currentRole === ROLES.COORDINATOR;
    const isReadOnly = isAccountant || isConsultant;

    const [initialVehicle, setInitialVehicle] = React.useState({
        id: vehicleId ? Number(vehicleId) : undefined,
        license_plate: "",
        status: "AVAILABLE",
        branch_id: "",
        branch_name: "",
        category_id: "",
        category_name: "",
        brand: "",
        model: "",
        year: "",
        capacity: null,
        odometer: null,
        reg_due_date: "",
        ins_due_date: "",
        _branchOptions: [],
        _categoryOptions: [],
    });

    React.useEffect(() => {
        (async () => {
            try {
                // Skip loading categories/branches lists for read-only roles to avoid 403 errors
                const [v, brData, catData] = await Promise.all([
                    getVehicle(vehicleId),
                    isReadOnly ? Promise.resolve({ content: [] }) : listBranches({ size: 1000 }).catch(() => ({ content: [] })),
                    isReadOnly ? Promise.resolve([]) : listVehicleCategories().catch(() => []),
                ]);
                const brs = Array.isArray(brData) ? brData : (brData?.items || brData?.content || []);
                // Debug: log vehicle data to check capacity
                console.log("🔍 [VehicleDetailPage] Vehicle data from API:", v);
                console.log("🔍 [VehicleDetailPage] Vehicle capacity:", v.capacity);
                console.log("🔍 [VehicleDetailPage] Category data:", catData);
                
                // Tìm category tương ứng để lấy seats nếu vehicle không có capacity
                const vehicleCategory = (catData || []).find(c => c.id === v.categoryId);
                const categorySeats = vehicleCategory?.seats || null;
                
                // Ưu tiên capacity từ vehicle, nếu không có thì lấy từ category
                const finalCapacity = v.capacity != null ? Number(v.capacity) : (categorySeats != null ? Number(categorySeats) : null);
                
                console.log("🔍 [VehicleDetailPage] Vehicle category:", vehicleCategory);
                console.log("🔍 [VehicleDetailPage] Category seats:", categorySeats);
                console.log("🔍 [VehicleDetailPage] Final capacity:", finalCapacity);
                
                const mapped = {
                    id: v.id,
                    license_plate: v.licensePlate,
                    status: v.status,
                    branch_id: v.branchId,
                    branch_name: v.branchName,
                    category_id: v.categoryId,
                    category_name: v.categoryName,
                    brand: v.brand || "",
                    model: v.model || "",
                    year: v.productionYear != null ? String(v.productionYear) : "",
                    capacity: finalCapacity,
                    odometer: v.odometer != null ? Number(v.odometer) : null,
                    reg_due_date: v.inspectionExpiry || "",
                    ins_due_date: v.insuranceExpiry || "",
                    _branchOptions: brs.map(b => ({ id: b.id, name: b.branchName || b.name || b.branch_name })),
                    _categoryOptions: (catData || []).map(c => ({ id: c.id, name: c.categoryName || c.name, seats: c.seats })),
                };
                console.log("🔍 [VehicleDetailPage] Mapped vehicle data:", mapped);
                setInitialVehicle(mapped);
                setVehicleForm(mapped);
                setSavedVehicle(mapped);
            } catch (e) {
                push("Không tải được dữ liệu xe", "error");
            }
        })();
    }, [vehicleId]);

    // State for tabs data
    const [tripsData, setTripsData] = React.useState([]);
    const [expensesData, setExpensesData] = React.useState([]);
    const [maintenanceData, setMaintenanceData] = React.useState([]);
    const [loadingTrips, setLoadingTrips] = React.useState(false);
    const [loadingExpenses, setLoadingExpenses] = React.useState(false);
    const [loadingMaintenance, setLoadingMaintenance] = React.useState(false);

    // tab state (moved before useEffect that uses it)
    const [activeTab, setActiveTab] = React.useState("PROFILE");

    // Load trips data
    const loadTrips = React.useCallback(async () => {
        if (!vehicleId) return;
        setLoadingTrips(true);
        try {
            const data = await getVehicleTrips(vehicleId);
            const trips = Array.isArray(data) ? data : (data?.data || []);
            // Map backend data to frontend format
            const mappedTrips = trips.map((t) => ({
                id: t.tripId || t.id,
                code: `TRIP-${t.tripId || t.id}`,
                customer_name: t.customerName || "—",
                customer_phone: t.customerPhone || "—",
                pickup: t.startLocation || t.pickupLocation || "—",
                pickup_time: t.startTime || t.pickup_time,
                status: t.status || "AVAILABLE",
            }));
            setTripsData(mappedTrips);
        } catch (err) {
            console.error("Failed to load vehicle trips:", err);
            // Don't show error toast if endpoint doesn't exist (404)
            if (err.status !== 404) {
                push("Không thể tải lịch sử chuyến đi", "error");
            }
            setTripsData([]);
        } finally {
            setLoadingTrips(false);
        }
    }, [vehicleId, push]);

    // Load expenses data
    const loadExpenses = React.useCallback(async () => {
        if (!vehicleId) return;
        setLoadingExpenses(true);
        try {
            console.log("🔍 [VehicleDetailPage] Loading expenses for vehicle:", vehicleId);
            const data = await getVehicleExpenses(vehicleId);
            console.log("🔍 [VehicleDetailPage] Expenses API response:", data);
            
            // Handle different response formats
            let expenses = [];
            if (Array.isArray(data)) {
                expenses = data;
            } else if (data?.data && Array.isArray(data.data)) {
                expenses = data.data;
            } else if (data?.content && Array.isArray(data.content)) {
                expenses = data.content;
            } else if (data?.items && Array.isArray(data.items)) {
                expenses = data.items;
            } else if (data?.expenses && Array.isArray(data.expenses)) {
                expenses = data.expenses;
            }
            
            console.log("🔍 [VehicleDetailPage] Parsed expenses:", expenses);
            
            // Map backend data to frontend format
            const mappedExpenses = expenses.map((e) => ({
                id: e.expenseId || e.id,
                date: e.expenseDate || e.date || e.expense_date,
                type: e.costType || e.type,
                type_label: e.costType === "FUEL" ? "Xăng dầu" :
                    e.costType === "TOLL" ? "Cầu đường" :
                        e.costType === "REPAIR" ? "Sửa chữa" :
                            e.costType === "MAINTENANCE" ? "Bảo trì" :
                                e.type_label || e.costType || "Khác",
                note: e.description || e.note || "—",
                amount: e.amount || 0,
            }));
            console.log("🔍 [VehicleDetailPage] Mapped expenses:", mappedExpenses);
            setExpensesData(mappedExpenses);
        } catch (err) {
            console.error("❌ [VehicleDetailPage] Failed to load vehicle expenses:", err);
            console.error("❌ [VehicleDetailPage] Error details:", {
                message: err.message,
                status: err.status,
                response: err.response,
            });
            if (err.status !== 404) {
                push("Không thể tải lịch sử chi phí: " + (err.message || "Lỗi không xác định"), "error");
            }
            setExpensesData([]);
        } finally {
            setLoadingExpenses(false);
        }
    }, [vehicleId, push]);

    // Load maintenance data
    const loadMaintenance = React.useCallback(async () => {
        if (!vehicleId) return;
        setLoadingMaintenance(true);
        try {
            console.log("🔍 [VehicleDetailPage] Loading maintenance for vehicle:", vehicleId);
            const data = await getVehicleMaintenance(vehicleId);
            console.log("🔍 [VehicleDetailPage] Maintenance API response:", data);
            
            // Handle different response formats
            let maintenance = [];
            if (Array.isArray(data)) {
                maintenance = data;
            } else if (data?.data && Array.isArray(data.data)) {
                maintenance = data.data;
            } else if (data?.content && Array.isArray(data.content)) {
                maintenance = data.content;
            } else if (data?.items && Array.isArray(data.items)) {
                maintenance = data.items;
            } else if (data?.maintenance && Array.isArray(data.maintenance)) {
                maintenance = data.maintenance;
            }
            
            console.log("🔍 [VehicleDetailPage] Parsed maintenance:", maintenance);
            
            // Map backend data to frontend format
            const mappedMaintenance = maintenance.map((m) => ({
                id: m.maintenanceId || m.id,
                date: m.maintenanceDate || m.date || m.maintenance_date,
                type: m.maintenanceType || m.type || "MAINTENANCE",
                type_label: m.maintenanceType === "INSPECTION" ? "Đăng kiểm" :
                    m.maintenanceType === "REPAIR" ? "Sửa chữa" :
                        m.maintenanceType === "MAINTENANCE" ? "Bảo trì" :
                            m.type_label || "Bảo trì",
                note: m.description || m.note || "—",
                amount: m.cost || m.amount || 0,
            }));
            console.log("🔍 [VehicleDetailPage] Mapped maintenance:", mappedMaintenance);
            setMaintenanceData(mappedMaintenance);
        } catch (err) {
            console.error("❌ [VehicleDetailPage] Failed to load vehicle maintenance:", err);
            console.error("❌ [VehicleDetailPage] Error details:", {
                message: err.message,
                status: err.status,
                response: err.response,
            });
            if (err.status !== 404) {
                push("Không thể tải lịch sử bảo trì: " + (err.message || "Lỗi không xác định"), "error");
            }
            setMaintenanceData([]);
        } finally {
            setLoadingMaintenance(false);
        }
    }, [vehicleId, push]);

    // Load data when switching tabs
    React.useEffect(() => {
        if (activeTab === "TRIPS" && vehicleId && tripsData.length === 0) {
            loadTrips();
        } else if (activeTab === "COSTS" && vehicleId) {
            // Always reload when switching to COSTS tab to ensure fresh data
            console.log("🔍 [VehicleDetailPage] Switching to COSTS tab, loading expenses and maintenance");
                loadExpenses();
                loadMaintenance();
            }
    }, [activeTab, vehicleId, tripsData.length, loadTrips, loadExpenses, loadMaintenance]);

    // Combine expenses and maintenance for COSTS tab
    const combinedExpensesData = React.useMemo(() => {
        return [...expensesData, ...maintenanceData].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA; // Newest first
        });
    }, [expensesData, maintenanceData]);

    // form state for PROFILE tab
    const [vehicleForm, setVehicleForm] = React.useState(initialVehicle);
    const [savedVehicle, setSavedVehicle] = React.useState(initialVehicle);

    // dirty check
    const dirty =
        JSON.stringify(vehicleForm) !== JSON.stringify(savedVehicle);

    // save handler
    const handleSaveProfile = async () => {
        try {
            // Validation: không cho phép cập nhật ngày đăng kiểm, bảo hiểm về quá khứ
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (vehicleForm.reg_due_date) {
                const regDate = new Date(vehicleForm.reg_due_date);
                if (regDate < today) {
                    push("Ngày đăng kiểm không được là ngày trong quá khứ", "error");
                    return;
                }
            }

            if (vehicleForm.ins_due_date) {
                const insDate = new Date(vehicleForm.ins_due_date);
                if (insDate < today) {
                    push("Ngày hết hạn bảo hiểm không được là ngày trong quá khứ", "error");
                    return;
                }
            }

            // Note: Removed validation for INUSE status to allow manual status changes
            // Status can now be changed freely by authorized users (ADMIN, MANAGER, COORDINATOR)

            await updateVehicle(vehicleForm.id, {
                license_plate: vehicleForm.license_plate,
                category_id: vehicleForm.category_id,
                branch_id: vehicleForm.branch_id,
                status: vehicleForm.status,
                brand: vehicleForm.brand,
                model: vehicleForm.model,
                year: vehicleForm.year,
                capacity: vehicleForm.capacity != null ? Number(vehicleForm.capacity) : null,
                // odometer không được update (chỉ đọc)
                reg_due_date: vehicleForm.reg_due_date,
                ins_due_date: vehicleForm.ins_due_date,
            });
            setSavedVehicle(vehicleForm);
            push("Đã lưu thay đổi hồ sơ xe", "success");
        } catch (e) {
            push("Lưu thay đổi thất bại", "error");
        }
    };

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap items-start gap-3">
                        {/* icon + title */}
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                                <CarFront className="h-6 w-6 text-sky-600" />
                            </div>

                            <div className="flex flex-col leading-tight">
                                <div className="text-[16px] font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                                    <span>Hồ sơ phương tiện</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <VehicleStatusBadge status={vehicleForm.status} />

                                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium leading-none">
                                        <span>{vehicleForm.license_plate}</span>
                                    </span>
                                </div>

                                <div className="text-[12px] text-slate-500 leading-snug max-w-xl mt-1">
                                    Theo dõi tình trạng xe, lịch sử chạy và chi phí bảo trì.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-start">
                    <TabBar active={activeTab} setActive={setActiveTab} />
                </div>
            </div>

            {/* BODY BY TAB */}
            {activeTab === "PROFILE" ? (
                <VehicleProfileTab
                    form={vehicleForm}
                    setForm={setVehicleForm}
                    onSave={handleSaveProfile}
                    dirty={dirty}
                    readOnly={isReadOnly}
                    isCoordinator={isCoordinator}
                />
            ) : null}

            {activeTab === "TRIPS" ? (
                loadingTrips ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        Đang tải lịch sử chuyến đi...
                    </div>
                ) : (
                    <TripHistoryTab trips={tripsData} />
                )
            ) : null}

            {activeTab === "COSTS" ? (
                (loadingExpenses || loadingMaintenance) ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        Đang tải lịch sử chi phí & bảo trì...
                    </div>
                ) : (
                    <ExpenseHistoryTab expenses={combinedExpensesData} />
                )
            ) : null}

            {/* footer note */}
            {/* <div className="text-[11px] text-slate-500 text-center mt-6 leading-relaxed">
                Đây là bản prototype UI. Kết nối API thật sẽ:
                <br />
                - load dữ liệu bằng vehicleId (param route)
                <br />
                - gọi PUT khi Lưu thay đổi tab Hồ sơ xe
                <br />
                - tab Lịch sử chuyến & Chi phí sẽ phân trang từ backend
            </div> */}
        </div>
    );
}
