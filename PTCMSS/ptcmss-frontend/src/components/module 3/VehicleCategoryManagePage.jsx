/** ------------- FULL FILE VehicleCategoryManagePage.jsx (UI PREMIUM + VALIDATE) -------------- */
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

// API helper for customers - sử dụng API bookings để lấy danh sách khách hàng từ đơn hàng
async function listCustomers({ branchId, startDate, endDate, page = 1, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (branchId) params.append("branchId", String(branchId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (page != null) params.append("page", String(page));
    if (size != null) params.append("size", String(size));
    const qs = params.toString();

    // Sử dụng trực tiếp API bookings để lấy thông tin khách hàng
    console.log("📞 Fetching customers from bookings...");
    const bookings = await apiFetch(`/api/bookings?${qs}`);
    console.log("📦 Bookings response:", bookings);

    const items = bookings?.data?.items || bookings?.items || bookings?.content || [];
    console.log("📋 Booking items:", items);

    // Extract unique customers from bookings
    const customerMap = new Map();
    items.forEach(b => {
        console.log("🔍 Processing booking:", b);
        // Thử nhiều cách lấy thông tin khách hàng
        const customer = b.customer || {};
        const customerName = customer.fullName || customer.name || b.customerName || b.customer_name || "";
        const customerEmail = customer.email || b.customerEmail || b.customer_email || "";
        const customerPhone = customer.phone || customer.phoneNumber || b.customerPhone || b.customer_phone || "";
        const customerNote = customer.note || b.note || "";

        // Dùng phone hoặc email làm key để loại trùng
        const key = customerPhone || customerEmail || `${customerName}-${Math.random()}`;

        if (key && !customerMap.has(key)) {
            customerMap.set(key, {
                id: customer.id || b.customerId || b.id,
                fullName: customerName,
                email: customerEmail,
                phone: customerPhone,
                note: customerNote,
            });
        }
    });

    const result = {
        items: Array.from(customerMap.values()),
        totalElements: customerMap.size,
        totalPages: 1,
    };
    console.log("✅ Extracted customers:", result);
    return result;
}

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
            cls: "bg-green-50 text-green-700 border-green-200",
        },
        INACTIVE: {
            label: "Chưa hoạt động",
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
function VehicleCategoryCreateModal({ open, onClose, onCreated, existingCategories = [] }) {
    const [name, setName] = React.useState("Xe ");
    const [seats, setSeats] = React.useState("");
    const [baseFee, setBaseFee] = React.useState("");
    const [sameDayFixedPrice, setSameDayFixedPrice] = React.useState("");
    const [pricePerKm, setPricePerKm] = React.useState("");
    const [status, setStatus] = React.useState("ACTIVE");
    const [loading, setLoading] = React.useState(false);
    const [touchedName, setTouchedName] = React.useState(false);
    const [touchedSeats, setTouchedSeats] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);

    const cleanDigits = (s) => s.replace(/[^0-9]/g, "");
    const trimmedName = name.trim();

    // Gợi ý danh mục tương tự để tránh trùng - PHẢI đặt trước if (!open)
    const suggestions = React.useMemo(() => {
        if (trimmedName.length < 3) return [];
        const searchTerm = trimmedName.toLowerCase();
        return existingCategories
            .filter((cat) => cat.name?.toLowerCase().includes(searchTerm.replace("xe ", "")))
            .slice(0, 5);
    }, [trimmedName, existingCategories]);

    // Reset touched states when modal opens/closes
    React.useEffect(() => {
        if (open) {
            setName("Xe ");
            setSeats("");
            setBaseFee("");
            setSameDayFixedPrice("");
            setPricePerKm("");
            setStatus("ACTIVE");
            setTouchedName(false);
            setTouchedSeats(false);
            setShowSuggestions(false);
        }
    }, [open]);

    // Early return PHẢI sau tất cả hooks
    if (!open) return null;

    const seatsNum = Number(cleanDigits(seats));
    const baseFeeNum = baseFee ? Number(cleanDigits(baseFee)) : null;
    const sameDayFixedPriceNum = sameDayFixedPrice ? Number(cleanDigits(sameDayFixedPrice)) : null;
    const pricePerKmNum = pricePerKm ? Number(cleanDigits(pricePerKm)) : null;

    // Validation
    const nameEmpty = trimmedName.length === 0 || trimmedName === "Xe";
    const nameNotStartWithXe = !trimmedName.toLowerCase().startsWith("xe ");
    const nameDuplicate = existingCategories.some(
        (cat) => cat.name?.toLowerCase() === trimmedName.toLowerCase()
    );
    const nameError = nameEmpty || nameNotStartWithXe || nameDuplicate;
    const seatsError = isNaN(seatsNum) || seatsNum <= 0;
    const valid = !nameError && !seatsError;

    // Handler cho input name - đảm bảo luôn bắt đầu bằng "Xe "
    const handleNameChange = (e) => {
        let value = e.target.value;
        // Nếu user xóa hết hoặc xóa "Xe ", tự động thêm lại
        if (!value.startsWith("Xe ") && !value.startsWith("Xe")) {
            value = "Xe " + value;
        } else if (value === "Xe" || value === "X" || value === "") {
            value = "Xe ";
        }
        setName(value);
        setShowSuggestions(true);
    };

    async function handleSave() {
        if (!valid) return;
        setLoading(true);

        const newCat = {
            id: Date.now(),
            name: name.trim(),
            seats: seatsNum,
            baseFee: baseFeeNum,
            sameDayFixedPrice: sameDayFixedPriceNum,
            pricePerKm: pricePerKmNum,
            status: status,
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
                <div className="px-5 py-4 space-y-4 text-[13px] max-h-[60vh] overflow-y-auto">
                    {/* Name & Seats - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Name */}
                        <div className="relative">
                            <div className="text-[12px] text-slate-600 mb-1">
                                Tên danh mục <span className="text-red-500">*</span>
                            </div>
                            <input
                                value={name}
                                onChange={handleNameChange}
                                onBlur={() => {
                                    setTouchedName(true);
                                    // Delay hide để cho phép click vào suggestion
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px]",
                                    touchedName && nameError
                                        ? "border-red-400 bg-red-50"
                                        : "border-slate-300 bg-white",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                )}
                                placeholder="Xe 7 chỗ"
                            />
                            {/* Error messages */}
                            {touchedName && nameEmpty && (
                                <div className="text-[11px] text-red-500 mt-1">
                                    Tên danh mục không được để trống.
                                </div>
                            )}
                            {touchedName && !nameEmpty && nameDuplicate && (
                                <div className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Tên danh mục đã tồn tại trong hệ thống.
                                </div>
                            )}
                            {touchedName && !nameEmpty && nameNotStartWithXe && !nameDuplicate && (
                                <div className="text-[11px] text-red-500 mt-1">
                                    Tên danh mục phải bắt đầu bằng "Xe ".
                                </div>
                            )}
                            {/* Suggestions dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                    <div className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-50 border-b border-slate-100">
                                        Danh mục tương tự đã có:
                                    </div>
                                    {suggestions.map((cat) => (
                                        <div
                                            key={cat.id}
                                            className="px-3 py-2 text-[12px] text-slate-700 hover:bg-amber-50 cursor-pointer flex items-center gap-2"
                                            onClick={() => {
                                                // Không cho chọn vì đã tồn tại
                                            }}
                                        >
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                            <span className="font-medium">{cat.name}</span>
                                            <span className="text-slate-400">({cat.seats} ghế)</span>
                                        </div>
                                    ))}
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

                    {/* Pricing fields - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Phí mở cửa */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Phí mở cửa (VNĐ)
                            </div>
                            <input
                                value={baseFee}
                                onChange={(e) => setBaseFee(cleanDigits(e.target.value))}
                                inputMode="numeric"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] tabular-nums focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                placeholder="50000"
                            />
                        </div>

                        {/* Giá theo km */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Giá theo km (VNĐ)
                            </div>
                            <input
                                value={pricePerKm}
                                onChange={(e) => setPricePerKm(cleanDigits(e.target.value))}
                                inputMode="numeric"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] tabular-nums focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                placeholder="15000"
                            />
                        </div>
                    </div>

                    {/* Giá cố định/ngày & Status - 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Giá cố định/ngày */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Giá cố định/ngày (VNĐ)
                            </div>
                            <input
                                value={sameDayFixedPrice}
                                onChange={(e) => setSameDayFixedPrice(cleanDigits(e.target.value))}
                                inputMode="numeric"
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] tabular-nums focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                                placeholder="1500000"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Trạng thái
                            </div>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                            >
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="INACTIVE">Chưa hoạt động</option>
                            </select>
                        </div>
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
                                  }) {
    const [baseFee, setBaseFee] = React.useState("");
    const [sameDayFixedPrice, setSameDayFixedPrice] = React.useState("");
    const [pricePerKm, setPricePerKm] = React.useState("");
    const [status, setStatus] = React.useState("ACTIVE");
    const [loadingSave, setLoadingSave] = React.useState(false);

    React.useEffect(() => {
        if (open && data) {
            console.log("📝 Edit modal data:", data);
            console.log("📝 baseFee value:", data.baseFee);
            setBaseFee(String(data.baseFee ?? ""));
            setSameDayFixedPrice(String(data.sameDayFixedPrice ?? ""));
            setPricePerKm(String(data.pricePerKm ?? ""));
            setStatus(data.status ?? "ACTIVE");
        }
    }, [open, data]);

    if (!open || !data) return null;

    const cleanNumber = (s) => s.replace(/[^0-9]/g, "");

    const baseFeeNum = baseFee ? Number(cleanNumber(baseFee)) : null;
    const sameDayFixedPriceNum = sameDayFixedPrice ? Number(cleanNumber(sameDayFixedPrice)) : null;
    const pricePerKmNum = pricePerKm ? Number(cleanNumber(pricePerKm)) : null;

    async function handleSave() {
        setLoadingSave(true);
        onSaved({
            id: data.id,
            name: data.name,
            seats: data.seats,
            description: data.description,
            baseFee: baseFeeNum,
            sameDayFixedPrice: sameDayFixedPriceNum,
            pricePerKm: pricePerKmNum,
            status,
        });
        setLoadingSave(false);
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
                        <Pencil className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col leading-tight">
                        <div className="text-slate-900 font-semibold text-[14px]">
                            Chỉnh sửa danh mục
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {data.name} (ID #{data.id})
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
                <div className="px-5 py-4 space-y-4 text-[13px]">
                    {/* Base Fee */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Phí mở cửa (VNĐ)
                        </div>
                        <input
                            value={baseFee}
                            onChange={(e) => setBaseFee(cleanNumber(e.target.value))}
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                        />
                    </div>

                    {/* Same Day Fixed Price */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Giá cố định/ngày (VNĐ)
                        </div>
                        <input
                            value={sameDayFixedPrice}
                            onChange={(e) => setSameDayFixedPrice(cleanNumber(e.target.value))}
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                        />
                    </div>

                    {/* Price per Km */}
                    <div>
                        <div className="text-[12px] text-slate-600 mb-1">
                            Giá theo km (VNĐ)
                        </div>
                        <input
                            value={pricePerKm}
                            onChange={(e) => setPricePerKm(cleanNumber(e.target.value))}
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[13px] tabular-nums bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                        />
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
                            <option value="INACTIVE">Chưa hoạt động</option>
                        </select>
                    </div>
                </div>

                {/* footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                    >
                        Đóng
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loadingSave}
                        className="rounded-md px-3 py-2 text-[13px] font-medium text-white shadow-sm bg-sky-600 hover:bg-sky-500 disabled:opacity-50"
                    >
                        {loadingSave ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------------------- Modal Customer List ------------------------ */
function CustomerListModal({ open, onClose }) {
    const [customers, setCustomers] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalItems, setTotalItems] = React.useState(0);
    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [branchId, setBranchId] = React.useState("");
    const [branchName, setBranchName] = React.useState("");
    const pageSize = 10;

    // Load branch for current user
    React.useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const userId = localStorage.getItem("userId");
                if (userId) {
                    const branch = await getBranchByUserId(Number(userId));
                    if (branch) {
                        setBranchId(String(branch.id || branch.branchId || ""));
                        setBranchName(branch.branchName || "");
                    }
                }
            } catch (err) {
                console.warn("Could not load branch:", err);
            }
        })();
    }, [open]);

    // Load customers
    const loadCustomers = React.useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await listCustomers({
                branchId: branchId || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page,
                size: pageSize,
            });

            // Handle different response structures
            const items = result?.data?.items || result?.items || result?.content || result?.data?.content || [];
            const total = result?.data?.totalElements || result?.totalElements || result?.data?.total || items.length;
            const pages = result?.data?.totalPages || result?.totalPages || Math.ceil(total / pageSize) || 1;

            setCustomers(items);
            setTotalItems(total);
            setTotalPages(pages);
        } catch (err) {
            console.error("Load customers error:", err);
            setError("Không thể tải danh sách khách hàng");
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [branchId, startDate, endDate, page]);

    React.useEffect(() => {
        if (open) {
            loadCustomers();
        }
    }, [open, loadCustomers]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl rounded-xl bg-white border border-slate-200 shadow-xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <Users className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col leading-tight flex-1">
                        <div className="text-slate-900 font-semibold text-[14px]">
                            Danh sách khách hàng
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {totalItems} khách hàng
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* filter bar */}
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 items-center">
                    {/* Branch info */}
                    {branchName && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-600">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>{branchName}</span>
                        </div>
                    )}

                    {/* Start date */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-[12px] bg-white"
                            placeholder="Từ ngày"
                        />
                    </div>

                    {/* End date */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[12px]">đến</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-[12px] bg-white"
                            placeholder="Đến ngày"
                        />
                    </div>

                    {/* Search button */}
                    <button
                        onClick={() => {
                            setPage(1);
                            loadCustomers();
                        }}
                        className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-[12px] text-sky-700 hover:bg-sky-100 flex items-center gap-1"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Tìm kiếm
                    </button>
                </div>

                {/* body */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="px-5 py-10 text-center text-slate-500 text-[13px]">
                            Đang tải...
                        </div>
                    ) : error ? (
                        <div className="px-5 py-10 text-center text-red-500 text-[13px]">
                            {error}
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="px-5 py-10 text-center text-slate-400 text-[13px]">
                            Không có khách hàng nào
                        </div>
                    ) : (
                        <table className="w-full text-[13px]">
                            <thead className="bg-slate-100 border-b text-[11px] uppercase text-slate-500 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">Tên</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">SĐT</th>
                                <th className="px-4 py-2 text-left">Ghi chú</th>
                            </tr>
                            </thead>
                            <tbody>
                            {customers.map((c, idx) => (
                                <tr
                                    key={c.id || idx}
                                    className="hover:bg-slate-50 transition border-b border-slate-200 last:border-none"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[11px] font-semibold">
                                                {(c.fullName || c.name || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-900">
                                                    {c.fullName || c.name || "—"}
                                                </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            {c.email || "—"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                            {c.phone || c.phoneNumber || "—"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-slate-500 text-[12px]">
                                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                                            {c.note || c.notes || "—"}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* pagination */}
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
                    <div className="text-[12px] text-slate-500">
                        Trang {page} / {totalPages} ({totalItems} khách hàng)
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
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
        (c) => {
            console.log("📦 Raw category data from API:", c);
            return {
                id: c.id,
                name: c.categoryName || c.name,
                status: c.status || "ACTIVE",
                seats: c.seats ?? null,
                vehicles_count: c.vehiclesCount ?? c.vehicles_count ?? 0,
                description: c.description || "",
                baseFee: c.baseFare ?? c.baseFee ?? null,
                sameDayFixedPrice: c.sameDayFixedPrice ?? null,
                pricePerKm: c.pricePerKm ?? null,
                highwayFee: c.highwayFee ?? null,
                fixedCosts: c.fixedCosts ?? null,
            };
        },
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
    const [customerListOpen, setCustomerListOpen] = React.useState(false);

    // Pagination cho danh mục
    const [catPage, setCatPage] = React.useState(1);
    const catPageSize = 10;
    const catTotalPages = Math.ceil(categories.length / catPageSize) || 1;
    const pagedCategories = React.useMemo(() => {
        const start = (catPage - 1) * catPageSize;
        return categories.slice(start, start + catPageSize);
    }, [categories, catPage, catPageSize]);

    async function handleCreated(cat) {
        try {
            const result = await createVehicleCategory({
                categoryName: cat.name,
                seats: cat.seats,
                baseFee: cat.baseFee,
                sameDayFixedPrice: cat.sameDayFixedPrice,
                pricePerKm: cat.pricePerKm,
                status: cat.status || "ACTIVE",
            });

            setCategories((arr) => [mapCat(result), ...arr]);
            setCatPage(1); // Reset về trang đầu để thấy danh mục mới
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
                baseFee: cat.baseFee,
                sameDayFixedPrice: cat.sameDayFixedPrice,
                pricePerKm: cat.pricePerKm,
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
            pushToast("Cập nhật thất bại: " + (e.message || "Lỗi không xác định"), "error");
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
                                className="hover:bg-slate-50 transition border-b border-slate-200 last:border-none"
                            >
                                <td className="px-4 py-3 align-top">
                                    <div className="font-medium text-slate-900">
                                        {cat.name}
                                    </div>
                                </td>

                                <td className="px-4 py-3 align-top">
                                    {cat.seats} ghế
                                </td>

                                <td className="px-4 py-3 align-top text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                                            <CarFront className="h-3 w-3" />
                                            {cat.vehicles_count ?? 0}
                                        </span>
                                </td>

                                <td className="px-4 py-3 align-top text-right tabular-nums">
                                    {cat.baseFee ? fmtVND(cat.baseFee) + " đ" : "—"}
                                </td>

                                <td className="px-4 py-3 align-top text-right tabular-nums">
                                    {cat.sameDayFixedPrice ? fmtVND(cat.sameDayFixedPrice) + " đ" : "—"}
                                </td>

                                <td className="px-4 py-3 align-top text-right tabular-nums">
                                    {cat.pricePerKm ? fmtVND(cat.pricePerKm) + " đ" : "—"}
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <StatusPill status={cat.status} />
                                </td>

                                <td className="px-4 py-3 align-top">
                                    <button
                                        onClick={() => {
                                            setEditData(cat);
                                            setEditOpen(true);
                                        }}
                                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] hover:bg-slate-100 text-slate-700 shadow-sm flex items-center gap-1"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Sửa
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {pagedCategories.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-10 text-center text-slate-400"
                                >
                                    Chưa có danh mục nào.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {categories.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-[12px] text-slate-500">
                            Hiển thị {(catPage - 1) * catPageSize + 1} - {Math.min(catPage * catPageSize, categories.length)} / {categories.length} danh mục
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                                disabled={catPage <= 1}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Trước
                            </button>
                            <span className="text-[12px] text-slate-600 px-2">
                                Trang {catPage} / {catTotalPages}
                            </span>
                            <button
                                onClick={() => setCatPage((p) => Math.min(catTotalPages, p + 1))}
                                disabled={catPage >= catTotalPages}
                                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Sau
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            <VehicleCategoryCreateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={handleCreated}
                existingCategories={categories}
            />

            <VehicleCategoryEditModal
                open={editOpen}
                data={editData}
                onClose={() => setEditOpen(false)}
                onSaved={handleSaved}
            />

            <CustomerListModal
                open={customerListOpen}
                onClose={() => setCustomerListOpen(false)}
            />
        </div>
    );
}
