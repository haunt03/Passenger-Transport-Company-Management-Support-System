// CreateOrderPage.jsx (LIGHT THEME)
import React from "react";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { calculatePrice, createBooking } from "../../api/bookings";
import {
    Phone,
    User,
    Mail,
    MapPin,
    Calendar,
    Clock,
    CarFront,
    Users,
    AlertTriangle,
    Percent,
    DollarSign,
    Save,
    Send,
    Loader2,
    Building2,
} from "lucide-react";

/**
 * M4.S2 - Create Order (Tạo Đơn Hàng)
 *
 * Phần 1. Thông tin khách hàng
 *  - Số điện thoại (gõ vào -> auto fill mock)
 *  - Tên KH
 *  - Email
 *
 * Phần 2. Hình thức thuê
 *  - hireType: ONE_WAY / ROUND_TRIP / DAILY
 *
 * Phần 3. Thông tin chuyến đi
 *  - Điểm đi / Điểm đến
 *  - Thời gian đón / Thời gian kết thúc dự kiến
 *  - Loại xe yêu cầu (category)
 *  - Số người / Số xe
 *  - Check availability (mock API)
 *
 * Phần 4. Báo giá
 *  - Giá hệ thống dự kiến (readonly)
 *  - Giảm giá (tiền hoặc % - demo chỉ 1 ô số tiền)
 *  - Lý do giảm giá
 *  - Giá báo khách (editable)
 *
 * Hành động:
 *  - Lưu nháp => status: DRAFT
 *  - Đặt đơn   => status: PENDING
 *
 * API specs:
 *  POST /api/orders/check-availability
 *  POST /api/orders/calculate-price
 *  POST /api/orders
 */

/* utils */
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

// Convert "YYYY-MM-DDTHH:mm" (datetime-local) to ISO string with Z
function toIsoZ(s) {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString();
}

/* mock categories */
const MOCK_CATEGORIES = [
    { id: "SEDAN4", name: "Sedan 4 chỗ", seats: 4 },
    { id: "SUV7", name: "SUV 7 chỗ", seats: 7 },
    { id: "BUS16", name: "Minibus 16 chỗ", seats: 16 },
];

/* mini toast (light style) */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = (msg, kind = "info", ttl = 2500) => {
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
                        "border-emerald-200 bg-emerald-50 text-emerald-700",
                        t.kind === "error" &&
                        "border-rose-200 bg-rose-50 text-rose-700",
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

/* availability badge (light style) */
function AvailabilityBadge({ info }) {
    if (!info) return null;
    const { ok, count, text } = info;
    return (
        <div
            className={cls(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1",
                ok
                    ? "ring-emerald-200 bg-emerald-50 text-emerald-700"
                    : "ring-rose-200 bg-rose-50 text-rose-700"
            )}
        >
            <CarFront className="h-3.5 w-3.5" />
            <span>
                {text}{" "}
                {typeof count === "number" ? `(${count} xe)` : ""}
            </span>
        </div>
    );
}

export default function CreateOrderPage() {
    const { toasts, push } = useToasts();

    /* --- Phần 1: khách hàng --- */
    const [phone, setPhone] = React.useState("");
    const [customerName, setCustomerName] = React.useState("");
    const [email, setEmail] = React.useState("");

    /* --- Phần 2: hình thức thuê --- */
    const [hireType, setHireType] =
        React.useState("ONE_WAY"); // ONE_WAY | ROUND_TRIP | DAILY

    /* --- Phần 3: chuyến đi / yêu cầu xe --- */
    const [pickup, setPickup] = React.useState("");
    const [dropoff, setDropoff] = React.useState("");
    const [startTime, setStartTime] = React.useState("");
    const [endTime, setEndTime] = React.useState("");
    const [categoryId, setCategoryId] = React.useState("");
    const [categories, setCategories] = React.useState([]);
    const [paxCount, setPaxCount] = React.useState(1);
    const [vehicleCount, setVehicleCount] =
        React.useState(1);

    // branch mặc định theo user đăng nhập
    const [branchId] = React.useState("1");

    // availability check
    const [availabilityInfo, setAvailabilityInfo] =
        React.useState(null);
    const [checkingAvail, setCheckingAvail] =
        React.useState(false);

    // mock "API check-availability"
    React.useEffect(() => {
        if (!startTime || !endTime || !categoryId) return;

        setCheckingAvail(true);

        setTimeout(() => {
            if (categoryId === "BUS16") {
                setAvailabilityInfo({
                    ok: false,
                    count: 0,
                    text: "Cảnh báo: Hết xe",
                    branch: branchId,
                });
            } else {
                setAvailabilityInfo({
                    ok: true,
                    count: 5,
                    text: "Khả dụng: Còn xe",
                    branch: branchId,
                });
            }
            setCheckingAvail(false);
        }, 400);
    }, [startTime, endTime, categoryId, branchId]);

    /* --- Part 4: báo giá --- */
    const [estPriceSys, setEstPriceSys] =
        React.useState(0); // giá gợi ý system
    const [discount, setDiscount] = React.useState(0);
    const [discountReason, setDiscountReason] =
        React.useState("");
    const [quotedPrice, setQuotedPrice] =
        React.useState(0);

    const [calculatingPrice, setCalculatingPrice] =
        React.useState(false);

    const [distanceKm, setDistanceKm] = React.useState("");

    // load categories from backend
    React.useEffect(() => {
        (async () => {
            try {
                const list = await listVehicleCategories();
                if (Array.isArray(list) && list.length > 0) {
                    setCategories(list.map(c => ({ id: String(c.id), name: c.categoryName })));
                    setCategoryId(String(list[0].id));
                }
            } catch {}
        })();
    }, []);

    // calculate via backend when possible
    React.useEffect(() => {
        const run = async () => {
            if (!categoryId || !distanceKm) return;
            setCalculatingPrice(true);
            try {
                const price = await calculatePrice({
                    vehicleCategoryIds: [Number(categoryId)],
                    quantities: [Number(vehicleCount || 1)],
                    distance: Number(distanceKm || 0),
                    useHighway: false,
                });
                const base = Number(price || 0);
                setEstPriceSys(base);
                setQuotedPrice((old) => (old > 0 ? old : base));
            } catch {} finally {
                setCalculatingPrice(false);
            }
        };
        run();
    }, [categoryId, vehicleCount, distanceKm]);

    /* --- submit states --- */
    const [loadingDraft, setLoadingDraft] =
        React.useState(false);
    const [loadingSubmit, setLoadingSubmit] =
        React.useState(false);

    /* --- auto fill khách khi nhập SĐT --- */
    React.useEffect(() => {
        if (phone && phone.includes("999")) {
            setCustomerName("Nguyễn Văn Cũ");
            setEmail("khachcu@example.com");
        }
    }, [phone]);

    /* --- helpers nhỏ --- */
    const numOnly = (s) => s.replace(/[^0-9]/g, "");

    const onChangePax = (v) => {
        setPaxCount(Number(numOnly(v)) || 0);
    };
    const onChangeVehicleCount = (v) => {
        setVehicleCount(Number(numOnly(v)) || 0);
    };

    /* --- payload preview / validation --- */
    const basePayload = {
        customer_phone: phone,
        customer_name: customerName,
        customer_email: email,
        hire_type: hireType,
        pickup,
        dropoff,
        start_time: startTime,
        end_time: endTime,
        category_id: categoryId,
        pax_count: paxCount,
        vehicle_count: vehicleCount,
        quoted_price: quotedPrice,
        discount_amount: discount,
        discount_reason: discountReason,
        branch_id: branchId,
    };

    const isValidCore =
        phone &&
        customerName &&
        pickup &&
        dropoff &&
        startTime &&
        endTime &&
        categoryId &&
        quotedPrice > 0;

    /* --- handlers --- */
    const saveDraft = async () => {
        if (!isValidCore) {
            push(
                "Thiếu dữ liệu bắt buộc (SĐT / Tên KH / Điểm đi / Điểm đến / Giá báo khách...)",
                "error"
            );
            return;
        }
        setLoadingDraft(true);
        try {
            const sStart = toIsoZ(startTime);
            const sEnd = toIsoZ(endTime);
            const req = {
                customer: { fullName: customerName, phone, email },
                branchId: Number(branchId),
                useHighway: false,
                trips: [
                    { startLocation: pickup, endLocation: dropoff, startTime: sStart, endTime: sEnd },
                ],
                vehicles: [
                    { vehicleCategoryId: Number(categoryId), quantity: Number(vehicleCount || 1) },
                ],
                estimatedCost: Number(estPriceSys || 0),
                discountAmount: Number(discount || 0),
                totalCost: Number(quotedPrice || 0),
                depositAmount: 0,
                status: "PENDING",
                distance: Number(distanceKm || 0),
            };
            await createBooking(req);
            push("Đã lưu nháp đơn hàng", "success");
        } catch {
            push("Lưu nháp thất bại", "error");
        } finally {
            setLoadingDraft(false);
        }
    };

    const submitOrder = async () => {
        if (!isValidCore) {
            push(
                "Thiếu dữ liệu bắt buộc. Kiểm tra lại thông tin.",
                "error"
            );
            return;
        }
        if (availabilityInfo && !availabilityInfo.ok) {
            push(
                "Cảnh báo: Hệ thống báo hết xe trong khung giờ này.",
                "error"
            );
            return;
        }

        setLoadingSubmit(true);
        try {
            const sStart = toIsoZ(startTime);
            const sEnd = toIsoZ(endTime);
            const req = {
                customer: { fullName: customerName, phone, email },
                branchId: Number(branchId),
                useHighway: false,
                trips: [
                    { startLocation: pickup, endLocation: dropoff, startTime: sStart, endTime: sEnd },
                ],
                vehicles: [
                    { vehicleCategoryId: Number(categoryId), quantity: Number(vehicleCount || 1) },
                ],
                estimatedCost: Number(estPriceSys || 0),
                discountAmount: Number(discount || 0),
                totalCost: Number(quotedPrice || 0),
                depositAmount: 0,
                status: "CONFIRMED",
                distance: Number(distanceKm || 0),
            };
            const created = await createBooking(req);
            push(`Đã tạo đơn hàng #${created?.id || "?"}`, "success");
        } catch {
            push("Tạo đơn hàng thất bại", "error");
        } finally {
            setLoadingSubmit(false);
        }
    };

    /* --- styles reused --- */
    const inputCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500";
    const labelCls =
        "text-[12px] text-slate-600 mb-1 flex items-center gap-1";

    /* --- UI --- */
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <CarFront className="h-6 w-6 text-sky-600" />
                            <span>Tạo đơn hàng mới</span>
                        </div>

                        <span className="rounded-md border border-slate-300 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            Chi nhánh:{" "}
                            <span className="text-slate-900 font-semibold">
                                {branchId}
                            </span>
                        </span>
                    </div>

                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2 leading-relaxed">
                        Điền thông tin khách + hành trình. Hệ
                        thống sẽ tự kiểm tra xe & gợi ý giá.
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col gap-2 w-full max-w-[260px]">
                    {/* Lưu nháp */}
                    <button
                        onClick={saveDraft}
                        disabled={loadingDraft}
                        type="button"
                        className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-[13px] text-slate-700 px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingDraft ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                            <Save className="h-4 w-4 text-slate-600" />
                        )}
                        <span>Lưu nháp</span>
                    </button>

                    {/* Đặt đơn */}
                    <button
                        onClick={submitOrder}
                        disabled={loadingSubmit}
                        type="button"
                        className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[13px] px-4 py-2 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingSubmit ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Send className="h-4 w-4 text-white" />
                        )}
                        <span>Đặt đơn</span>
                    </button>
                </div>
            </div>

            {/* FORM GRID */}
            <div className="grid xl:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Phần 1: KHÁCH HÀNG */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-900 text-[14px] font-semibold mb-4">
                            <User className="h-4 w-4 text-sky-600" />
                            <span>Thông tin khách hàng</span>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 text-[13px]">
                            {/* SĐT */}
                            <div className="sm:col-span-1">
                                <div className={labelCls}>
                                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số điện thoại *</span>
                                </div>
                                <input
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(
                                            e.target.value.replace(
                                                /[^0-9+]/g,
                                                ""
                                            )
                                        )
                                    }
                                    className={inputCls}
                                    placeholder="Ví dụ: 0987..."
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Hệ thống sẽ tìm khách hàng cũ
                                    theo SĐT.
                                </div>
                            </div>

                            {/* Tên KH */}
                            <div className="sm:col-span-1">
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Tên khách hàng *
                                </div>
                                <input
                                    value={customerName}
                                    onChange={(e) =>
                                        setCustomerName(
                                            e.target.value
                                        )
                                    }
                                    className={inputCls}
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            {/* Email */}
                            <div className="sm:col-span-1">
                                <div className={labelCls}>
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Email</span>
                                </div>
                                <input
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    className={inputCls}
                                    placeholder="a@example.com"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Phần 2: HÌNH THỨC THUÊ */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-900 text-[14px] font-semibold mb-4">
                            <CarFront className="h-4 w-4 text-emerald-600" />
                            <span>Hình thức thuê xe</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[13px]">
                            {[
                                { key: "ONE_WAY", label: "Một chiều" },
                                { key: "ROUND_TRIP", label: "Hai chiều" },
                                { key: "DAILY", label: "Theo ngày" },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() =>
                                        setHireType(opt.key)
                                    }
                                    className={cls(
                                        "px-3 py-2 rounded-md border text-[13px] flex items-center gap-2 shadow-sm",
                                        hireType ===
                                        opt.key
                                            ? "ring-1 ring-emerald-200 bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                    )}
                                >
                                    <CarFront className="h-4 w-4" />
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Phần 4: GIÁ BÁO KHÁCH */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-900 text-[14px] font-semibold mb-4">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                            <span>Báo giá</span>
                            {calculatingPrice ? (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-normal">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                    Đang tính...
                                </span>
                            ) : null}
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 text-[13px]">
                            {/* Giá hệ thống */}
                            <div className="md:col-span-1">
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Giá hệ thống (dự kiến)
                                </div>
                                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 tabular-nums font-semibold text-slate-900">
                                    {fmtVND(estPriceSys)} đ
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Tự động tính theo tuyến /
                                    loại xe.
                                </div>
                            </div>

                            {/* Quãng đường (km) */}
                            <div className="md:col-span-1">
                                <div className={labelCls}>
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Quãng đường (km)</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={distanceKm}
                                    onChange={(e) => setDistanceKm(e.target.value)}
                                    className={cls(inputCls, "tabular-nums")}
                                    placeholder="Ví dụ: 50"
                                />
                            </div>

                            {/* Giảm giá */}
                            <div className="md:col-span-1">
                                <div className={labelCls}>
                                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Giảm giá (VND)</span>
                                </div>
                                <input
                                    value={discount}
                                    onChange={(e) =>
                                        setDiscount(
                                            numOnly(
                                                e.target
                                                    .value
                                            )
                                        )
                                    }
                                    className={cls(
                                        inputCls,
                                        "tabular-nums"
                                    )}
                                    placeholder="0"
                                />
                                <input
                                    value={
                                        discountReason
                                    }
                                    onChange={(e) =>
                                        setDiscountReason(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={cls(
                                        inputCls,
                                        "mt-2 text-[12px]"
                                    )}
                                    placeholder="Lý do giảm giá (ví dụ: khách VIP)"
                                />
                            </div>

                            {/* Giá báo khách */}
                            <div className="md:col-span-1">
                                <div className="text-[12px] text-slate-600 mb-1">
                                    Giá báo khách
                                    (VND) *
                                </div>
                                <input
                                    value={quotedPrice}
                                    onChange={(e) =>
                                        setQuotedPrice(
                                            Number(
                                                numOnly(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            ) || 0
                                        )
                                    }
                                    className={cls(
                                        inputCls,
                                        "tabular-nums font-semibold"
                                    )}
                                    placeholder="0"
                                />
                                <div className="text-[11px] text-slate-400 mt-1">
                                    Đây là giá cuối cùng báo
                                    khách.
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Phần 3: THÔNG TIN CHUYẾN */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-900 text-[14px] font-semibold mb-4">
                            <MapPin className="h-4 w-4 text-sky-600" />
                            <span>Thông tin chuyến đi</span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-[13px]">
                            {/* Điểm đi */}
                            <div>
                                <div className={labelCls}>
                                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Điểm đi *</span>
                                </div>
                                <input
                                    value={pickup}
                                    onChange={(e) =>
                                        setPickup(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={inputCls}
                                    placeholder="VD: Sân bay Nội Bài T1 cột 5"
                                />
                            </div>

                            {/* Điểm đến */}
                            <div>
                                <div className={labelCls}>
                                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                                    <span>
                                        Điểm đến *
                                    </span>
                                </div>
                                <input
                                    value={dropoff}
                                    onChange={(e) =>
                                        setDropoff(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={inputCls}
                                    placeholder="VD: Khách sạn Pearl Westlake"
                                />
                            </div>

                            {/* Thời gian đón */}
                            <div>
                                <div className={labelCls}>
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        Thời gian
                                        đón *
                                    </span>
                                </div>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) =>
                                        setStartTime(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={inputCls}
                                />
                            </div>

                            {/* Kết thúc dự kiến */}
                            <div>
                                <div className={labelCls}>
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        Kết thúc
                                        dự kiến *
                                    </span>
                                </div>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) =>
                                        setEndTime(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={inputCls}
                                />
                            </div>

                            {/* Loại xe */}
                            <div>
                                <div className={labelCls}>
                                    <CarFront className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>
                                        Loại xe
                                        yêu cầu *
                                    </span>
                                </div>
                                <select
                                    value={categoryId}
                                    onChange={(e) =>
                                        setCategoryId(
                                            e.target
                                                .value
                                        )
                                    }
                                    className={inputCls}
                                >
                                    {(categories.length ? categories : MOCK_CATEGORIES).map(
                                        (c) => (
                                            <option
                                                key={
                                                    c.id
                                                }
                                                value={
                                                    c.id
                                                }
                                            >
                                                {c.name}{" "}
                                                (
                                                {
                                                    c.seats
                                                }{" "}
                                                chỗ)
                                            </option>
                                        )
                                    )}
                                </select>

                                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                    {checkingAvail ? (
                                        <span className="inline-flex items-center gap-1 text-slate-500">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                            Đang kiểm tra
                                            xe trống...
                                        </span>
                                    ) : (
                                        <AvailabilityBadge
                                            info={
                                                availabilityInfo
                                            }
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Số khách / Số xe */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={labelCls}>
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        <span>
                                            Số
                                            khách
                                        </span>
                                    </div>
                                    <input
                                        value={
                                            paxCount
                                        }
                                        onChange={(e) =>
                                            onChangePax(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={cls(
                                            inputCls,
                                            "tabular-nums"
                                        )}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <div className={labelCls}>
                                        <CarFront className="h-3.5 w-3.5 text-slate-400" />
                                        <span>
                                            Số xe
                                        </span>
                                    </div>
                                    <input
                                        value={
                                            vehicleCount
                                        }
                                        onChange={(e) =>
                                            onChangeVehicleCount(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={cls(
                                            inputCls,
                                            "tabular-nums"
                                        )}
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            {/* Note / cảnh báo */}
                            <div className="md:col-span-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-600 flex items-start gap-2 leading-relaxed">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <div>
                                        Hãy xác nhận lại điểm
                                        đón, số lượng hành lý
                                        cồng kềnh và thời gian
                                        chờ khách (nếu có). Nếu
                                        xe hết, báo quản lý điều
                                        phối để mượn xe chi
                                        nhánh khác.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* validation / warnings */}
                    {!isValidCore ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] p-3 flex items-start gap-2 leading-relaxed">
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                            <div>
                                Thiếu thông tin bắt buộc (SĐT,
                                Tên KH, Điểm đi / Đến, thời
                                gian, Giá báo khách...). Bạn
                                chưa thể gửi đơn chính thức.
                            </div>
                        </div>
                    ) : null}

                    {availabilityInfo &&
                    !availabilityInfo.ok ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] p-3 flex items-start gap-2 leading-relaxed">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <div>
                                Xe trong chi nhánh{" "}
                                <span className="font-semibold text-slate-900">
                                    {branchId}
                                </span>{" "}
                                đang hết cho loại này / khung
                                giờ này. Vui lòng báo quản lý
                                để điều phối chi nhánh khác.
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* FOOTER NOTE */}
            <div className="text-[11px] text-slate-500 mt-8 leading-relaxed">
                <div className="opacity-80">
                    API khi submit:
                </div>
                <div className="font-mono text-[11px] text-slate-400 break-all">
                    POST /api/orders
                </div>
                <div className="font-mono text-[11px] text-slate-400 break-all whitespace-pre-wrap">
                    {JSON.stringify(
                        {
                            ...basePayload,
                            status: "PENDING",
                        },
                        null,
                        2
                    )}
                </div>
            </div>
        </div>
    );
}
