// VehicleDetailPage.jsx (LIGHT THEME VERSION)
import React from "react";
import { useParams } from "react-router-dom";
import { getVehicle, updateVehicle, listVehicleCategories } from "../../api/vehicles";
import { listBranches } from "../../api/branches";
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
    MAINTENANCE: "Bảo trì",
    INACTIVE: "Ngưng sử dụng",
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
    } else if (status === "MAINTENANCE") {
        classes =
            "bg-amber-50 text-amber-700 border-amber-200";
        IconEl = (
            <Wrench className="h-3.5 w-3.5 text-amber-600" />
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
function VehicleProfileTab({ form, setForm, onSave, dirty }) {
    const numericOnly = (s) => s.replace(/[^0-9]/g, "");

    const handleChange = (field) => (e) => {
        const val = e.target.value;
        if (field === "odometer" || field === "year") {
            setForm((f) => ({ ...f, [field]: numericOnly(val) }));
        } else {
            setForm((f) => ({ ...f, [field]: val }));
        }
    };

    const inputCls = cls(
        "w-full rounded-md border px-3 py-2 text-[13px] outline-none shadow-sm",
        "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
    );

    const selectCls = cls(
        "w-full rounded-md border px-3 py-2 text-[13px] outline-none shadow-sm",
        "border-slate-300 bg-white text-slate-700",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
                        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                            {form.license_plate}
                        </div>
                    </div>

                    {/* Danh mục xe */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Danh mục xe
                        </div>
                        <select
                            className={selectCls}
                            value={form.category_id}
                            onChange={handleChange("category_id")}
                        >
                            {form._categoryOptions.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.seats} chỗ)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chi nhánh */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Chi nhánh quản lý
                        </div>
                        <select
                            className={selectCls}
                            value={form.branch_id}
                            onChange={handleChange("branch_id")}
                        >
                            {form._branchOptions.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
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
                            className={inputCls}
                            value={form.brand}
                            onChange={handleChange("brand")}
                            placeholder="Toyota / Ford / Hyundai..."
                        />
                    </div>

                    {/* Model */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Model
                        </div>
                        <input
                            className={inputCls}
                            value={form.model}
                            onChange={handleChange("model")}
                            placeholder="Vios / Fortuner / Solati..."
                        />
                    </div>

                    {/* Năm sản xuất */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Năm sản xuất
                        </div>
                        <input
                            className={inputCls}
                            value={form.year}
                            onChange={handleChange("year")}
                            inputMode="numeric"
                            placeholder="2022"
                        />
                    </div>

                    {/* Odometer */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Odometer hiện tại (km)
                        </div>
                        <input
                            className={cls(inputCls, "tabular-nums")}
                            value={form.odometer}
                            onChange={handleChange("odometer")}
                            inputMode="numeric"
                            placeholder="50000"
                        />
                    </div>

                    {/* Ngày đăng kiểm tiếp theo */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Ngày đăng kiểm tiếp theo
                        </div>
                        <input
                            type="date"
                            className={selectCls}
                            value={form.reg_due_date || ""}
                            onChange={handleChange("reg_due_date")}
                        />
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

                    <div className="flex items-center gap-1 text-slate-600">
                        <Fuel className="h-3.5 w-3.5 text-sky-600" />
                        <span>
                            Odo:{" "}
                            <span className="text-slate-800 font-medium tabular-nums">
                                {Number(form.odometer || 0).toLocaleString(
                                    "vi-VN"
                                )}{" "}
                                km
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            {/* save button row */}
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

            {/* dev note */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 shadow-sm">
                Khi bấm Lưu thay đổi:
                {" "}PUT /api/vehicles/
                <span className="text-slate-700 font-medium">{form.id}</span>{" "}
                với body như odometer, status, reg_due_date...
            </div>
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
                                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
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
        odometer: "",
        reg_due_date: "",
        ins_due_date: "",
        _branchOptions: [],
        _categoryOptions: [],
    });

    React.useEffect(() => {
        (async () => {
            try {
                const [v, brData, catData] = await Promise.all([
                    getVehicle(vehicleId),
                    listBranches({ size: 1000 }).catch(() => ({ content: [] })),
                    listVehicleCategories().catch(() => []),
                ]);
                const brs = Array.isArray(brData) ? brData : (brData?.items || brData?.content || []);
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
                    odometer: v.odometer != null ? String(v.odometer) : "",
                    reg_due_date: v.inspectionExpiry || "",
                    ins_due_date: v.insuranceExpiry || "",
                    _branchOptions: brs.map(b => ({ id: b.id, name: b.branchName || b.name || b.branch_name })),
                    _categoryOptions: (catData || []).map(c => ({ id: c.id, name: c.categoryName || c.name })),
                };
                setInitialVehicle(mapped);
                setVehicleForm(mapped);
                setSavedVehicle(mapped);
            } catch (e) {
                push("Không tải được dữ liệu xe", "error");
            }
        })();
    }, [vehicleId]);

    // mock trip history
    const tripsData = React.useMemo(
        () => [
            {
                id: 901,
                code: "TRIP-2025-045",
                customer_name: "Nguyễn Văn A",
                customer_phone: "0901234567",
                pickup: "Sân bay Nội Bài - T1, cột 5",
                pickup_time: "2025-10-26 08:30",
                status: "AVAILABLE",
            },
            {
                id: 902,
                code: "TRIP-2025-046",
                customer_name: "Công ty ABC",
                customer_phone: "0243 888 999",
                pickup: "VP Công ty ABC, 123 Láng Hạ",
                pickup_time: "2025-10-25 14:00",
                status: "MAINTENANCE",
            },
            {
                id: 903,
                code: "TRIP-2025-047",
                customer_name: "Mr. Lee",
                customer_phone: "N/A",
                pickup: "Khách sạn Westlake Pearl",
                pickup_time: "2025-10-24 09:15",
                status: "AVAILABLE",
            },
        ],
        []
    );

    // mock chi phí/bảo trì
    const expensesData = React.useMemo(
        () => [
            {
                id: 501,
                date: "2025-10-26",
                type: "FUEL",
                type_label: "Xăng dầu",
                note: "Đổ xăng trước chuyến HN->HP",
                amount: 650000,
            },
            {
                id: 502,
                date: "2025-10-24",
                type: "REPAIR",
                type_label: "Bảo trì nhẹ",
                note: "Thay dầu máy, kiểm tra phanh",
                amount: 1200000,
            },
            {
                id: 503,
                date: "2025-10-20",
                type: "FUEL",
                type_label: "Xăng dầu",
                note: "Đổ full bình tại Petrolimex",
                amount: 700000,
            },
        ],
        []
    );

    // tab state
    const [activeTab, setActiveTab] = React.useState("PROFILE");

    // form state for PROFILE tab
    const [vehicleForm, setVehicleForm] = React.useState(initialVehicle);
    const [savedVehicle, setSavedVehicle] = React.useState(initialVehicle);

    // dirty check
    const dirty =
        JSON.stringify(vehicleForm) !== JSON.stringify(savedVehicle);

    // save handler
    const handleSaveProfile = async () => {
        try {
            await updateVehicle(vehicleForm.id, {
                license_plate: vehicleForm.license_plate,
                category_id: vehicleForm.category_id,
                branch_id: vehicleForm.branch_id,
                status: vehicleForm.status,
                brand: vehicleForm.brand,
                model: vehicleForm.model,
                year: vehicleForm.year,
                odometer: vehicleForm.odometer,
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
                />
            ) : null}

            {activeTab === "TRIPS" ? (
                <TripHistoryTab trips={tripsData} />
            ) : null}

            {activeTab === "COSTS" ? (
                <ExpenseHistoryTab expenses={expensesData} />
            ) : null}

            {/* footer note */}
            <div className="text-[11px] text-slate-500 text-center mt-6 leading-relaxed">
                Đây là bản prototype UI. Kết nối API thật sẽ:
                <br />
                - load dữ liệu bằng vehicleId (param route)
                <br />
                - gọi PUT khi Lưu thay đổi tab Hồ sơ xe
                <br />
                - tab Lịch sử chuyến & Chi phí sẽ phân trang từ backend
            </div>
        </div>
    );
}
