// EditOrderPage.jsx (LIGHT THEME)
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBooking, updateBooking, calculatePrice, assignBooking } from "../../api/bookings";
import { calculateDistance } from "../../api/graphhopper";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { listBranches } from "../../api/branches";
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    CarFront,
    DollarSign,
    AlertTriangle,
    Save,
    Send,
    Loader2,
    Navigation,
} from "lucide-react";

/**
 * EditOrderPage (Module 4.S5)
 *
 * Rule:
 *  - Chỉ cho sửa nếu status là DRAFT hoặc PENDING
 *  - Nếu ASSIGNED / COMPLETED -> khóa form, hiện cảnh báo
 *
 * API target sau này:
 *   GET /api/orders/{orderId}
 *   PUT /api/orders/{orderId}
 */

/* ---------------- helpers ---------------- */
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtMoney = (n) =>
    new Intl.NumberFormat("vi-VN").format(
        Math.max(0, Number(n || 0))
    ) + " đ";

/* ---------------- trạng thái đơn ---------------- */
const ORDER_STATUS_LABEL = {
    DRAFT: "Nháp",
    PENDING: "Chờ xử lý",
    ASSIGNED: "Đã phân xe/tài xế",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
};

const ORDER_STATUS_STYLE_LIGHT = {
    DRAFT: "ring-1 ring-slate-300 bg-slate-100 text-slate-700",
    PENDING:
        "ring-1 ring-amber-200 bg-amber-50 text-amber-700",
    ASSIGNED: "ring-1 ring-sky-200 bg-sky-50 text-sky-700",
    COMPLETED:
        "ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED:
        "ring-1 ring-rose-200 bg-rose-50 text-rose-700",
};

function StatusPill({ status }) {
    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 rounded-md px-2 py-[2px] text-[11px] font-medium",
                ORDER_STATUS_STYLE_LIGHT[status] ||
                "ring-1 ring-slate-300 bg-slate-100 text-slate-700"
            )}
        >
            <span>
                {ORDER_STATUS_LABEL[status] || status}
            </span>
        </span>
    );
}

/* ---------------- Toast mini (light style) ---------------- */
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

// Removed MOCK_CATEGORIES and MOCK_BRANCHES - chỉ dùng data từ API, báo lỗi nếu không fetch được

/* ---------------- giả lập data GET /api/orders/{orderId} ---------------- */
const MOCK_ORDER = {
    id: 10045,
    code: "ORD-2025-118",
    branch_id: "HN",
    status: "PENDING", // thử "ASSIGNED" để thấy form khoá
    customer_phone: "0901234567",
    customer_name: "Công ty ABC",
    customer_email: "booking@abc.com",
    pickup: "Sân bay Nội Bài - T1",
    dropoff: "Khách sạn Pearl Westlake, Tây Hồ",
    start_time: "2025-10-26T08:30",
    end_time: "2025-10-26T12:00",
    pax: 3,
    vehicles_needed: 1,
    category_id: "SEDAN4",
    category_label: "Sedan 4 chỗ",
    system_price: 1500000,
    discount_amount: 100000,
    discount_reason:
        "Khách quen / hợp đồng tháng",
    final_price: 1400000,
};

/* ========================= MAIN PAGE ========================= */
export default function EditOrderPage() {
    const { toasts, pushToast } = useToasts();
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const seedOrder = location?.state?.order;

    /* --- trạng thái đơn hàng --- */
    const [status, setStatus] = React.useState("PENDING");

    /* --- chi nhánh --- */
    const [branchId, setBranchId] = React.useState("");

    /* --- khách hàng --- */
    const [customerPhone, setCustomerPhone] = React.useState("");
    const [customerName, setCustomerName] = React.useState("");
    const [customerEmail, setCustomerEmail] = React.useState("");

    /* --- hành trình --- */
    const [pickup, setPickup] = React.useState("");
    const [dropoff, setDropoff] = React.useState("");
    const [startTime, setStartTime] = React.useState("");
    const [endTime, setEndTime] = React.useState("");
    const [distanceKm, setDistanceKm] = React.useState("");
    const [calculatingDistance, setCalculatingDistance] = React.useState(false);
    const [distanceError, setDistanceError] = React.useState("");

    /* --- thông số xe --- */
    const [pax, setPax] = React.useState("0");
    const [vehiclesNeeded, setVehiclesNeeded] = React.useState("1");
    const [categoryId, setCategoryId] = React.useState("");
    const [categories, setCategories] = React.useState([]);
    const [branches, setBranches] = React.useState([]);

    const [availabilityMsg, setAvailabilityMsg] =
        React.useState("");

    /* --- giá --- */
    const [systemPrice, setSystemPrice] = React.useState(0);
    const [discountAmount, setDiscountAmount] = React.useState("0");
    const [discountReason, setDiscountReason] = React.useState("");
    const [finalPrice, setFinalPrice] = React.useState(0);

    // assignment
    const [driverId, setDriverId] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");

    /* --- submit state --- */
    const [submittingDraft, setSubmittingDraft] =
        React.useState(false);
    const [submittingUpdate, setSubmittingUpdate] =
        React.useState(false);

    /* --- quyền sửa --- */
    const canEdit =
        status === "DRAFT" || status === "PENDING";

    // helper ISO
    const toIsoZ = (s) => {
        if (!s) return null;
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        return d.toISOString();
    };

    // seed from navigation state if exists (instant prefill)
    React.useEffect(() => {
        if (!seedOrder) return;
        setCustomerName(seedOrder.customer_name || "");
        setCustomerPhone(seedOrder.customer_phone || "");
        setPickup(seedOrder.pickup || "");
        setDropoff(seedOrder.dropoff || "");
        if (seedOrder.pickup_time) {
            const d = new Date(String(seedOrder.pickup_time).replace(" ", "T"));
            if (!Number.isNaN(d.getTime())) setStartTime(d.toISOString().slice(0,16));
        }
        if (seedOrder.dropoff_eta) {
            const d2 = new Date(String(seedOrder.dropoff_eta).replace(" ", "T"));
            if (!Number.isNaN(d2.getTime())) setEndTime(d2.toISOString().slice(0,16));
        }
        if (seedOrder.vehicle_count != null) setVehiclesNeeded(String(seedOrder.vehicle_count));
        if (seedOrder.quoted_price != null) {
            setFinalPrice(Number(seedOrder.quoted_price));
        }
    }, [seedOrder]);

    // load booking + categories
    React.useEffect(() => {
        (async () => {
            try {
                const cats = await listVehicleCategories();
                if (Array.isArray(cats) && cats.length > 0) {
                    setCategories(cats);
                } else {
                    pushToast("Không thể tải danh mục xe: Dữ liệu trống", "error");
                }
            } catch (err) {
                console.error("Failed to load categories:", err);
                pushToast("Không thể tải danh mục xe: " + (err.message || "Lỗi không xác định"), "error");
            }
            try {
                const br = await listBranches({ page: 0 });
                const items = Array.isArray(br?.items) ? br.items : (Array.isArray(br) ? br : []);
                if (items.length > 0) {
                    setBranches(items);
                } else {
                    pushToast("Không thể tải chi nhánh: Dữ liệu trống", "error");
                }
            } catch (err) {
                console.error("Failed to load branches:", err);
                pushToast("Không thể tải chi nhánh: " + (err.message || "Lỗi không xác định"), "error");
            }
            try {
                if (!orderId) return;
                const b = await getBooking(orderId);
                const t = (b.trips && b.trips[0]) || {};
                setStatus(b.status || "PENDING");
                setBranchId(String(b.branchId || ""));
                setCustomerPhone(b.customer?.phone || "");
                setCustomerName(b.customer?.fullName || "");
                setCustomerEmail(b.customer?.email || "");
                setPickup(t.startLocation || "");
                setDropoff(t.endLocation || "");
                setStartTime((t.startTime || "").toString().replace("Z", ""));
                setEndTime((t.endTime || "").toString().replace("Z", ""));
                setDistanceKm(String(t.distance || ""));
                const qty = Array.isArray(b.vehicles) ? b.vehicles.reduce((s,v)=>s+(v.quantity||0),0) : 1;
                const catId = Array.isArray(b.vehicles) && b.vehicles.length ? String(b.vehicles[0].vehicleCategoryId) : "";
                setVehiclesNeeded(String(qty));
                setCategoryId(catId);
                setSystemPrice(Number(b.estimatedCost || 0));
                setDiscountAmount(String(b.discountAmount || 0));
                setFinalPrice(Number(b.totalCost || 0));
            } catch {}
        })();
    }, [orderId]);

    // Auto-calculate distance when both pickup and dropoff are entered
    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!pickup || !dropoff) {
                setDistanceError("");
                return;
            }

            // Only calculate if both fields have reasonable length and in edit mode
            if (pickup.trim().length < 5 || dropoff.trim().length < 5 || !canEdit) {
                return;
            }

            setCalculatingDistance(true);
            setDistanceError("");

            try {
                const result = await calculateDistance(pickup, dropoff);
                setDistanceKm(String(result.distance));
                pushToast(`Distance: ${result.formattedDistance} (~${result.formattedDuration})`, "success");
            } catch (error) {
                console.error("Distance calculation error:", error);
                setDistanceError("Unable to calculate distance automatically.");
                pushToast("Unable to calculate distance automatically", "error");
            } finally {
                setCalculatingDistance(false);
            }
        }, 1500); // Debounce 1.5 seconds

        return () => clearTimeout(timeoutId);
    }, [pickup, dropoff, canEdit]);

    /* --- tự tính finalPrice khi thay đổi discount/systemPrice --- */
    React.useEffect(() => {
        const disc = Number(
            String(discountAmount || "0").replace(
                /[^0-9]/g,
                ""
            )
        );
        const sysP = Number(systemPrice || 0);
        const fp = Math.max(0, sysP - disc);
        setFinalPrice(fp);
    }, [discountAmount, systemPrice]);

    /* --- check availability (real call) --- */
    const checkAvailability = async () => {
        try {
            if (!categoryId || !branchId) {
                setAvailabilityMsg("Thiếu loại xe hoặc chi nhánh");
                return;
            }
            const { checkVehicleAvailability } = await import("../../api/bookings");
            const result = await checkVehicleAvailability({
                branchId,
                categoryId,
                startTime: toIsoZ(startTime),
                endTime: toIsoZ(endTime),
                quantity: vehiclesNeeded,
            });
            if (result?.ok) {
                setAvailabilityMsg(`Khả dụng: Còn ${result.availableCount} xe`);
                pushToast(`Xe còn sẵn (${result.availableCount} chiếc)`, "success");
            } else {
                setAvailabilityMsg("Cảnh báo: Hết xe trong khung giờ này");
                pushToast("Hết xe khớp loại bạn chọn", "error");
            }
        } catch (e) {
            setAvailabilityMsg("Không kiểm tra được khả dụng xe");
            pushToast("Không kiểm tra được khả dụng xe", "error");
        }
    };

    /* --- recalc system price (mock) --- */
    const recalcPrice = async () => {
        try {
            const price = await calculatePrice({
                vehicleCategoryIds: [Number(categoryId || 0)],
                quantities: [Number(vehiclesNeeded || 1)],
                distance: Number(distanceKm || 0),
                useHighway: false,
            });
            const base = Number(price || 0);
            setSystemPrice(base);
            pushToast("Đã tính lại giá hệ thống: " + base.toLocaleString("vi-VN") + "đ", "info");
        } catch {
            pushToast("Không tính được giá tự động", "error");
        }
    };

    /* --- PUT status=DRAFT --- */
    const onSaveDraft = async () => {
        setSubmittingDraft(true);

        const cleanDiscount = Number(
            String(discountAmount || "0").replace(
                /[^0-9]/g,
                ""
            )
        );

        const payload = {
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
            pickup,
            dropoff,
            start_time: startTime,
            end_time: endTime,
            pax: Number(pax || 0),
            vehicles_needed: Number(
                vehiclesNeeded || 0
            ),
            category_id: categoryId,
            branch_id: branchId,
            system_price: Number(
                systemPrice || 0
            ),
            discount_amount: cleanDiscount,
            discount_reason: discountReason,
            quoted_price: Number(
                finalPrice || 0
            ),
            status: "DRAFT",
        };

        const req = {
            customer: { fullName: customerName, phone: customerPhone, email: customerEmail },
            branchId: Number(branchId || 0) || undefined,
            trips: [{ startLocation: pickup, endLocation: dropoff, startTime: toIsoZ(startTime), endTime: toIsoZ(endTime) }],
            vehicles: [{ vehicleCategoryId: Number(categoryId || 0), quantity: Number(vehiclesNeeded || 1) }],
            estimatedCost: Number(systemPrice || 0),
            discountAmount: cleanDiscount,
            totalCost: Number(finalPrice || 0),
            status: 'PENDING',
        };
        try {
            await updateBooking(orderId, req);
            setStatus('PENDING');
            pushToast('Đã lưu nháp đơn hàng.', 'success');
            // quay về danh sách và yêu cầu refresh
            navigate('/orders', { state: { refresh: true, toast: 'Đã lưu nháp đơn hàng.' } });
        } catch {
            pushToast('Lưu nháp thất bại', 'error');
        }

        setSubmittingDraft(false);
    };

    /* --- PUT status=PENDING --- */
    const onSubmitOrder = async () => {
        setSubmittingUpdate(true);

        const cleanDiscount = Number(
            String(discountAmount || "0").replace(
                /[^0-9]/g,
                ""
            )
        );

        const payload = {
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
            pickup,
            dropoff,
            start_time: startTime,
            end_time: endTime,
            pax: Number(pax || 0),
            vehicles_needed: Number(
                vehiclesNeeded || 0
            ),
            category_id: categoryId,
            branch_id: branchId,
            system_price: Number(
                systemPrice || 0
            ),
            discount_amount: cleanDiscount,
            discount_reason: discountReason,
            quoted_price: Number(
                finalPrice || 0
            ),
            status: "PENDING",
        };

        const req2 = {
            customer: { fullName: customerName, phone: customerPhone, email: customerEmail },
            branchId: Number(branchId || 0) || undefined,
            trips: [{ startLocation: pickup, endLocation: dropoff, startTime: toIsoZ(startTime), endTime: toIsoZ(endTime) }],
            vehicles: [{ vehicleCategoryId: Number(categoryId || 0), quantity: Number(vehiclesNeeded || 1) }],
            estimatedCost: Number(systemPrice || 0),
            discountAmount: cleanDiscount,
            totalCost: Number(finalPrice || 0),
            status: 'PENDING',
        };
        try {
            await updateBooking(orderId, req2);
            setStatus('PENDING');
            pushToast('Đã cập nhật đơn hàng & chuyển trạng thái PENDING.', 'success');
            // quay về danh sách và yêu cầu refresh
            navigate('/orders', { state: { refresh: true, toast: 'Đã cập nhật đơn hàng.' } });
        } catch {
            pushToast('Cập nhật đơn thất bại', 'error');
        }

        setSubmittingUpdate(false);
    };

    // Assign driver/vehicle to all trips
    const onAssign = async () => {
        try {
            await assignBooking(orderId, {
                driverId: driverId ? Number(driverId) : undefined,
                vehicleId: vehicleId ? Number(vehicleId) : undefined,
            });
            pushToast("Đã gán tài xế/xe cho đơn hàng", "success");
        } catch (e) {
            pushToast("Gán tài xế/xe thất bại", "error");
        }
    };

    /* ---------------- styles / shared ---------------- */
    const labelCls =
        "text-[12px] text-slate-600 mb-1 flex items-center gap-1";
    const inputEnabledCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500";
    const inputDisabledCls =
        "w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 placeholder:text-slate-400 outline-none cursor-not-allowed";
    const textareaEnabledCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500";
    const textareaDisabledCls =
        "w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 placeholder:text-slate-400 outline-none cursor-not-allowed";

    const selectEnabledCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500";
    const selectDisabledCls =
        "w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 outline-none cursor-not-allowed";

    const makeInputCls = (base) =>
        canEdit ? base.enabled : base.disabled;
    const disableInputProps = canEdit
        ? {}
        : { disabled: true, readOnly: true };

    /* ---------------- locked banner ---------------- */
    const lockedBanner = !canEdit ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] flex items-start gap-2 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="leading-relaxed">
                Đơn hàng ở trạng thái{" "}
                <span className="font-semibold">
                    {ORDER_STATUS_LABEL[status] ||
                        status}
                </span>
                . Thay đổi nội dung phải thông qua
                Điều phối viên.
            </div>
        </div>
    ) : null;

    /* ---------------- RENDER ---------------- */
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <Toasts toasts={toasts} />

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-wrap items-start gap-3">
                        <button
                            onClick={() => navigate("/orders")}
                            className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-2 text-[12px] text-slate-700 flex items-center gap-2 shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-500" />
                            <span>Danh sách đơn</span>
                        </button>

                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                            <span>
                                Chỉnh sửa đơn ORD-{orderId}
                            </span>
                        </div>

                        <StatusPill status={status} />
                    </div>

                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2 leading-relaxed">
                        Cập nhật thông tin báo giá / hành
                        trình trước khi chốt cho điều phối.
                    </div>

                    {lockedBanner}
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[250px]">
                    {/* Cập nhật đơn (PENDING) */}
                    <button
                        disabled={
                            !canEdit || submittingUpdate
                        }
                        onClick={onSubmitOrder}
                        className={cls(
                            "rounded-md font-medium text-[13px] px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                            canEdit
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Send className="h-4 w-4" />
                        {submittingUpdate
                            ? "Đang cập nhật..."
                            : "Cập nhật đơn (PENDING)"}
                    </button>

                    {/* Lưu nháp */}
                    <button
                        disabled={
                            !canEdit || submittingDraft
                        }
                        onClick={onSaveDraft}
                        className={cls(
                            "rounded-md border text-[13px] px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                            canEdit
                                ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4 text-slate-500" />
                        {submittingDraft
                            ? "Đang lưu..."
                            : "Lưu nháp"}
                    </button>
                </div>
            </div>

            {/* FORM GRID */}
            <div className="grid xl:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* --- Thông tin khách hàng --- */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <User className="h-4 w-4 text-sky-600" />
                            Thông tin khách hàng
                        </div>

                        {/* Phone */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span>Số điện thoại</span>
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={customerPhone}
                                onChange={(e) =>
                                    setCustomerPhone(
                                        e.target.value
                                    )
                                }
                                placeholder="VD: 0901234567"
                                {...disableInputProps}
                            />
                            <div className="text-[11px] text-slate-400 mt-1">
                                Nhập SĐT để auto-fill khách
                                cũ (gọi backend sau này).
                            </div>
                        </div>

                        {/* Name */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span>
                                    Tên khách hàng / Công
                                    ty
                                </span>
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={customerName}
                                onChange={(e) =>
                                    setCustomerName(
                                        e.target.value
                                    )
                                }
                                placeholder="Công ty ABC"
                                {...disableInputProps}
                            />
                        </div>

                        {/* Email */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                <span>Email</span>
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={customerEmail}
                                onChange={(e) =>
                                    setCustomerEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="booking@abc.com"
                                {...disableInputProps}
                            />
                        </div>
                    </div>

                    {/* --- Báo giá --- */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            Báo giá
                        </div>

                        {/* Giá hệ thống */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Giá hệ thống (tự tính)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 tabular-nums font-medium cursor-not-allowed"
                                    value={fmtMoney(
                                        systemPrice
                                    )}
                                    disabled
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className={cls(
                                        "rounded-md text-[12px] px-3 py-2 border shadow-sm",
                                        canEdit
                                            ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                            : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}
                                    disabled={!canEdit}
                                    onClick={recalcPrice}
                                >
                                    Tính lại
                                </button>
                            </div>
                        </div>

                        {/* Giảm giá */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Giảm giá (VND)
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: cls(
                                        inputEnabledCls,
                                        "tabular-nums"
                                    ),
                                    disabled: cls(
                                        inputDisabledCls,
                                        "tabular-nums"
                                    ),
                                })}
                                value={discountAmount}
                                onChange={(e) =>
                                    setDiscountAmount(
                                        e.target.value.replace(
                                            /[^0-9]/g,
                                            ""
                                        )
                                    )
                                }
                                placeholder="100000"
                                {...disableInputProps}
                            />
                            <div className="text-[11px] text-slate-400 mt-1">
                                Ví dụ: khách thân / hợp
                                đồng tháng...
                            </div>
                        </div>

                        {/* Lý do giảm giá */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Lý do giảm giá
                            </label>
                            <textarea
                                rows={2}
                                className={makeInputCls({
                                    enabled: textareaEnabledCls,
                                    disabled: textareaDisabledCls,
                                })}
                                value={discountReason}
                                onChange={(e) =>
                                    setDiscountReason(
                                        e.target.value
                                    )
                                }
                                placeholder="Khách ký hợp đồng 3 tháng, chiết khấu 100k/chuyến."
                                {...disableInputProps}
                            />
                        </div>

                        {/* Giá báo khách */}
                        <div className="mb-1">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Giá báo khách (VND)
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: cls(
                                        inputEnabledCls,
                                        "tabular-nums font-semibold"
                                    ),
                                    disabled: cls(
                                        inputDisabledCls,
                                        "tabular-nums font-semibold"
                                    ),
                                })}
                                value={finalPrice}
                                onChange={(e) => {
                                    if (!canEdit)
                                        return;
                                    const clean =
                                        e.target.value.replace(
                                            /[^0-9]/g,
                                            ""
                                        );
                                    setFinalPrice(
                                        Number(
                                            clean ||
                                            0
                                        )
                                    );
                                }}
                                placeholder="1400000"
                                {...disableInputProps}
                            />
                        </div>

                        <div className="text-[11px] text-slate-400">
                            Đây là giá cuối cùng gửi cho
                            khách.
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* --- Hành trình & xe --- */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <CarFront className="h-4 w-4 text-emerald-600" />
                            Hành trình & loại xe
                        </div>

                        {/* Điểm đón */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Điểm đón</span>
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={pickup}
                                onChange={(e) =>
                                    setPickup(
                                        e.target.value
                                    )
                                }
                                placeholder="Sân bay Nội Bài - T1"
                                {...disableInputProps}
                            />
                        </div>

                        {/* Điểm đến */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                                <span>Điểm đến</span>
                            </label>
                            <input
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={dropoff}
                                onChange={(e) =>
                                    setDropoff(
                                        e.target.value
                                    )
                                }
                                placeholder="Khách sạn Pearl Westlake, Tây Hồ"
                                {...disableInputProps}
                            />
                        </div>

                        {/* Thời gian đón */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>
                                    Thời gian đón
                                </span>
                            </label>
                            <input
                                type="datetime-local"
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={startTime}
                                onChange={(e) =>
                                    setStartTime(
                                        e.target.value
                                    )
                                }
                                {...disableInputProps}
                            />
                        </div>

                        {/* Kết thúc dự kiến */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>
                                    Thời gian kết
                                    thúc (dự kiến)
                                </span>
                            </label>
                            <input
                                type="datetime-local"
                                className={makeInputCls({
                                    enabled: inputEnabledCls,
                                    disabled: inputDisabledCls,
                                })}
                                value={endTime}
                                onChange={(e) =>
                                    setEndTime(
                                        e.target.value
                                    )
                                }
                                {...disableInputProps}
                            />
                        </div>

                        {/* Số khách / Số xe */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-[12px] text-slate-600 mb-1 block">
                                    Số khách (pax)
                                </label>
                                <input
                                    className={makeInputCls({
                                        enabled: inputEnabledCls,
                                        disabled: inputDisabledCls,
                                    })}
                                    value={pax}
                                    onChange={(e) =>
                                        setPax(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="3"
                                    {...disableInputProps}
                                />
                            </div>

                            <div>
                                <label className="text-[12px] text-slate-600 mb-1 block">
                                    Số lượng xe
                                </label>
                                <input
                                    className={makeInputCls({
                                        enabled: inputEnabledCls,
                                        disabled: inputDisabledCls,
                                    })}
                                    value={vehiclesNeeded}
                                    onChange={(e) =>
                                        setVehiclesNeeded(
                                            e.target.value.replace(
                                                /[^0-9]/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="1"
                                    {...disableInputProps}
                                />
                            </div>
                        </div>

                        {/* Loại xe yêu cầu */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Loại xe yêu cầu
                            </label>
                            <select
                                className={makeInputCls({
                                    enabled: selectEnabledCls,
                                    disabled: selectDisabledCls,
                                })}
                                value={categoryId}
                                onChange={(e) =>
                                    setCategoryId(
                                        e.target.value
                                    )
                                }
                                {...disableInputProps}
                            >
                                {categories.length > 0 ? (
                                    categories.map((c) => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.categoryName || c.label}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Không có danh mục (lỗi tải dữ liệu)</option>
                                )}
                            </select>
                        </div>

                        {/* Chi nhánh phụ trách */}
                        <div className="mb-4">
                            <label className="text-[12px] text-slate-600 mb-1 block">
                                Chi nhánh phụ trách
                            </label>
                            <select
                                className={makeInputCls({
                                    enabled: selectEnabledCls,
                                    disabled: selectDisabledCls,
                                })}
                                value={branchId}
                                onChange={(e) =>
                                    setBranchId(
                                        e.target.value
                                    )
                                }
                                {...disableInputProps}
                            >
                                {branches.length > 0 ? (
                                    branches.map((b) => (
                                        <option key={b.id} value={String(b.id)}>
                                            {b.branchName || b.label}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Không có chi nhánh (lỗi tải dữ liệu)</option>
                                )}
                            </select>
                        </div>

                        {/* Kiểm tra khả dụng xe */}
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <button
                                type="button"
                                className={cls(
                                    "rounded-md border text-[12px] px-3 py-2 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                                    canEdit
                                        ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                                disabled={!canEdit}
                                onClick={checkAvailability}
                            >
                                <CarFront className="h-4 w-4 text-emerald-600" />
                                <span>Kiểm tra xe</span>
                            </button>

                            {availabilityMsg ? (
                                <div className="text-[12px] text-slate-700">
                                    {availabilityMsg}
                                </div>
                            ) : (
                                <div className="text-[11px] text-slate-400 leading-relaxed">
                                    Hệ thống sẽ cảnh báo nếu
                                    hết xe khả dụng.
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Gán tài xế / xe */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <CarFront className="h-4 w-4 text-sky-600" />
                            Gán tài xế / phân xe
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-[13px]">
                            <div>
                                <label className="text-[12px] text-slate-600 mb-1 block">Driver ID</label>
                                <input className={selectEnabledCls} placeholder="Nhập driverId" value={driverId} onChange={(e)=>setDriverId(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[12px] text-slate-600 mb-1 block">Vehicle ID</label>
                                <input className={selectEnabledCls} placeholder="Nhập vehicleId" value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)} />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <button type="button" onClick={onAssign} className="rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium text-[13px] px-4 py-2 shadow-sm">
                                Gán tài xế / xe
                            </button>
                            <div className="text-[11px] text-slate-500">Áp dụng cho toàn bộ chuyến của đơn.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTNOTE */}
            <div className="text-[11px] text-slate-500 mt-8 leading-relaxed">
                <div className="text-slate-700 font-mono text-[11px]">
                    PUT /api/orders/{MOCK_ORDER.id}
                </div>
                <div>
                    Trạng thái hiện tại:{" "}
                    <span className="text-slate-900 font-semibold">
                        {ORDER_STATUS_LABEL[status] ||
                            status}
                    </span>
                </div>
                <div className="text-[12px] text-slate-600">
                    Nếu trạng thái là{" "}
                    <span className="text-amber-600 font-semibold">
                        ASSIGNED
                    </span>{" "}
                    hoặc{" "}
                    <span className="text-emerald-600 font-semibold">
                        COMPLETED
                    </span>
                    , chỉnh sửa phải thông qua điều
                    phối viên.
                </div>
            </div>
        </div>
    );
}