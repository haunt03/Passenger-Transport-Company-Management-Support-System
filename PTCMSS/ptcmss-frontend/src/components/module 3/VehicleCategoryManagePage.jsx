/** ------------- FULL FILE VehicleCategoryManagePage.jsx (UI PREMIUM + VALIDATE) -------------- */
import React from "react";
import {
    listVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
} from "../../api/vehicleCategories";
import {
    CarFront,
    PlusCircle,
    X,
    Check,
    Trash2,
    AlertTriangle,
} from "lucide-react";

/* --------------------------------- helper ---------------------------------- */
const cls = (...a) => a.filter(Boolean).join(" ");

/* --------------------------------- Toast ----------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const pushToast = (msg, kind = "info", ttl = 2600) => {
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
                    ) : t.kind === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    ) : null}
                    <div className="leading-snug">{t.msg}</div>
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
            cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

/* ---------------------- Modal Create Category ------------------------ */
function VehicleCategoryCreateModal({ open, onClose, onCreated }) {
    const [name, setName] = React.useState("");
    const [seats, setSeats] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [touchedName, setTouchedName] = React.useState(false);
    const [touchedSeats, setTouchedSeats] = React.useState(false);

    // Reset touched states when modal opens/closes
    React.useEffect(() => {
        if (open) {
            setName("");
            setSeats("");
            setTouchedName(false);
            setTouchedSeats(false);
        }
    }, [open]);

    if (!open) return null;

    const cleanDigits = (s) => s.replace(/[^0-9]/g, "");
    const seatsNum = Number(cleanDigits(seats));

    const nameError = name.trim().length === 0;
    const seatsError = isNaN(seatsNum) || seatsNum <= 0;
    const valid = !nameError && !seatsError;

    async function handleSave() {
        if (!valid) return;
        setLoading(true);

        const newCat = {
            id: Date.now(),
            name: name.trim(),
            seats: seatsNum,
            status: "ACTIVE",
            vehicles_count: 0,
        };

        await new Promise((r) => setTimeout(r, 300));
        onCreated(newCat);
        setLoading(false);
        onClose();
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
                {/* header */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <CarFront className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col min-w-0 leading-tight">
                        <div className="text-slate-900 font-semibold text-[14px]">
                            Tạo danh mục xe
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Ví dụ: “Xe 7 chỗ”
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* body */}
                <div className="px-5 py-4 space-y-5 text-[13px]">
                    {/* Name */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Tên danh mục <span className="text-red-500">*</span>
                        </div>

                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouchedName(true)}
                            className={cls(
                                "w-full rounded-md border px-3 py-2 text-[13px]",
                                touchedName && nameError
                                    ? "border-red-400 bg-red-50"
                                    : "border-slate-300 bg-white",
                                "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                            )}
                        />
                        {touchedName && nameError && (
                            <div className="text-[11px] text-red-500 mt-1">
                                Tên danh mục không được để trống.
                            </div>
                        )}
                    </div>

                    {/* Seats */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Số ghế <span className="text-red-500">*</span>
                        </div>

                        <input
                            value={seats}
                            onChange={(e) => setSeats(cleanDigits(e.target.value))}
                            onBlur={() => setTouchedSeats(true)}
                            inputMode="numeric"
                            className={cls(
                                "w-full rounded-md border px-3 py-2 text-[13px] tabular-nums",
                                touchedSeats && seatsError
                                    ? "border-red-400 bg-red-50"
                                    : "border-slate-300 bg-white",
                                "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                            )}
                            placeholder="7"
                        />

                        {touchedSeats && seatsError && (
                            <div className="text-[11px] text-red-500 mt-1">
                                Số ghế phải là số {'>'} 0.
                            </div>
                        )}
                    </div>
                </div>

                {/* footer */}
                <div className="flex gap-3 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
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
                            valid
                                ? "bg-sky-600 hover:bg-sky-500"
                                : "bg-slate-400 cursor-not-allowed"
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

/* ---------------------- Modal Edit Category ------------------------ */
function VehicleCategoryEditModal({
                                      open,
                                      data,
                                      onClose,
                                      onSaved,
                                      onDeleted,
                                  }) {
    const [name, setName] = React.useState("");
    const [seats, setSeats] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [baseFare, setBaseFare] = React.useState("");
    const [pricePerKm, setPricePerKm] = React.useState("");
    const [highwayFee, setHighwayFee] = React.useState("");
    const [fixedCosts, setFixedCosts] = React.useState("");
    const [status, setStatus] = React.useState("ACTIVE");
    const [error, setError] = React.useState("");
    const [touchedName, setTouchedName] = React.useState(false);
    const [touchedSeats, setTouchedSeats] = React.useState(false);

    const [loadingSave, setLoadingSave] = React.useState(false);
    const [loadingDelete, setLoadingDelete] = React.useState(false);

    React.useEffect(() => {
        if (open && data) {
            setName(data.name || "");
            setSeats(String(data.seats ?? ""));
            setDescription(data.description || "");
            setBaseFare(String(data.baseFare ?? ""));
            setPricePerKm(String(data.pricePerKm ?? ""));
            setHighwayFee(String(data.highwayFee ?? ""));
            setFixedCosts(String(data.fixedCosts ?? ""));
            setStatus(data.status ?? "ACTIVE");
            setError("");
            setTouchedName(false);
            setTouchedSeats(false);
        }
    }, [open, data]);

    if (!open || !data) return null;

    const cleanDigits = (s) => s.replace(/[^0-9]/g, "");
    const cleanNumber = (s) => s.replace(/[^0-9.]/g, "");

    const seatsNum = Number(cleanDigits(seats));
    const baseFareNum = baseFare ? Number(cleanNumber(baseFare)) : null;
    const pricePerKmNum = pricePerKm ? Number(cleanNumber(pricePerKm)) : null;
    const highwayFeeNum = highwayFee ? Number(cleanNumber(highwayFee)) : null;
    const fixedCostsNum = fixedCosts ? Number(cleanNumber(fixedCosts)) : null;

    const nameError = name.trim().length === 0;
    const seatsError = isNaN(seatsNum) || seatsNum <= 0;
    const valid = !nameError && !seatsError;

    async function handleSave() {
        if (!valid) return;
        setLoadingSave(true);

        await new Promise((r) => setTimeout(r, 300));

        onSaved({
            id: data.id,
            name: name.trim(),
            seats: seatsNum,
            description: description.trim() || null,
            baseFare: baseFareNum,
            pricePerKm: pricePerKmNum,
            highwayFee: highwayFeeNum,
            fixedCosts: fixedCostsNum,
            status,
        });

        setLoadingSave(false);
        onClose();
    }

    async function handleDelete() {
        if (Number(data.vehicles_count || 0) > 0) {
            setError("Không thể xoá: còn xe thuộc danh mục này.");
            return;
        }

        setLoadingDelete(true);
        await new Promise((r) => setTimeout(r, 300));

        onDeleted({ id: data.id });
        setLoadingDelete(false);
        onClose();
    }

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <CarFront className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col leading-tight">
                        <div className="text-slate-900 font-semibold text-[14px]">
                            Chỉnh sửa danh mục
                        </div>
                        <div className="text-[11px] text-slate-500">
                            ID #{data.id}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* body */}
                <div className="px-5 py-4 space-y-4 text-[13px] max-h-[70vh] overflow-y-auto">
                    {/* Name */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Tên danh mục <span className="text-red-500">*</span>
                        </div>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouchedName(true)}
                            className={cls(
                                "w-full rounded-md border px-3 py-2 text-[13px]",
                                touchedName && nameError
                                    ? "border-red-400 bg-red-50"
                                    : "border-slate-300 bg-white",
                                "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                            )}
                        />
                        {touchedName && nameError && (
                            <div className="text-[11px] text-red-500 mt-1">
                                Tên danh mục không được để trống.
                            </div>
                        )}
                    </div>

                    {/* Seats */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Số ghế <span className="text-red-500">*</span>
                        </div>
                        <input
                            value={seats}
                            onChange={(e) => setSeats(cleanDigits(e.target.value))}
                            onBlur={() => setTouchedSeats(true)}
                            inputMode="numeric"
                            className={cls(
                                "w-full rounded-md border px-3 py-2 text-[13px] tabular-nums",
                                touchedSeats && seatsError
                                    ? "border-red-400 bg-red-50"
                                    : "border-slate-300 bg-white",
                                "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                            )}
                        />
                        {touchedSeats && seatsError && (
                            <div className="text-[11px] text-red-500 mt-1">
                                Số ghế phải là số {'>'} 0.
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Mô tả
                        </div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Ví dụ: Ford Transit, Mercedes Sprinter"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition resize-none"
                        />
                    </div>

                    {/* PRICING SECTION */}
                    <div className="border-t pt-4 mt-4">
                        <div className="text-[13px] font-semibold text-slate-700 mb-3">
                            💰 Thông tin giá
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Base Fare */}
                            <div>
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Giá cơ bản (VNĐ)
                                </div>
                                <input
                                    value={baseFare}
                                    onChange={(e) => setBaseFare(cleanNumber(e.target.value))}
                                    inputMode="decimal"
                                    placeholder="800000"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                />
                            </div>

                            {/* Price per Km */}
                            <div>
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Giá/km (VNĐ)
                                </div>
                                <input
                                    value={pricePerKm}
                                    onChange={(e) => setPricePerKm(cleanNumber(e.target.value))}
                                    inputMode="decimal"
                                    placeholder="15000"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                />
                            </div>

                            {/* Highway Fee */}
                            <div>
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Phí cao tốc (VNĐ)
                                </div>
                                <input
                                    value={highwayFee}
                                    onChange={(e) => setHighwayFee(cleanNumber(e.target.value))}
                                    inputMode="decimal"
                                    placeholder="100000"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                />
                            </div>

                            {/* Fixed Costs */}
                            <div>
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Chi phí cố định (VNĐ)
                                </div>
                                <input
                                    value={fixedCosts}
                                    onChange={(e) => setFixedCosts(cleanNumber(e.target.value))}
                                    inputMode="decimal"
                                    placeholder="0"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Trạng thái
                        </div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-md border px-3 py-2 text-[13px] border-slate-300 bg-white shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                        >
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Ngưng sử dụng</option>
                        </select>
                    </div>

                    {/* Info */}
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600">
                        Số xe đang thuộc danh mục:
                        <span className="ml-1 font-semibold text-slate-900">
                            {data.vehicles_count}
                        </span>
                    </div>

                    {error && (
                        <div className="text-red-500 text-[12px]">{error}</div>
                    )}
                </div>

                {/* footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex gap-3 justify-between">
                    <button
                        onClick={handleDelete}
                        disabled={loadingDelete}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium shadow-sm",
                            "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                            loadingDelete && "opacity-50"
                        )}
                    >
                        <Trash2 className="h-4 w-4" />
                        {loadingDelete ? "Đang xoá..." : "Xoá danh mục"}
                    </button>

                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                        >
                            Đóng
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!valid || loadingSave}
                            className={cls(
                                "rounded-md px-3 py-2 text-[13px] font-medium text-white shadow-sm",
                                valid
                                    ? "bg-sky-600 hover:bg-sky-500"
                                    : "bg-slate-400 cursor-not-allowed"
                            )}
                        >
                            {loadingSave ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
/* ----------------------------- PAGE ------------------------------ */
export default function VehicleCategoryManagePage() {
    const { toasts, pushToast } = useToasts();

    const [categories, setCategories] = React.useState([]);

    const mapCat = React.useCallback(
        (c) => ({
            id: c.id,
            name: c.categoryName || c.name,
            status: c.status || "ACTIVE",
            seats: c.seats ?? null,
            vehicles_count: c.vehicles_count ?? 0,
            description: c.description || "",
            baseFare: c.baseFare ?? null,
            pricePerKm: c.pricePerKm ?? null,
            highwayFee: c.highwayFee ?? null,
            fixedCosts: c.fixedCosts ?? null,
        }),
        []
    );

    React.useEffect(() => {
        (async () => {
            try {
                const data = await listVehicleCategories();
                setCategories((data || []).map(mapCat));
            } catch (e) {
                pushToast("Không tải được danh mục xe", "error");
            }
        })();
    }, [mapCat, pushToast]);

    const [createOpen, setCreateOpen] = React.useState(false);
    const [editOpen, setEditOpen] = React.useState(false);
    const [editData, setEditData] = React.useState(null);

    async function handleCreated(cat) {
        try {
            const result = await createVehicleCategory({
                categoryName: cat.name,
                seats: cat.seats,
                status: "ACTIVE",
            });

            setCategories((arr) => [mapCat(result), ...arr]);
            pushToast("Tạo danh mục thành công", "success");
        } catch (e) {
            pushToast("Tạo danh mục thất bại", "error");
        }
    }

    async function handleSaved(cat) {
        try {
            console.log("[UPDATE] Sending update request:", cat);
            const result = await updateVehicleCategory(cat.id, {
                categoryName: cat.name,
                seats: cat.seats,
                description: cat.description,
                baseFare: cat.baseFare,
                pricePerKm: cat.pricePerKm,
                highwayFee: cat.highwayFee,
                fixedCosts: cat.fixedCosts,
                status: cat.status,
            });

            console.log("[UPDATE] Response:", result);
            const mapped = mapCat(result);
            console.log("[UPDATE] Mapped result:", mapped);

            setCategories((arr) => {
                const updated = arr.map((i) => (i.id === cat.id ? mapped : i));
                console.log("[UPDATE] Updated categories:", updated);
                return updated;
            });

            pushToast("Cập nhật thành công", "success");
        } catch (e) {
            console.error("[UPDATE] Error:", e);
            pushToast("Cập nhật thất bại: " + (e.message || "Unknown error"), "error");
        }
    }

    async function handleDeleted({ id }) {
        try {
            await deleteVehicleCategory(id);

            setCategories((arr) => arr.filter((c) => c.id !== id));
            pushToast("Xoá danh mục thành công", "success");
        } catch (e) {
            pushToast("Xoá danh mục thất bại", "error");
        }
    }

    return (
        <div className="relative min-h-screen bg-[#F5F7FA] p-6">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex justify-between mb-6">
                <div className="flex gap-3 items-start">
                    <div className="h-12 w-12 rounded-xl border bg-white flex items-center justify-center shadow-sm">
                        <CarFront className="h-6 w-6 text-sky-600" />
                    </div>

                    <div>
                        <div className="text-lg font-semibold text-slate-900">
                            Quản lý danh mục xe
                        </div>
                        <div className="text-[12px] text-slate-500 max-w-xl">
                            Chuẩn hoá loại xe để điều phối và quản lý hiệu quả.
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-[13px] shadow-sm active:scale-[0.98] transition"
                >
                    <PlusCircle className="h-4 w-4" />
                    Tạo danh mục mới
                </button>
            </div>

            {/* TABLE */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 text-[13px] font-medium text-slate-700">
                    Danh sách danh mục
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-slate-100 border-b text-[11px] uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-2 text-left">Tên danh mục</th>
                            <th className="px-4 py-2 text-left">Số ghế</th>
                            <th className="px-4 py-2 text-left">Trạng thái</th>
                            <th className="px-4 py-2 text-left">Số xe</th>
                            <th className="px-4 py-2 text-left">Hành động</th>
                        </tr>
                        </thead>

                        {/* ❌ Không dùng divide-y nữa */}
                        <tbody>
                        {categories.map((cat) => (
                            <tr
                                key={cat.id}
                                className="hover:bg-slate-50 transition border-b border-slate-200 last:border-none"
                            >
                                <td className="px-4 py-3 align-top">
                                    <div className="font-medium text-slate-900">
                                        {cat.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        ID: {cat.id}
                                    </div>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    {cat.seats} ghế
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <StatusPill status={cat.status} />
                                </td>
                                <td className="px-4 py-3 align-top">
                                    {cat.vehicles_count}
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <button
                                        onClick={() => {
                                            console.log("[EDIT] Opening modal for category:", cat);
                                            setEditData(cat);
                                            setEditOpen(true);
                                        }}
                                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] hover:bg-slate-100 text-slate-700 shadow-sm"
                                    >
                                        Sửa / Xoá
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {categories.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-10 text-center text-slate-400"
                                >
                                    Chưa có danh mục nào.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            <VehicleCategoryCreateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
            />

            <VehicleCategoryEditModal
                open={editOpen}
                data={editData}
                onClose={() => setEditOpen(false)}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
            />
        </div>
    );
}