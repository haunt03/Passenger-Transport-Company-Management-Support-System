/** ------------- FULL FILE VehicleCategoryManagePage.jsx (UI CLEAN DASHBOARD) -------------- */
import React from "react";
import {
    listVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
} from "../../api/vehicleCategories";
import { apiFetch } from "../../api/http";
import { getBranchByUserId } from "../../api/branches";
import {
    CarFront,
    PlusCircle,
    X,
    Check,
    AlertTriangle,
    Pencil,
    Users,
    ChevronLeft,
    ChevronRight,
    Search,
    Calendar,
    Building2,
    Phone,
    Mail,
    FileText,
} from "lucide-react";

/* --------------------------------- helper ---------------------------------- */
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

/* --------------------------------- Toast ----------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const pushToast = React.useCallback((msg, kind = "info", ttl = 2600) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    }, []);
    return { toasts, pushToast };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "flex items-start gap-2 rounded-lg px-3 py-2 shadow bg-white",
                        t.kind === "success" && "bg-green-50 text-green-700",
                        t.kind === "error" && "bg-red-50 text-red-700"
                    )}
                >
                    {t.kind === "success" ? (
                        <Check className="h-4 w-4 text-green-600" />
                    ) : t.kind === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : null}
                    <div>{t.msg}</div>
                </div>
            ))}
        </div>
    );
}

/* -------------------------------- StatusPill -------------------------------- */
function StatusPill({ status }) {
    const map = {
        ACTIVE: {
            label: "Đang hoạt động",
            cls: "bg-green-50 text-green-700",
        },
        INACTIVE: {
            label: "Chưa hoạt động",
            cls: "bg-slate-100 text-slate-600",
        },
    };
    const info = map[status] || map.ACTIVE;
    return (
        <span
            className={cls(
                "inline-flex items-center rounded-md px-2 py-[2px] text-[11px] font-medium",
                info.cls
            )}
        >
            {info.label}
        </span>
    );
}

/* ----------------------------- PAGE ------------------------------ */
export default function VehicleCategoryManagePage() {
    const { toasts, pushToast } = useToasts();
    const [categories, setCategories] = React.useState([]);

    const mapCat = React.useCallback((c) => ({
        id: c.id,
        name: c.categoryName || c.name,
        status: c.status || "ACTIVE",
        seats: c.seats ?? null,
        vehicles_count: c.vehiclesCount ?? c.vehicles_count ?? 0,
        baseFee: c.baseFare ?? c.baseFee ?? null,
        sameDayFixedPrice: c.sameDayFixedPrice ?? null,
        pricePerKm: c.pricePerKm ?? null,
    }), []);

    React.useEffect(() => {
        (async () => {
            try {
                const data = await listVehicleCategories();
                setCategories((data || []).map(mapCat));
            } catch {
                pushToast("Không tải được danh mục xe", "error");
            }
        })();
    }, [mapCat, pushToast]);

    const [catPage, setCatPage] = React.useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(categories.length / pageSize) || 1;

    const pagedCategories = React.useMemo(() => {
        const start = (catPage - 1) * pageSize;
        return categories.slice(start, start + pageSize);
    }, [categories, catPage]);

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-6">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex justify-between mb-6">
                <div className="flex gap-3 items-start">
                    <div className="h-12 w-12 rounded-xl bg-sky-50 flex items-center justify-center shadow">
                        <CarFront className="h-6 w-6 text-sky-600" />
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-slate-900">
                            Quản lý danh mục xe
                        </div>
                        <div className="text-[12px] text-slate-500">
                            Chuẩn hoá loại xe để điều phối và quản lý hiệu quả.
                        </div>
                    </div>
                </div>

                <button className="inline-flex items-center gap-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-[13px] shadow">
                    <PlusCircle className="h-4 w-4" />
                    Tạo danh mục mới
                </button>
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-white p-4 flex items-center gap-3 shadow">
                    <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <CarFront className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-[18px] font-semibold">{categories.length}</div>
                        <div className="text-[12px] text-slate-500">Tổng loại xe</div>
                    </div>
                </div>

                <div className="rounded-xl bg-white p-4 flex items-center gap-3 shadow">
                    <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-[18px] font-semibold">
                            {categories.reduce((s, c) => s + (c.vehicles_count || 0), 0)}
                        </div>
                        <div className="text-[12px] text-slate-500">Số xe đang quản lý</div>
                    </div>
                </div>

                <div className="rounded-xl bg-white p-4 flex items-center gap-3 shadow">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Check className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-[18px] font-semibold">
                            {categories.filter(c => c.status === "ACTIVE").length}
                            <span className="text-slate-400"> / {categories.length}</span>
                        </div>
                        <div className="text-[12px] text-slate-500">Danh mục active</div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="rounded-xl bg-white shadow overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 text-[13px] font-semibold text-slate-700">
                    Danh sách danh mục
                </div>

                <table className="w-full text-[13px]">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                        <th className="px-4 py-2 text-left">Tên danh mục</th>
                        <th className="px-4 py-2 text-left">Số ghế</th>
                        <th className="px-4 py-2 text-center">Số xe</th>
                        <th className="px-4 py-2 text-right">Phí mở cửa</th>
                        <th className="px-4 py-2 text-right">Giá cố định/ngày</th>
                        <th className="px-4 py-2 text-right">Giá theo km</th>
                        <th className="px-4 py-2 text-left">Trạng thái</th>
                        <th className="px-4 py-2 text-left">Hành động</th>
                    </tr>
                    </thead>

                    <tbody>
                    {pagedCategories.map((cat) => (
                        <tr
                            key={cat.id}
                            className="border-b border-slate-100 hover:bg-slate-50 transition"
                        >
                            <td className="px-4 py-3 font-medium">{cat.name}</td>
                            <td className="px-4 py-3">{cat.seats} ghế</td>
                            <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                                        <CarFront className="h-3 w-3" />
                                        {cat.vehicles_count}
                                    </span>
                            </td>
                            <td className="px-4 py-3 text-right">{cat.baseFee ? fmtVND(cat.baseFee) : "—"}</td>
                            <td className="px-4 py-3 text-right">{cat.sameDayFixedPrice ? fmtVND(cat.sameDayFixedPrice) : "—"}</td>
                            <td className="px-4 py-3 text-right">{cat.pricePerKm ? fmtVND(cat.pricePerKm) : "—"}</td>
                            <td className="px-4 py-3"><StatusPill status={cat.status} /></td>
                            <td className="px-4 py-3">
                                <button className="rounded-md bg-sky-50 text-sky-700 px-2.5 py-1.5 text-[11px] hover:bg-sky-100 shadow-sm flex items-center gap-1">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Sửa
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {/* PAGINATION */}
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <div className="text-[12px] text-slate-500">
                        Trang {catPage} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCatPage(p => Math.max(1, p - 1))}
                            className="px-2 py-1 bg-white shadow-sm rounded-md hover:bg-slate-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setCatPage(p => Math.min(totalPages, p + 1))}
                            className="px-2 py-1 bg-white shadow-sm rounded-md hover:bg-slate-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
