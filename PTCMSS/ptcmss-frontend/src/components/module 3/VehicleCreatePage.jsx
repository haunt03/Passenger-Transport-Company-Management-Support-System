import React from "react";
import {
    CarFront,
    PlusCircle,
    X,
    Hash,
    Check,
    FolderKanban,
    Users,
    GaugeCircle,
} from "lucide-react";

/* -------------------------------------------------
   Tiny helpers
------------------------------------------------- */
const cls = (...a) => a.filter(Boolean).join(" ");

/* -------------------------------------------------
   Toast system (light style giống AdminBranchesPage)
------------------------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);

    const pushToast = (msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    };

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

/* -------------------------------------------------
   Trạng thái ACTIVE / INACTIVE
------------------------------------------------- */
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
            {info.label}
        </span>
    );
}

/* -------------------------------------------------
   Modal tạo danh mục xe (light)
   POST /api/admin/vehicle-categories
------------------------------------------------- */
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
    const valid = name.trim().length > 0 && seatsNum > 0;

    async function handleSave() {
        if (!valid) {
            setError("Vui lòng nhập tên danh mục và số ghế hợp lệ (>0).");
            return;
        }
        setLoading(true);
        setError("");

        const payload = {
            name: name.trim(),
            seats: seatsNum,
        };

        try {
            await new Promise((r) => setTimeout(r, 400)); // mock

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
                            Ví dụ: “Xe 7 chỗ”, “Limousine 9 chỗ”
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
                            placeholder='VD: "Xe 7 chỗ", "Xe VIP 4 chỗ"'
                        />

                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                            Hiển thị cho điều phối / CSKH khi chọn loại xe giao
                            chuyến.
                        </div>
                    </div>

                    {/* Số ghế */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1 flex items-center justify-between">
                            <span>
                                Số ghế{" "}
                                <span className="text-red-500">*</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Thường: 4 / 7 / 16 ...
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <input
                                    value={seats}
                                    onChange={(e) =>
                                        setSeats(cleanDigits(e.target.value))
                                    }
                                    inputMode="numeric"
                                    className={cls(
                                        "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none tabular-nums",
                                        "border-slate-300 bg-white shadow-sm",
                                        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                    )}
                                    placeholder="7"
                                />
                            </div>

                            <div className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5 text-slate-400" />
                                ghế
                            </div>
                        </div>
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

                {/* Dev note */}
                <div className="border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400">
                    POST{" "}
                    <code className="text-slate-600">
                        /api/admin/vehicle-categories
                    </code>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------
   StatCard KPI (light)
------------------------------------------------- */
function StatCard({ icon, label, value, hint, color = "sky" }) {
    const colorMap = {
        sky: {
            chipBg: "bg-sky-50 border-sky-200 text-sky-600",
            num: "text-slate-900",
        },
        green: {
            chipBg: "bg-green-50 border-green-200 text-green-600",
            num: "text-slate-900",
        },
        amber: {
            chipBg: "bg-amber-50 border-amber-200 text-amber-600",
            num: "text-slate-900",
        },
    };
    const c = colorMap[color] || colorMap.sky;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-start gap-3">
            <div
                className={cls(
                    "h-10 w-10 shrink-0 rounded-md border flex items-center justify-center text-[13px] font-medium",
                    c.chipBg
                )}
            >
                {icon}
            </div>

            <div className="flex flex-col min-w-0 leading-tight">
                <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
                    {label}
                </div>
                <div
                    className={cls(
                        "text-xl font-semibold tabular-nums leading-snug break-words",
                        c.num
                    )}
                >
                    {value}
                </div>
                {hint ? (
                    <div className="text-[11px] text-slate-500 leading-snug">
                        {hint}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/* -------------------------------------------------
   MAIN PAGE (light version)
------------------------------------------------- */
export default function VehicleCategoryPage() {
    const { toasts, pushToast } = useToasts();

    // mock data
    const [categories, setCategories] = React.useState([
        {
            id: 1,
            name: "Xe 4 chỗ",
            seats: 4,
            status: "ACTIVE",
            vehicles_count: 12,
        },
        {
            id: 2,
            name: "Xe 7 chỗ",
            seats: 7,
            status: "ACTIVE",
            vehicles_count: 8,
        },
        {
            id: 3,
            name: "Xe 16 chỗ (School Bus)",
            seats: 16,
            status: "INACTIVE",
            vehicles_count: 2,
        },
    ]);

    const [createOpen, setCreateOpen] = React.useState(false);

    // KPIs
    const totalTypes = categories.length;
    const totalCars = categories.reduce(
        (sum, c) => sum + Number(c.vehicles_count || 0),
        0
    );
    const activeTypes = categories.filter(
        (c) => c.status === "ACTIVE"
    ).length;

    function handleCreated(newCat) {
        setCategories((arr) => [newCat, ...arr]);
        pushToast("Đã tạo danh mục xe: " + newCat.name, "success");
    }

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-start gap-6 mb-8">
                {/* left side */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                                <CarFront className="h-6 w-6 text-sky-600" />
                            </div>

                            <div className="flex flex-col leading-tight">
                                <div className="text-[16px] font-semibold text-slate-900">
                                    Danh mục xe
                                </div>
                                <div className="text-[12px] text-slate-500 leading-snug max-w-xl">
                                    Phân loại xe để điều phối gán chuyến / báo
                                    giá cho khách.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-[12px] text-slate-500 leading-snug max-w-xl">
                        Ví dụ: “Xe 4 chỗ”, “Xe 7 chỗ”, “Xe Limousine VIP”.
                        Các danh mục này sẽ xuất hiện khi CSKH / Điều phối chọn
                        xe cho chuyến đi.
                    </div>
                </div>

                {/* create button */}
                <div className="flex-shrink-0">
                    <button
                        onClick={() => setCreateOpen(true)}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md text-[13px] font-medium px-3 py-2 text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        )}
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Tạo danh mục xe</span>
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <StatCard
                    icon={<FolderKanban className="h-5 w-5" />}
                    label="Tổng loại xe"
                    value={totalTypes}
                    hint="Số danh mục hiện có"
                    color="sky"
                />

                <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Số xe đang quản lý"
                    value={totalCars}
                    hint="Gộp tất cả danh mục"
                    color="green"
                />

                <StatCard
                    icon={<GaugeCircle className="h-5 w-5" />}
                    label="Danh mục đang active"
                    value={activeTypes + " / " + totalTypes}
                    hint="Khả dụng để phân công chuyến"
                    color="amber"
                />
            </div>

            {/* TABLE CARD */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* head bar */}
                <div className="px-4 py-3 border-b border-slate-200 text-[13px] text-slate-600 flex items-center gap-2 bg-slate-50">
                    Danh sách danh mục xe
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] text-slate-700">
                        <thead className="bg-slate-100/60 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr className="text-left">
                            <th className="px-4 py-2 font-medium">
                                Tên danh mục
                            </th>
                            <th className="px-4 py-2 font-medium whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số ghế</span>
                                </div>
                            </th>
                            <th className="px-4 py-2 font-medium">
                                Trạng thái
                            </th>
                            <th className="px-4 py-2 font-medium whitespace-nowrap">
                                Số xe đang gán
                            </th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                        {categories.map((cat) => (
                            <tr
                                key={cat.id}
                                className="hover:bg-slate-50"
                            >
                                {/* name + id */}
                                <td className="px-4 py-3 align-top">
                                    <div className="flex flex-col leading-tight">
                                        <div className="text-slate-900 font-medium">
                                            {cat.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            ID: {cat.id}
                                        </div>
                                    </div>
                                </td>

                                {/* seats */}
                                <td className="px-4 py-3 align-top">
                                    <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 tabular-nums shadow-sm">
                                        <Hash className="h-3.5 w-3.5 text-slate-400" />
                                        {cat.seats} ghế
                                    </div>
                                </td>

                                {/* status */}
                                <td className="px-4 py-3 align-top text-[12px]">
                                    <StatusPill status={cat.status} />
                                </td>

                                {/* vehicles_count */}
                                <td className="px-4 py-3 align-top text-[13px] text-slate-900 tabular-nums">
                                    {cat.vehicles_count}
                                </td>
                            </tr>
                        ))}

                        {categories.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-10 text-center text-slate-400 text-[13px]"
                                >
                                    Chưa có danh mục nào.
                                </td>
                            </tr>
                        ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
                    Prototype frontend. Sau này:
                    <br />
                    - GET /api/admin/vehicle-categories
                    <br />
                    - POST tạo danh mục mới ở modal
                </div>
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
