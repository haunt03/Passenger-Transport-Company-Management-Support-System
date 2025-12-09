import React from "react";
import { listVehicleCategories, createVehicleCategory } from "../../api/vehicleCategories";
import {
    CarFront,
    PlusCircle,
    X,
    Hash,
    Check,
    Wrench,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

/* Toast system */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);

    const pushToast = React.useCallback((msg, kind = "info", ttl = 2400) => {
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
                        "flex items-start gap-2 rounded-md border px-3 py-2 shadow-sm bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-green-200 text-green-700 bg-green-50",
                        t.kind === "error" &&
                        "border-red-200 text-red-700 bg-red-50"
                    )}
                >
                    {t.kind === "success" ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : null}
                    <div className="leading-snug">{t.msg}</div>
                </div>
            ))}
        </div>
    );
}

/* Status badge */
function StatusPill({ status }) {
    const map = {
        ACTIVE: {
            label: "Đang hoạt động",
            cls: "bg-green-50 text-green-700 border-green-200",
        },
        INACTIVE: {
            label: "Ngưng",
            cls: "bg-slate-100 text-slate-600 border-slate-300",
        },
    };
    const info = map[status] || map.ACTIVE;

    return (
        <span
            className={cls(
                "inline-flex items-center rounded-md border px-2 py-[2px] text-[11px] font-medium leading-none",
                info.cls
            )}
        >
            {info.label}</span>
    );
}

/* Modal tạo danh mục xe */
function VehicleCategoryCreateModal({
    open,
    onClose,
    onCreated,
}) {
    const [name, setName] = React.useState("");
    const [seats, setSeats] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setName("");
            setSeats("");
            setLoading(false);
            setError("");
        }
    }, [open]);

    if (!open) return null;

    const cleanDigits = (s) => s.replace(/[^0-9]/g, "");
    const seatsNum = Number(cleanDigits(seats || ""));
    const valid = name.trim().length > 0 && seatsNum > 0 && seatsNum <= 45;

    async function handleSave() {
        if (!name.trim()) {
            setError("Vui lòng nhập tên danh mục.");
            return;
        }
        if (seatsNum <= 0) {
            setError("Số ghế phải lớn hơn 0.");
            return;
        }
        if (seatsNum > 45) {
            setError("Số ghế không được vượt quá 45.");
            return;
        }
        setLoading(true);
        setError("");

        const payload = {
            name: name.trim(),
            seats: seatsNum,
        };

        try {
            await new Promise((r) => setTimeout(r, 400));

            const fakeCreated = {
                id: Date.now(),
                ...payload,
                status: "ACTIVE",
                vehicles_count: 0,
            };

            onCreated && onCreated(fakeCreated);
            onClose && onClose();
        } catch {
            setError("Không thể tạo danh mục xe. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <CarFront className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col min-w-0 leading-tight">
                        <div className="text-slate-900 font-semibold text-[14px]">
                            Tạo danh mục xe
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Ví dụ: "Xe 7 chỗ", "Limousine 9 chỗ"
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* BODY */}
                <div className="px-5 py-4 space-y-5 text-[13px]">
                    {/* Tên danh mục */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 flex items-center justify-between">
                            <span>
                                Tên danh mục{" "}
                                <span className="text-red-500">*</span>
                            </span>
                        </div>

                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cls(
                                "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                "border-slate-300 bg-white shadow-sm",
                                "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                            )}
                            placeholder="VD: Xe 7 chỗ, Xe 16 chỗ, Limousine"
                        />
                    </div>

                    {/* Số ghế */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 flex items-center justify-between">
                            <span>
                                Số ghế{" "}
                                <span className="text-red-500">*</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Tối đa: 45 ghế
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <input
                                    value={seats}
                                    onChange={(e) => {
                                        const val = cleanDigits(e.target.value);
                                        if (val === "" || Number(val) <= 45) {
                                            setSeats(val);
                                            setError("");
                                        }
                                    }}
                                    inputMode="numeric"
                                    className={cls(
                                        "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none tabular-nums",
                                        "border-slate-300 bg-white shadow-sm",
                                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                    )}
                                    placeholder="VD: 4, 7, 16, 45..."
                                />
                            </div>

                            <div className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5 text-slate-400" />
                                ghế
                            </div>
                        </div>
                        {seatsNum > 45 && (
                            <div className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                                <X className="h-3 w-3" />
                                Số ghế không được vượt quá 45
                            </div>
                        )}
                    </div>

                    {error ? (
                        <div className="text-red-600 text-[12px]">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* FOOTER */}
                <div className="flex flex-wrap gap-3 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 text-[13px]">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                    >
                        Huỷ
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!valid || loading}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        <PlusCircle className="h-4 w-4" />
                        {loading ? "Đang lưu..." : "Lưu danh mục"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* MAIN PAGE - Redesigned to match VehicleListPage */
export default function VehicleCategoryPage() {
    const { toasts, pushToast } = useToasts();

    const [categories, setCategories] = React.useState([]);

    const mapCat = React.useCallback((c) => ({
        id: c.id,
        name: c.categoryName || c.name,
        seats: c.seats ?? null,
        status: c.status || "ACTIVE",
        vehicles_count: c.vehicles_count ?? 0,
    }), []);

    React.useEffect(() => {
        (async () => {
            try {
                const data = await listVehicleCategories();
                setCategories((data || []).map(mapCat));
            } catch (e) {
                pushToast("Không tải được danh mục", "error");
            }
        })();
    }, [mapCat, pushToast]);

    const [createOpen, setCreateOpen] = React.useState(false);

    async function handleCreated(newCat) {
        try {
            const created = await createVehicleCategory({ categoryName: newCat.name, status: "ACTIVE" });
            setCategories((arr) => [mapCat(created), ...arr]);
            pushToast("Đã tạo danh mục xe: " + (created.categoryName || newCat.name), "success");
        } catch (e) {
            pushToast("Tạo danh mục thất bại", "error");
        }
    }

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* HEADER - Match VehicleListPage style */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                            <CarFront className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                            <h1 className="text-[16px] font-semibold text-slate-900">
                                Quản lý danh mục xe
                            </h1>
                            <p className="text-[12px] text-slate-500">
                                Chuẩn hoá loại xe để điều phối và quản lý hiệu quả.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setCreateOpen(true)}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md text-[13px] font-medium px-4 py-2 text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        )}
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Tạo danh mục mới</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-[12px]">
                    <div className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-sm">
                        Danh sách danh mục
                    </div>
                </div>
            </div>

            {/* TABLE CARD - Match VehicleListPage style */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {categories.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                            <CarFront className="h-8 w-8" />
                        </div>
                        <div className="text-[14px] font-medium text-slate-700 mb-1">
                            Chưa có danh mục xe nào
                        </div>
                        <div className="text-[12px] text-slate-500 mb-4 max-w-sm mx-auto">
                            Tạo danh mục xe đầu tiên để bắt đầu phân loại và quản lý đội xe của bạn
                        </div>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 rounded-md text-[13px] font-medium px-4 py-2 text-white bg-sky-600 hover:bg-sky-500 shadow-sm"
                        >
                            <PlusCircle className="h-4 w-4" />
                            <span>Tạo danh mục đầu tiên</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto text-[13px] text-slate-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100/60 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-medium text-left">
                                            Tên danh mục
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center whitespace-nowrap">
                                            Số ghế
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center whitespace-nowrap">
                                            Phí mở cửa
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center whitespace-nowrap">
                                            Giá cố định/ngày
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center whitespace-nowrap">
                                            Giá theo km
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center">
                                            Trạng thái
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center whitespace-nowrap">
                                            Số xe
                                        </th>
                                        <th className="px-5 py-3 font-medium text-center">
                                            Hành động
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200">
                                    {categories.map((cat) => (
                                        <tr
                                            key={cat.id}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            {/* name */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-slate-900 font-medium text-[13px]">
                                                        {cat.name}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* seats */}
                                            <td className="px-5 py-3 text-center">
                                                <span className="text-[13px] text-slate-700 tabular-nums">
                                                    {cat.seats ?? "—"} ghế
                                                </span>
                                            </td>

                                            {/* pricing placeholders */}
                                            <td className="px-5 py-3 text-center text-slate-500 text-[12px]">
                                                —
                                            </td>
                                            <td className="px-5 py-3 text-center text-slate-500 text-[12px]">
                                                —
                                            </td>
                                            <td className="px-5 py-3 text-center text-slate-500 text-[12px]">
                                                —
                                            </td>

                                            {/* status */}
                                            <td className="px-5 py-3 text-center">
                                                <StatusPill status={cat.status} />
                                            </td>

                                            {/* vehicles_count */}
                                            <td className="px-5 py-3 text-center">
                                                <div className="inline-flex items-center gap-1 text-sky-600 text-[13px]">
                                                    <CarFront className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{cat.vehicles_count}</span>
                                                </div>
                                            </td>

                                            {/* action */}
                                            <td className="px-5 py-3 text-center">
                                                <button
                                                    className={cls(
                                                        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium shadow-sm",
                                                        "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                                    )}
                                                >
                                                    <Wrench className="h-3.5 w-3.5 text-sky-600" />
                                                    <span>Sửa</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer info */}
                        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-sky-500"></div>
                                <span>Hiển thị {categories.length} / {categories.length} danh mục</span>
                            </div>
                            <div>
                                Tổng số hiện tại: <span className="font-medium text-slate-700">{categories.length}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* MODAL TẠO MỚI */}
            <VehicleCategoryCreateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    );
}
