// EditOrderPage.jsx (LIGHT THEME)
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBooking, updateBooking, calculatePrice, assignBooking } from "../../api/bookings";
import { calculateDistance } from "../../api/graphhopper";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { listBranches } from "../../api/branches";
import { listDriversByBranch } from "../../api/drivers";
import { listVehicles } from "../../api/vehicles";
import { listHireTypes } from "../../api/hireTypes";
import { getSystemSettingByKey } from "../../api/systemSettings";
import { getCurrentRole, ROLES } from "../../utils/session";
import PlaceAutocomplete from "../common/PlaceAutocomplete";
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    CarFront,
    DollarSign,
    AlertTriangle,
    Save,
    Loader2,
    Users,
    FileText,
    Search,
    ChevronDown,
    X,
    Plus,
} from "lucide-react";

/**
 * EditOrderPage
 *
 * Rule (theo yêu cầu mới):
 *  - Cho phép sửa với mọi trạng thái, TRỪ COMPLETED và CANCELLED.
 *  - Các ràng buộc bận tài xế/xe, conflict lịch... backend sẽ xử lý.
 */

/* ---------------- helpers ---------------- */
const cls = (...a) => a.filter(Boolean).join(" ");
const fmtMoney = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0))) + " đ";

function parseLocalInputDate(value, isDateOnly) {
    if (!value) return null;
    if (isDateOnly) {
        const parts = String(value).split("-");
        if (parts.length !== 3) return null;
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDurationFromMinutes(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes || 0));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
}

/* ---------------- trạng thái đơn ---------------- */
const ORDER_STATUS_LABEL = {
    DRAFT: "Nháp",
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã xác nhận",
    QUOTATION_SENT: "Đã gửi báo giá",
    ASSIGNED: "Đã phân xe/tài xế",
    ONGOING: "Đang chạy",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
    INPROGRESS: "Đang thực hiện",
};

const ORDER_STATUS_STYLE_LIGHT = {
    DRAFT: "ring-1 ring-slate-300 bg-slate-100 text-slate-700",
    PENDING: "ring-1 ring-sky-200 bg-sky-50 text-sky-700",
    CONFIRMED: "ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700",
    QUOTATION_SENT: "ring-1 ring-indigo-200 bg-indigo-50 text-indigo-700",
    ASSIGNED: "ring-1 ring-sky-200 bg-sky-50 text-sky-700",
    ONGOING: "ring-1 ring-amber-200 bg-amber-50 text-amber-800",
    INPROGRESS: "ring-1 ring-amber-200 bg-amber-50 text-amber-800",
    COMPLETED: "ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "ring-1 ring-rose-200 bg-rose-50 text-rose-700",
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
      <span>{ORDER_STATUS_LABEL[status] || status}</span>
    </span>
    );
}

/* ---------------- Toast mini (light style) ---------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const pushToast = React.useCallback((msg, kind = "info", ttl = 2600) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), ttl);
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
                        "rounded-md px-3 py-2 shadow-sm border bg-white text-slate-700",
                        t.kind === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                        t.kind === "error" && "border-rose-200 bg-rose-50 text-rose-700",
                        t.kind === "info" && "border-slate-200 bg-white text-slate-700"
                    )}
                >
                    {t.msg}
                </div>
            ))}
        </div>
    );
}

/* ========================= MAIN PAGE ========================= */
export default function EditOrderPage() {
    const { toasts, pushToast } = useToasts();
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const seedOrder = location?.state?.order;

    const role = React.useMemo(() => getCurrentRole(), []);
    const isConsultant = role === ROLES.CONSULTANT;

    /* --- trạng thái đơn hàng --- */
    const [status, setStatus] = React.useState("PENDING");

    /* --- thông tin đặt cọc --- */
    const [paidAmount, setPaidAmount] = React.useState(0);

    /* --- chi nhánh --- */
    const [branchId, setBranchId] = React.useState("");

    /* --- khách hàng --- */
    const [customerPhone, setCustomerPhone] = React.useState("");
    const [customerName, setCustomerName] = React.useState("");
    const [customerEmail, setCustomerEmail] = React.useState("");

    /* --- hình thức thuê --- */
    const [hireType, setHireType] = React.useState("ONE_WAY"); // ONE_WAY | ROUND_TRIP | DAILY | MULTI_DAY | FIXED_ROUTE...
    const [hireTypeId, setHireTypeId] = React.useState("");
    const [hireTypeName, setHireTypeName] = React.useState("");
    const [hireTypesList, setHireTypesList] = React.useState([]);

    /* --- hành trình --- */
    const [pickup, setPickup] = React.useState("");
    const [dropoff, setDropoff] = React.useState("");
    const [startTime, setStartTime] = React.useState("");
    const [endTime, setEndTime] = React.useState("");
    const [distanceKm, setDistanceKm] = React.useState("");
    const [calculatingDistance, setCalculatingDistance] = React.useState(false);
    const [distanceError, setDistanceError] = React.useState("");
    const [avgVehicleSpeedKmph, setAvgVehicleSpeedKmph] = React.useState(60);

    /* --- thông số xe --- */
    const [pax, setPax] = React.useState("1");
    // Multiple vehicle selections: [{ categoryId, quantity }]
    const [vehicleSelections, setVehicleSelections] = React.useState([{ categoryId: "", quantity: 1 }]);
    const [categories, setCategories] = React.useState([]);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [branches, setBranches] = React.useState([]);

    /* --- availability --- */
    const [availabilityMsg, setAvailabilityMsg] = React.useState("");
    const [checkingAvailability, setCheckingAvailability] = React.useState(false);

    /* --- ghi chú --- */
    const [bookingNote, setBookingNote] = React.useState("");

    /* --- giá --- */
    const [systemPrice, setSystemPrice] = React.useState(0);
    const [discountAmount, setDiscountAmount] = React.useState("0");
    const [discountReason, setDiscountReason] = React.useState("");
    const [finalPrice, setFinalPrice] = React.useState(0);

    // assignment
    const [driverId, setDriverId] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");
    const [tripIds, setTripIds] = React.useState([]);
    const [driversList, setDriversList] = React.useState([]);
    const [vehiclesList, setVehiclesList] = React.useState([]);
    const [loadingDrivers, setLoadingDrivers] = React.useState(false);
    const [loadingVehicles, setLoadingVehicles] = React.useState(false);
    const [driverSearch, setDriverSearch] = React.useState("");
    const [vehicleSearch, setVehicleSearch] = React.useState("");
    const [showDriverDropdown, setShowDriverDropdown] = React.useState(false);
    const [showVehicleDropdown, setShowVehicleDropdown] = React.useState(false);

    // Assigned driver/vehicle info and cooldown
    const [assignedDriver, setAssignedDriver] = React.useState(null);
    const [assignedVehicle, setAssignedVehicle] = React.useState(null);
    const [assignedDriverId, setAssignedDriverId] = React.useState(null);
    const [assignedVehicleId, setAssignedVehicleId] = React.useState(null);
    const [lastAssignmentTime, setLastAssignmentTime] = React.useState(null);
    const [cooldownRemaining, setCooldownRemaining] = React.useState(0);

    /* --- submit state --- */
    const [submittingDraft, setSubmittingDraft] = React.useState(false);
    const [submittingUpdate, setSubmittingUpdate] = React.useState(false);
    const [assigning, setAssigning] = React.useState(false);

    /* ---------------- permission ---------------- */
    // Cho phép sửa với mọi trạng thái TRỪ COMPLETED/CANCELLED
    const canEdit = React.useMemo(() => !(status === "CANCELLED" || status === "COMPLETED"), [status]);

    // Với role Tư vấn viên: cho phép chỉnh "Ghi chú cho tài xế" miễn là chuyến CHƯA bắt đầu
    const canEditDriverNote = React.useMemo(() => {
        if (!isConsultant) return canEdit;
        if (!startTime) return true;
        const tripStart = new Date(startTime);
        const now = new Date();
        return tripStart.getTime() > now.getTime();
    }, [isConsultant, canEdit, startTime]);

    /* ---------------- styles ---------------- */
    const labelCls = "text-[12px] text-slate-600 mb-1 flex items-center gap-1";
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

    const makeInputCls = (base) => (canEdit ? base.enabled : base.disabled);
    const disableInputProps = canEdit ? {} : { disabled: true, readOnly: true };

    /* ---------------- helpers (time) ---------------- */
    const toIsoZ = React.useCallback((s) => {
        if (!s) return null;

        // date-only: YYYY-MM-DD -> local midnight
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
            const [y, m, d] = String(s).split("-").map(Number);
            const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
            return dt.toISOString();
        }

        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        return d.toISOString();
    }, []);

    const computeEndTimeIfMissing = React.useCallback(() => {
        // ONE_WAY: endTime optional -> default start + 2h
        if (hireType === "ONE_WAY" || hireType === "FIXED_ROUTE") {
            if (endTime) return endTime;
            if (!startTime) return "";
            const d = new Date(startTime);
            if (Number.isNaN(d.getTime())) return "";
            const plus2h = new Date(d.getTime() + 2 * 60 * 60 * 1000);
            // datetime-local format
            const localStr =
                plus2h.getFullYear() +
                "-" +
                String(plus2h.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(plus2h.getDate()).padStart(2, "0") +
                "T" +
                String(plus2h.getHours()).padStart(2, "0") +
                ":" +
                String(plus2h.getMinutes()).padStart(2, "0");
            return localStr;
        }
        return endTime || "";
    }, [hireType, startTime, endTime]);

    /* ---------------- detect weekend/holiday ---------------- */
    const isWeekend = React.useMemo(() => {
        if (!startTime) return false;
        const date = new Date(startTime);
        const day = date.getDay();
        return day === 0 || day === 6;
    }, [startTime]);

    const isHoliday = React.useMemo(() => {
        if (!startTime) return false;
        const date = new Date(startTime);
        const month = date.getMonth();
        const day = date.getDate();
        const holidays = [
            { month: 0, day: 1 }, // 1/1
            { month: 3, day: 30 }, // 30/4
            { month: 4, day: 1 }, // 1/5
            { month: 8, day: 2 }, // 2/9
        ];
        return holidays.some((h) => h.month === month && h.day === day);
    }, [startTime]);

    /* ---------------- ETA info ---------------- */
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const setting = await getSystemSettingByKey("AVG_VEHICLE_SPEED_KMPH");
                if (cancelled) return;
                const raw = setting?.settingValue;
                const parsed = raw != null ? Number(raw) : NaN;
                if (!Number.isNaN(parsed) && parsed > 0) setAvgVehicleSpeedKmph(Math.round(parsed));
            } catch (err) {
                console.warn("[EditOrderPage] Cannot load AVG_VEHICLE_SPEED_KMPH, using default 60", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const etaInfo = React.useMemo(() => {
        const dist = Number(distanceKm);
        if (!dist || Number.isNaN(dist) || dist <= 0) return null;
        if (!startTime) return null;

        const isDateOnly = hireType === "DAILY" || hireType === "MULTI_DAY";
        const startDate = parseLocalInputDate(startTime, isDateOnly);
        if (!startDate) return null;

        const speed = Math.max(1, Number(avgVehicleSpeedKmph || 60));
        const travelMinutes = Math.max(0, Math.ceil((dist / speed) * 60));
        const bufferMinutes = 10;
        const travelText = formatDurationFromMinutes(travelMinutes);

        const addMinutes = (d, mins) => new Date(d.getTime() + mins * 60 * 1000);
        const fmt = (d) =>
            d.toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

        if (hireType === "ONE_WAY" || hireType === "FIXED_ROUTE") {
            const busyUntil = addMinutes(startDate, travelMinutes + bufferMinutes);
            return { mode: "ONE_WAY", speed, travelText, bufferMinutes, busyUntilText: fmt(busyUntil) };
        }

        if (hireType === "ROUND_TRIP") {
            const returnStart = endTime ? parseLocalInputDate(endTime, false) : null;
            const goArrive = addMinutes(startDate, travelMinutes);
            const busyUntil = returnStart
                ? addMinutes(returnStart, travelMinutes + bufferMinutes)
                : addMinutes(startDate, travelMinutes * 2 + bufferMinutes);
            return {
                mode: "ROUND_TRIP",
                speed,
                travelText,
                bufferMinutes,
                goArriveText: fmt(goArrive),
                busyUntilText: fmt(busyUntil),
            };
        }

        // DAILY / MULTI_DAY
        const endDate = endTime ? parseLocalInputDate(endTime, true) : startDate;
        const endDay = endDate || startDate;
        const nextDay = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1, 0, 0, 0, 0);
        const busyUntil = addMinutes(nextDay, bufferMinutes);
        return { mode: "BY_DAY", speed, travelText, bufferMinutes, busyUntilText: fmt(busyUntil) };
    }, [distanceKm, startTime, endTime, hireType, avgVehicleSpeedKmph]);

    /* ---------------- vehicle selection helpers ---------------- */
    const addVehicleSelection = React.useCallback(() => {
        if (vehicleSelections.length >= 5) {
            pushToast("Tối đa 5 loại xe", "error");
            return;
        }
        const unused = categories.find((c) => !vehicleSelections.some((v) => v.categoryId === String(c.id)));
        setVehicleSelections((prev) => [...prev, { categoryId: unused ? String(unused.id) : "", quantity: 1 }]);
    }, [vehicleSelections, categories, pushToast]);

    const removeVehicleSelection = React.useCallback(
        (index) => {
            if (vehicleSelections.length <= 1) {
                pushToast("Cần ít nhất 1 loại xe", "error");
                return;
            }
            setVehicleSelections((prev) => prev.filter((_, i) => i !== index));
        },
        [vehicleSelections.length, pushToast]
    );

    const updateVehicleSelection = React.useCallback(
        (index, field, value) => {
            const updated = [...vehicleSelections];

            if (field === "categoryId") {
                const isDuplicate = vehicleSelections.some((v, i) => i !== index && v.categoryId === value && value !== "");
                if (isDuplicate) {
                    pushToast("Loại xe này đã được chọn. Vui lòng chọn loại xe khác hoặc tăng số lượng.", "error");
                    return;
                }
            }

            updated[index] = {
                ...updated[index],
                [field]: field === "quantity" ? Math.max(1, Number(value) || 1) : value,
            };
            setVehicleSelections(updated);
        },
        [vehicleSelections, pushToast]
    );

    /* ---------------- seed from navigation state ---------------- */
    React.useEffect(() => {
        if (!seedOrder) return;
        setCustomerName(seedOrder.customer_name || "");
        setCustomerPhone(seedOrder.customer_phone || "");
        setPickup(seedOrder.pickup || "");
        setDropoff(seedOrder.dropoff || "");

        if (seedOrder.pickup_time) {
            const d = new Date(String(seedOrder.pickup_time).replace(" ", "T"));
            if (!Number.isNaN(d.getTime())) setStartTime(d.toISOString().slice(0, 16));
        }
        if (seedOrder.dropoff_eta) {
            const d2 = new Date(String(seedOrder.dropoff_eta).replace(" ", "T"));
            if (!Number.isNaN(d2.getTime())) setEndTime(d2.toISOString().slice(0, 16));
        }
        if (seedOrder.quoted_price != null) setFinalPrice(Number(seedOrder.quoted_price));
    }, [seedOrder]);

    /* ---------------- load categories + branches + booking ---------------- */
    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            // categories
            try {
                const cats = await listVehicleCategories();
                if (cancelled) return;
                const list = Array.isArray(cats) ? cats : cats?.items || cats?.data || [];
                const mapped = list.map((c) => ({
                    id: String(c.id ?? c.vehicleCategoryId ?? ""),
                    categoryName: c.categoryName || c.name || c.label || "",
                    seats: Number(c.seats ?? c.capacity ?? 0) || 0,
                }));
                setCategories(mapped);
                if (mapped.length === 0) pushToast("Không thể tải danh mục xe: Dữ liệu trống", "error");
            } catch (err) {
                console.error("Failed to load categories:", err);
                if (!cancelled) pushToast("Không thể tải danh mục xe: " + (err.message || "Lỗi không xác định"), "error");
            }

            // branches
            try {
                const br = await listBranches({ page: 0 });
                if (cancelled) return;
                const items = Array.isArray(br?.items) ? br.items : Array.isArray(br) ? br : br?.data || [];
                const activeItems = items.filter((b) => !b.status || b.status === "ACTIVE");
                const mapped = activeItems.map((b) => ({
                    id: String(b.id ?? b.branchId ?? ""),
                    branchName: b.branchName || b.name || b.label || "",
                    status: b.status,
                }));
                setBranches(mapped);
                if (mapped.length === 0) pushToast("Không thể tải chi nhánh: Không có chi nhánh hoạt động", "error");
            } catch (err) {
                console.error("Failed to load branches:", err);
                if (!cancelled) pushToast("Không thể tải chi nhánh: " + (err.message || "Lỗi không xác định"), "error");
            }

            // booking
            try {
                if (!orderId) return;
                const b = await getBooking(orderId);
                if (cancelled || !b) return;

                const t = (Array.isArray(b.trips) && b.trips[0]) || {};

                setStatus(b.status || "PENDING");
                setBranchId(String(b.branchId ?? b.branch?.id ?? b.branch?.branchId ?? ""));

                // paid/deposit
                setPaidAmount(Number(b.paidAmount ?? b.totalPaid ?? b.depositPaid ?? 0) || 0);

                // customer
                setCustomerPhone(b.customer?.phone || b.customerPhone || "");
                setCustomerName(b.customer?.fullName || b.customerName || "");
                setCustomerEmail(b.customer?.email || b.customerEmail || "");

                // hire type
                if (b.hireTypeId != null) setHireTypeId(String(b.hireTypeId));
                if (b.hireTypeName) setHireTypeName(b.hireTypeName);

                // locations
                setPickup(t.startLocation || b.pickup || "");
                setDropoff(t.endLocation || b.dropoff || "");

                // time -> to local input format
                if (t.startTime) {
                    const d = new Date(t.startTime);
                    if (!Number.isNaN(d.getTime())) {
                        const localStr =
                            d.getFullYear() +
                            "-" +
                            String(d.getMonth() + 1).padStart(2, "0") +
                            "-" +
                            String(d.getDate()).padStart(2, "0") +
                            "T" +
                            String(d.getHours()).padStart(2, "0") +
                            ":" +
                            String(d.getMinutes()).padStart(2, "0");
                        setStartTime(localStr);
                    }
                }
                if (t.endTime) {
                    const d2 = new Date(t.endTime);
                    if (!Number.isNaN(d2.getTime())) {
                        const localStr2 =
                            d2.getFullYear() +
                            "-" +
                            String(d2.getMonth() + 1).padStart(2, "0") +
                            "-" +
                            String(d2.getDate()).padStart(2, "0") +
                            "T" +
                            String(d2.getHours()).padStart(2, "0") +
                            ":" +
                            String(d2.getMinutes()).padStart(2, "0");
                        setEndTime(localStr2);
                    }
                }

                setDistanceKm(String(t.distance ?? b.distance ?? ""));

                // pax
                const paxValue = t.paxCount ?? b.paxCount ?? 1;
                setPax(String(paxValue));

                // vehicles request
                if (Array.isArray(b.vehicles) && b.vehicles.length > 0) {
                    const vehicleItems = b.vehicles.map((v) => ({
                        categoryId: String(v.vehicleCategoryId ?? v.categoryId ?? ""),
                        quantity: Number(v.quantity || 1),
                    }));
                    setVehicleSelections(vehicleItems);
                } else {
                    setVehicleSelections([{ categoryId: "", quantity: 1 }]);
                }

                // prices
                setSystemPrice(Number(b.estimatedCost ?? b.systemPrice ?? 0) || 0);
                setDiscountAmount(String(b.discountAmount ?? 0));
                setFinalPrice(Number(b.totalCost ?? b.finalPrice ?? 0) || 0);

                // note
                setBookingNote(b.note || "");

                // trips for assignment
                if (Array.isArray(b.trips) && b.trips.length > 0) {
                    const ids = b.trips.map((x) => x.tripId ?? x.id).filter(Boolean);
                    setTripIds(ids);

                    const firstTrip = b.trips[0];
                    // assigned driver
                    const dId = firstTrip.driverId ?? firstTrip.driver?.driverId ?? firstTrip.driver?.id;
                    if (dId != null) {
                        setAssignedDriverId(dId);
                        if (firstTrip.driver?.driverName || firstTrip.driver?.fullName || firstTrip.driver?.name) {
                            setAssignedDriver({
                                id: dId,
                                name: firstTrip.driver.driverName || firstTrip.driver.fullName || firstTrip.driver.name,
                                phone: firstTrip.driver.phone || "",
                            });
                        }
                    }
                    // assigned vehicle
                    const vId = firstTrip.vehicleId ?? firstTrip.vehicle?.vehicleId ?? firstTrip.vehicle?.id;
                    if (vId != null) {
                        setAssignedVehicleId(vId);
                        if (firstTrip.vehicle?.licensePlate) {
                            setAssignedVehicle({
                                id: vId,
                                licensePlate: firstTrip.vehicle.licensePlate,
                                categoryName: firstTrip.vehicle.categoryName || "",
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to load booking", err);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [orderId, pushToast]);

    /* ---------------- hire types ---------------- */
    React.useEffect(() => {
        (async () => {
            try {
                const resp = await listHireTypes();
                const list = Array.isArray(resp) ? resp : resp?.data || resp?.items || [];
                setHireTypesList(list);
            } catch (err) {
                console.error("Failed to load hire types:", err);
            }
        })();
    }, []);

    // hireTypeId -> hireType code
    React.useEffect(() => {
        if (!hireTypeId || hireTypesList.length === 0) return;
        const found = hireTypesList.find((h) => String(h.id) === String(hireTypeId));
        if (found?.code && found.code !== hireType) setHireType(found.code);
        if (found?.name && !hireTypeName) setHireTypeName(found.name);
    }, [hireTypeId, hireTypesList, hireType, hireTypeName]);

    // hireType code -> hireTypeId
    React.useEffect(() => {
        if (!hireType || hireTypesList.length === 0) return;
        const found = hireTypesList.find((h) => h.code === hireType);
        if (found && String(found.id) !== String(hireTypeId)) setHireTypeId(String(found.id));
        if (found?.name && !hireTypeName) setHireTypeName(found.name);
    }, [hireType, hireTypesList, hireTypeId, hireTypeName]);

    // Với thuê theo ngày, chỉ dùng date (YYYY-MM-DD)
    React.useEffect(() => {
        const isDaily = hireType === "DAILY" || hireType === "MULTI_DAY";
        if (!isDaily) return;

        setStartTime((prev) => (prev && prev.includes("T") ? prev.split("T")[0] : prev));
        setEndTime((prev) => (prev && prev.includes("T") ? prev.split("T")[0] : prev));
    }, [hireType]);

    // Update selectedCategory theo loại xe đầu tiên
    React.useEffect(() => {
        if (vehicleSelections.length > 0 && vehicleSelections[0].categoryId && categories.length > 0) {
            const found = categories.find((c) => String(c.id) === String(vehicleSelections[0].categoryId));
            setSelectedCategory(found || null);
        } else {
            setSelectedCategory(null);
        }
    }, [vehicleSelections, categories]);

    /* ---------------- load drivers/vehicles when branch changes ---------------- */
    React.useEffect(() => {
        if (!branchId) return;

        // drivers
        (async () => {
            setLoadingDrivers(true);
            try {
                const drivers = await listDriversByBranch(branchId);
                const list = Array.isArray(drivers) ? drivers : drivers?.data || drivers?.items || [];
                setDriversList(
                    list.map((d) => ({
                        id: d.driverId ?? d.id,
                        name: d.driverName || d.fullName || d.name || `Driver #${d.driverId ?? d.id}`,
                        phone: d.phone || "",
                        status: d.status || "AVAILABLE",
                    }))
                );
            } catch (err) {
                console.error("Failed to load drivers:", err);
                setDriversList([]);
            } finally {
                setLoadingDrivers(false);
            }
        })();

        // vehicles
        (async () => {
            setLoadingVehicles(true);
            try {
                const vehicles = await listVehicles({ branchId });
                const list = Array.isArray(vehicles) ? vehicles : vehicles?.data || vehicles?.items || [];
                setVehiclesList(
                    list.map((v) => ({
                        id: v.vehicleId ?? v.id,
                        licensePlate: v.licensePlate || `#${v.vehicleId ?? v.id}`,
                        categoryName: v.categoryName || "",
                        status: v.status || "AVAILABLE",
                    }))
                );
            } catch (err) {
                console.error("Failed to load vehicles:", err);
                setVehiclesList([]);
            } finally {
                setLoadingVehicles(false);
            }
        })();
    }, [branchId]);

    // fill assigned driver/vehicle when lists are loaded
    React.useEffect(() => {
        if (assignedDriverId && driversList.length > 0 && !assignedDriver) {
            const found = driversList.find((d) => String(d.id) === String(assignedDriverId));
            if (found) setAssignedDriver({ id: found.id, name: found.name, phone: found.phone || "" });
        }
    }, [assignedDriverId, driversList, assignedDriver]);

    React.useEffect(() => {
        if (assignedVehicleId && vehiclesList.length > 0 && !assignedVehicle) {
            const found = vehiclesList.find((v) => String(v.id) === String(assignedVehicleId));
            if (found) setAssignedVehicle({ id: found.id, licensePlate: found.licensePlate, categoryName: found.categoryName || "" });
        }
    }, [assignedVehicleId, vehiclesList, assignedVehicle]);

    /* ---------------- dropdown helpers ---------------- */
    const filteredDrivers = React.useMemo(() => {
        if (!driverSearch) return driversList;
        const s = driverSearch.toLowerCase();
        return driversList.filter((d) => d.name.toLowerCase().includes(s) || (d.phone || "").toLowerCase().includes(s));
    }, [driversList, driverSearch]);

    const filteredVehicles = React.useMemo(() => {
        if (!vehicleSearch) return vehiclesList;
        const s = vehicleSearch.toLowerCase();
        return vehiclesList.filter(
            (v) => v.licensePlate.toLowerCase().includes(s) || (v.categoryName || "").toLowerCase().includes(s)
        );
    }, [vehiclesList, vehicleSearch]);

    const selectedDriver = React.useMemo(
        () => driversList.find((d) => String(d.id) === String(driverId)),
        [driversList, driverId]
    );
    const selectedVehicle = React.useMemo(
        () => vehiclesList.find((v) => String(v.id) === String(vehicleId)),
        [vehiclesList, vehicleId]
    );

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".driver-dropdown-container")) setShowDriverDropdown(false);
            if (!e.target.closest(".vehicle-dropdown-container")) setShowVehicleDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* ---------------- cooldown timer ---------------- */
    React.useEffect(() => {
        if (!lastAssignmentTime) {
            setCooldownRemaining(0);
            return;
        }
        const COOLDOWN_MS = 5 * 60 * 1000;
        const tick = () => {
            const elapsed = Date.now() - lastAssignmentTime;
            setCooldownRemaining(Math.max(0, COOLDOWN_MS - elapsed));
        };
        tick();
        const itv = setInterval(tick, 1000);
        return () => clearInterval(itv);
    }, [lastAssignmentTime]);

    /* ---------------- auto-calc distance ---------------- */
    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!pickup || !dropoff) {
                setDistanceError("");
                return;
            }
            if (pickup.trim().length < 5 || dropoff.trim().length < 5 || !canEdit) return;

            setCalculatingDistance(true);
            setDistanceError("");

            try {
                const result = await calculateDistance(pickup, dropoff);
                setDistanceKm(String(result.distance));
                pushToast(`Khoảng cách: ${result.formattedDistance} (~${result.formattedDuration})`, "success");
            } catch (error) {
                console.error("Distance calculation error:", error);
                setDistanceError("Không tính được khoảng cách tự động.");
                pushToast("Không tính được khoảng cách tự động", "error");
            } finally {
                setCalculatingDistance(false);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [pickup, dropoff, canEdit, pushToast]);

    /* ---------------- auto final price ---------------- */
    React.useEffect(() => {
        const disc = Number(String(discountAmount || "0").replace(/[^0-9]/g, ""));
        const sysP = Number(systemPrice || 0);
        setFinalPrice(Math.max(0, sysP - disc));
    }, [discountAmount, systemPrice]);

    /* ---------------- auto price calc ---------------- */
    React.useEffect(() => {
        if (!canEdit) return;

        const timeoutId = setTimeout(async () => {
            if (!startTime) return;

            const validSelections = vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0);
            if (validSelections.length === 0) return;

            const effectiveEndLocal = computeEndTimeIfMissing();
            if (hireType !== "ONE_WAY" && hireType !== "FIXED_ROUTE" && !effectiveEndLocal) return;

            try {
                const startISO = toIsoZ(startTime);
                const endISO = toIsoZ(effectiveEndLocal);

                const vehicleCategoryIds = validSelections.map((v) => Number(v.categoryId));
                const quantities = validSelections.map((v) => Number(v.quantity || 1));

                const price = await calculatePrice({
                    vehicleCategoryIds,
                    quantities,
                    distance: Number(distanceKm || 0),
                    useHighway: false,
                    hireTypeId: hireTypeId ? Number(hireTypeId) : undefined,
                    isHoliday,
                    isWeekend,
                    startTime: startISO,
                    endTime: endISO,
                });

                const base = Number(price || 0);
                if (base > 0) setSystemPrice(base);
            } catch (err) {
                console.error("Auto calculate price error:", err);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [
        canEdit,
        hireType,
        hireTypeId,
        isHoliday,
        isWeekend,
        startTime,
        endTime,
        distanceKm,
        vehicleSelections,
        toIsoZ,
        computeEndTimeIfMissing,
    ]);

    /* ---------------- availability check ---------------- */
    const checkAvailability = async () => {
        const validSelections = vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0);
        if (validSelections.length === 0 || !branchId) {
            setAvailabilityMsg("Thiếu loại xe hoặc chi nhánh");
            pushToast("Vui lòng chọn loại xe và chi nhánh trước", "error");
            return;
        }
        const effectiveEndLocal = computeEndTimeIfMissing();
        if (!startTime || !effectiveEndLocal) {
            setAvailabilityMsg("Thiếu thời gian đón/trả");
            pushToast("Vui lòng nhập thời gian đón và trả", "error");
            return;
        }

        setCheckingAvailability(true);
        setAvailabilityMsg("");

        try {
            const { checkVehicleAvailability } = await import("../../api/bookings");

            let allAvailable = true;
            const messages = [];

            for (const selection of validSelections) {
                const result = await checkVehicleAvailability({
                    branchId: Number(branchId),
                    categoryId: Number(selection.categoryId),
                    startTime: toIsoZ(startTime),
                    endTime: toIsoZ(effectiveEndLocal),
                    quantity: Number(selection.quantity || 1),
                });

                const category = categories.find((c) => String(c.id) === String(selection.categoryId));
                const categoryName = category?.categoryName || `Loại ${selection.categoryId}`;

                if (result?.ok || result?.available) {
                    const count = result.availableCount || result.count || 0;
                    messages.push(`${categoryName}: Còn ${count} xe`);
                } else {
                    allAvailable = false;
                    messages.push(`${categoryName}: Hết xe`);
                }
            }
            if (allAvailable) {
                setAvailabilityMsg(`✓ Khả dụng: ${messages.join(", ")}`);
                pushToast("Xe còn sẵn", "success");
            } else {
                setAvailabilityMsg(`⚠ Cảnh báo: ${messages.join(", ")}`);
                pushToast("Một số loại xe đã hết", "error");
            }
        } catch (e) {
            console.error("Check availability error:", e);
            setAvailabilityMsg("Không kiểm tra được - thử lại sau");
            pushToast("Không kiểm tra được khả dụng xe: " + (e.message || "Lỗi"), "error");
        } finally {
            setCheckingAvailability(false);
        }
    };

    /* ---------------- recalc price button ---------------- */
    const recalcPrice = async () => {
        if (!startTime) {
            pushToast("Vui lòng nhập thời gian đón trước", "error");
            return;
        }
        const validSelections = vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0);
        if (validSelections.length === 0) {
            pushToast("Vui lòng chọn ít nhất 1 loại xe trước", "error");
            return;
        }

        const effectiveEndLocal = computeEndTimeIfMissing();
        if (hireType !== "ONE_WAY" && hireType !== "FIXED_ROUTE" && !effectiveEndLocal) {
            pushToast("Vui lòng nhập thời gian kết thúc", "error");
            return;
        }

        try {
            const startISO = toIsoZ(startTime);
            const endISO = toIsoZ(effectiveEndLocal);

            const vehicleCategoryIds = validSelections.map((v) => Number(v.categoryId));
            const quantities = validSelections.map((v) => Number(v.quantity || 1));

            const price = await calculatePrice({
                vehicleCategoryIds,
                quantities,
                distance: Number(distanceKm || 0),
                useHighway: false,
                hireTypeId: hireTypeId ? Number(hireTypeId) : undefined,
                isHoliday,
                isWeekend,
                startTime: startISO,
                endTime: endISO,
            });

            const base = Number(price || 0);
            setSystemPrice(base);
            pushToast("Đã tính lại giá hệ thống: " + base.toLocaleString("vi-VN") + "đ", "info");
        } catch (err) {
            console.error("Calculate price error:", err);
            pushToast("Không tính được giá tự động: " + (err.message || "Lỗi"), "error");
        }
    };

    /* ---------------- build request (shared) ---------------- */
    const buildRequestPayload = React.useCallback(
        (forceStatus) => {
            const cleanDiscount = Number(String(discountAmount || "0").replace(/[^0-9]/g, ""));
            const effectiveEndLocal = computeEndTimeIfMissing();

            const paxNum = Number(pax || 0);

            return {
                customer: {
                    fullName: customerName?.trim(),
                    phone: customerPhone?.trim(),
                    email: customerEmail?.trim() || null,
                },
                branchId: Number(branchId || 0) || undefined,
                hireTypeId: hireTypeId ? Number(hireTypeId) : undefined,
                trips: [
                    {
                        startLocation: pickup?.trim(),
                        endLocation: dropoff?.trim(),
                        startTime: toIsoZ(startTime),
                        endTime: effectiveEndLocal ? toIsoZ(effectiveEndLocal) : undefined,
                        distance: distanceKm ? Number(distanceKm) : undefined,
                        paxCount: isConsultant ? undefined : paxNum,
                    },
                ],
                vehicles: vehicleSelections
                    .filter((v) => v.categoryId && Number(v.categoryId) > 0)
                    .map((v) => ({
                        vehicleCategoryId: Number(v.categoryId),
                        quantity: Number(v.quantity || 1),
                    })),
                estimatedCost: Number(systemPrice || 0),
                discountAmount: cleanDiscount,
                totalCost: Number(finalPrice || 0),
                note: bookingNote?.trim() || null,
                ...(forceStatus ? { status: forceStatus } : {}),
            };
        },
        [
            discountAmount,
            computeEndTimeIfMissing,
            pax,
            customerName,
            customerPhone,
            customerEmail,
            branchId,
            hireTypeId,
            pickup,
            dropoff,
            startTime,
            distanceKm,
            isConsultant,
            vehicleSelections,
            systemPrice,
            finalPrice,
            bookingNote,
            toIsoZ,
        ]
    );

    const validateCore = React.useCallback(() => {
        // customer
        if (!customerPhone || customerPhone.trim().length < 10) {
            pushToast("Số điện thoại không hợp lệ (cần ít nhất 10 số)", "error");
            return false;
        }
        if (!customerName || customerName.trim().length < 2) {
            pushToast("Vui lòng nhập tên khách hàng", "error");
            return false;
        }

        // locations
        if (!pickup || pickup.trim().length < 3) {
            pushToast("Vui lòng nhập điểm đón", "error");
            return false;
        }
        if (!dropoff || dropoff.trim().length < 3) {
            pushToast("Vui lòng nhập điểm đến", "error");
            return false;
        }

        // time
        if (!startTime) {
            pushToast("Vui lòng nhập thời gian đón", "error");
            return false;
        }

        const effectiveEndLocal = computeEndTimeIfMissing();
        if (hireType !== "ONE_WAY" && hireType !== "FIXED_ROUTE" && !effectiveEndLocal) {
            pushToast("Vui lòng nhập thời gian kết thúc", "error");
            return false;
        }

        const startDate = new Date(startTime);
        const endDate = effectiveEndLocal ? new Date(effectiveEndLocal) : null;
        const now = new Date();

        if (Number.isNaN(startDate.getTime())) {
            pushToast("Thời gian đón không hợp lệ", "error");
            return false;
        }
        if (startDate < now) {
            pushToast("Thời gian đón phải lớn hơn thời gian hiện tại", "error");
            return false;
        }

        if (endDate && !Number.isNaN(endDate.getTime()) && endDate <= startDate) {
            pushToast("Thời gian kết thúc phải sau thời gian đón", "error");
            return false;
        }

        // pax
        const paxNum = Number(pax || 0);
        if (!isConsultant) {
            if (paxNum < 1) {
                pushToast("Số khách phải >= 1", "error");
                return false;
            }
            if (selectedCategory?.seats && paxNum >= selectedCategory.seats) {
                pushToast(`Số khách phải < ${selectedCategory.seats} (số ghế xe)`, "error");
                return false;
            }
        }

        // vehicles
        const validSelections = vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0);
        if (validSelections.length === 0) {
            pushToast("Vui lòng chọn ít nhất 1 loại xe", "error");
            return false;
        }
        for (const selection of validSelections) {
            if (Number(selection.quantity || 0) < 1) {
                pushToast("Số lượng xe phải >= 1", "error");
                return false;
            }
        }

        return true;
    }, [customerPhone, customerName, pickup, dropoff, startTime, computeEndTimeIfMissing, hireType, pax, isConsultant, selectedCategory, vehicleSelections, pushToast]);

    /* ---------------- save/update ---------------- */
    const onSaveDraft = async () => {
        if (!canEdit) return;
        if (!validateCore()) return;

        setSubmittingDraft(true);
        try {
            const req = buildRequestPayload(); // không ép status
            await updateBooking(orderId, req);
            pushToast("Đã lưu thay đổi.", "success");
            navigate("/orders", { state: { refresh: true, toast: "Đã lưu thay đổi." } });
        } catch (err) {
            pushToast("Lưu thất bại: " + (err.response?.data?.message || err.message || "Lỗi không xác định"), "error");
        } finally {
            setSubmittingDraft(false);
        }
    };

    const onSubmitOrder = async () => {
        if (!canEdit) return;
        if (!validateCore()) return;

        setSubmittingUpdate(true);
        try {
            const req = buildRequestPayload("PENDING");
            await updateBooking(orderId, req);
            setStatus("PENDING");
            pushToast("Đã cập nhật đơn hàng.", "success");
            navigate("/orders", { state: { refresh: true, toast: "Đã cập nhật đơn hàng." } });
        } catch (err) {
            pushToast("Cập nhật đơn thất bại: " + (err.response?.data?.message || err.message || "Lỗi không xác định"), "error");
        } finally {
            setSubmittingUpdate(false);
        }
    };

    /* ---------------- assign driver/vehicle ---------------- */
    const onAssign = async () => {
        if (tripIds.length === 0) {
            pushToast("Không tìm thấy chuyến để gán. Vui lòng tải lại trang.", "error");
            return;
        }
        if (cooldownRemaining > 0) {
            const mins = Math.floor(cooldownRemaining / 60000);
            const secs = Math.floor((cooldownRemaining % 60000) / 1000);
            pushToast(`Vui lòng đợi ${mins}:${String(secs).padStart(2, "0")} để thay đổi tài xế/xe`, "error");
            return;
        }

        setAssigning(true);
        try {
            await assignBooking(orderId, {
                driverId: driverId ? Number(driverId) : undefined,
                vehicleId: vehicleId ? Number(vehicleId) : undefined,
                tripIds,
            });

            pushToast("Đã gán tài xế/xe cho đơn hàng", "success");

            if (driverId && selectedDriver) {
                setAssignedDriverId(driverId);
                setAssignedDriver({ ...selectedDriver });
            }
            if (vehicleId && selectedVehicle) {
                setAssignedVehicleId(vehicleId);
                setAssignedVehicle({ ...selectedVehicle });
            }

            setLastAssignmentTime(Date.now());
            setDriverId("");
            setVehicleId("");
        } catch (e) {
            console.error("Assign error:", e);
            const msg = e.response?.data?.message || e.message || "Lỗi không xác định";
            pushToast("Gán tài xế/xe thất bại: " + msg, "error");
        } finally {
            setAssigning(false);
        }
    };

    /* ---------------- locked banner + warning ---------------- */
    const lockedReason = React.useMemo(() => {
        if (status === "CANCELLED") return "Đơn hàng đã bị hủy. Không thể chỉnh sửa.";
        if (status === "COMPLETED") return "Đơn hàng đã hoàn thành. Không thể chỉnh sửa.";
        return null;
    }, [status]);

    const inProgressWarning = React.useMemo(() => {
        if (status === "INPROGRESS" || status === "ONGOING") {
            return (
                "Đơn hàng đang thực hiện. Bạn có thể cập nhật thông tin (ví dụ: kéo dài thời gian). " +
                "Hệ thống sẽ kiểm tra tài xế/xe đang phụ trách có đáp ứng được thay đổi hay không."
            );
        }
        if (status === "ASSIGNED") {
            return "Đơn hàng đã được phân tài xế/xe. Thay đổi thông tin sẽ được kiểm tra tính khả dụng của tài xế và xe.";
        }
        return null;
    }, [status]);

    const lockedBanner = !canEdit && lockedReason ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] flex items-start gap-2 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <div className="leading-relaxed">{lockedReason}</div>
        </div>
    ) : null;

    const inProgressBanner = canEdit && inProgressWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] flex items-start gap-2 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="leading-relaxed">{inProgressWarning}</div>
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
                            <DollarSign className="h-6 w-6 text-sky-600" />
                            <span>Chỉnh sửa đơn ORD-{orderId}</span>
                        </div>

                        <StatusPill status={status} />
                    </div>

                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-2 leading-relaxed">
                        Cập nhật thông tin báo giá / hành trình trước khi chốt cho điều phối.
                    </div>

                    {lockedBanner}
                    {inProgressBanner}
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[250px]">
                    <button
                        disabled={!canEdit || submittingDraft}
                        onClick={onSaveDraft}
                        className={cls(
                            "rounded-md font-medium text-[13px] px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                            canEdit ? "bg-sky-600 hover:bg-sky-500 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        {submittingDraft ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>

                    {/* (tuỳ bạn có muốn nút submit riêng) */}
                    {/* <button
            disabled={!canEdit || submittingUpdate}
            onClick={onSubmitOrder}
            className={cls(
              "rounded-md font-medium text-[13px] px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
              canEdit ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            {submittingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submittingUpdate ? "Đang cập nhật..." : "Cập nhật & gửi xử lý"}
          </button> */}
                </div>
            </div>

            {/* FORM GRID */}
            <div className="grid xl:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Thông tin khách hàng */}
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
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="VD: 0901234567"
                                {...disableInputProps}
                            />
                            <div className="text-[11px] text-slate-400 mt-1">Nhập SĐT để auto-fill khách cũ (gọi backend sau này).</div>
                        </div>

                        {/* Name */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span>Tên khách hàng / Công ty</span>
                            </label>
                            <input
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
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
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="booking@abc.com"
                                {...disableInputProps}
                            />
                        </div>
                    </div>

                    {/* Hình thức thuê */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <CarFront className="h-4 w-4 text-emerald-600" />
                            Hình thức thuê xe
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
                                    onClick={() => canEdit && !isConsultant && setHireType(opt.key)}
                                    className={cls(
                                        "px-3 py-2 rounded-md border text-[13px] flex items-center gap-2 shadow-sm",
                                        hireType === opt.key
                                            ? "ring-1 ring-emerald-200 bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700",
                                        (!canEdit || isConsultant) && "cursor-not-allowed opacity-60"
                                    )}
                                    disabled={!canEdit || isConsultant}
                                >
                                    <CarFront className="h-4 w-4" />
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {hireTypeName && (
                            <div className="mt-3 text-[12px] text-slate-500">
                                Từ hệ thống: <span className="font-medium text-slate-700">{hireTypeName}</span>
                            </div>
                        )}
                    </div>

                    {/* Báo giá */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <DollarSign className="h-4 w-4 text-sky-600" />
                            Báo giá
                        </div>

                        {/* Giá hệ thống */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">Giá hệ thống (tự tính)</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 tabular-nums font-medium cursor-not-allowed"
                                    value={fmtMoney(systemPrice)}
                                    disabled
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className={cls(
                                        "rounded-md text-[12px] px-3 py-2 border shadow-sm",
                                        canEdit ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700" : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
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
                            <label className="text-[12px] text-slate-600 mb-1 block">Giảm giá (VND)</label>
                            <input
                                className={makeInputCls({
                                    enabled: cls(inputEnabledCls, "tabular-nums"),
                                    disabled: cls(inputDisabledCls, "tabular-nums"),
                                })}
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(e.target.value.replace(/[^0-9]/g, ""))}
                                placeholder="100000"
                                {...disableInputProps}
                            />
                            <div className="text-[11px] text-slate-400 mt-1">Ví dụ: khách thân / hợp đồng tháng...</div>
                        </div>

                        {/* Lý do giảm giá */}
                        <div className="mb-3">
                            <label className="text-[12px] text-slate-600 mb-1 block">Lý do giảm giá</label>
                            <textarea
                                rows={2}
                                className={makeInputCls({ enabled: textareaEnabledCls, disabled: textareaDisabledCls })}
                                value={discountReason}
                                onChange={(e) => setDiscountReason(e.target.value)}
                                placeholder="Khách ký hợp đồng 3 tháng, chiết khấu 100k/chuyến."
                                {...disableInputProps}
                            />
                        </div>

                        {/* Giá báo khách */}
                        <div className="mb-1">
                            <label className="text-[12px] text-slate-600 mb-1 block">Giá báo khách (VND)</label>
                            <input
                                className={makeInputCls({
                                    enabled: cls(inputEnabledCls, "tabular-nums font-semibold"),
                                    disabled: cls(inputDisabledCls, "tabular-nums font-semibold"),
                                })}
                                value={finalPrice}
                                onChange={(e) => {
                                    if (!canEdit) return;
                                    const clean = e.target.value.replace(/[^0-9]/g, "");
                                    setFinalPrice(Number(clean || 0));
                                }}
                                placeholder="1400000"
                                {...disableInputProps}
                            />
                        </div>

                        <div className="text-[11px] text-slate-400">Đây là giá cuối cùng gửi cho khách.</div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Hành trình & xe */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <CarFront className="h-4 w-4 text-sky-600" />
                            Hành trình & loại xe
                        </div>

                        {/* Điểm đón */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Điểm đón *</span>
                            </label>
                            <PlaceAutocomplete
                                value={pickup}
                                onChange={setPickup}
                                placeholder="VD: Hồ Hoàn Kiếm, Sân bay Nội Bài..."
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                disabled={!canEdit}
                            />
                        </div>

                        {/* Điểm đến */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                                <span>Điểm đến *</span>
                            </label>
                            <PlaceAutocomplete
                                value={dropoff}
                                onChange={setDropoff}
                                placeholder="VD: Trung tâm Hà Nội, Phố cổ..."
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                disabled={!canEdit}
                            />
                        </div>

                        {/* Thời gian đón / Ngày bắt đầu */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span>{hireType === "DAILY" || hireType === "MULTI_DAY" ? "Ngày bắt đầu" : "Thời gian đón"}</span>
                            </label>
                            <input
                                type={hireType === "DAILY" || hireType === "MULTI_DAY" ? "date" : "datetime-local"}
                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                {...disableInputProps}
                            />
                        </div>

                        {/* Kết thúc dự kiến / Ngày kết thúc
                - Với ONE_WAY:
                  + Nếu là tư vấn viên (isConsultant) thì ẩn ô kết thúc.
                  + Role khác có thể nhập (tùy chọn).
            */}
                        {!(isConsultant && (hireType === "ONE_WAY" || hireType === "FIXED_ROUTE")) && (
                            <div className="mb-3">
                                <label className={labelCls}>
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                    {hireType === "DAILY" || hireType === "MULTI_DAY"
                        ? "Ngày kết thúc"
                        : hireType === "ONE_WAY" || hireType === "FIXED_ROUTE"
                            ? "Thời gian kết thúc (dự kiến) - Tùy chọn"
                            : "Thời gian kết thúc (dự kiến)"}
                  </span>
                                </label>
                                <input
                                    type={hireType === "DAILY" || hireType === "MULTI_DAY" ? "date" : "datetime-local"}
                                    className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    {...disableInputProps}
                                />
                                {(hireType === "ONE_WAY" || hireType === "FIXED_ROUTE") && (
                                    <div className="text-[11px] text-slate-400 mt-1">
                                        Với hình thức một chiều, thời gian kết thúc là tùy chọn. Hệ thống sẽ tự tính nếu không nhập.
                                    </div>
                                )}
                            </div>
                        )}
                        {/* ETA / Xe bận tới */}
                        {etaInfo && (
                            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-sky-600" />
                                        <div className="text-[13px] font-semibold text-slate-900">Ước lượng thời gian (tham khảo)</div>
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Vận tốc: {etaInfo.speed} km/h • Dự phòng: {etaInfo.bufferMinutes} phút
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                                        <div className="text-[11px] uppercase font-semibold text-slate-500">Thời lượng ước tính</div>
                                        <div className="text-[13px] font-semibold text-slate-900 tabular-nums">
                                            {etaInfo.mode === "BY_DAY" ? "Theo ngày" : etaInfo.travelText}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-white border border-slate-200 p-2">
                                        <div className="text-[11px] uppercase font-semibold text-slate-500">Xe rảnh dự kiến</div>
                                        <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{etaInfo.busyUntilText}</div>

                                        {etaInfo.mode === "ROUND_TRIP" && etaInfo.goArriveText && (
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Dự kiến đến lượt đi: <span className="font-medium">{etaInfo.goArriveText}</span>
                                            </div>
                                        )}
                                        {etaInfo.mode === "BY_DAY" && (
                                            <div className="text-[11px] text-slate-500 mt-0.5">Đặt theo ngày: xe chỉ nhận chuyến mới từ ngày kế tiếp.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Số khách */}
                        {!isConsultant && (
                            <div className="mb-3">
                                <label className={labelCls}>
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số khách</span>
                                    {selectedCategory && selectedCategory.seats > 0 && (
                                        <span className="text-[11px] text-slate-500 font-normal ml-1">(Tối đa: {selectedCategory.seats - 1})</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedCategory && selectedCategory.seats ? selectedCategory.seats - 1 : undefined}
                                    className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                    value={pax}
                                    onChange={(e) => setPax(e.target.value.replace(/[^0-9]/g, ""))}
                                    placeholder="1"
                                    {...disableInputProps}
                                />
                                {selectedCategory && selectedCategory.seats && Number(pax) >= selectedCategory.seats && (
                                    <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Số khách phải nhỏ hơn {selectedCategory.seats} (số ghế)
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Loại xe yêu cầu */}
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[12px] text-slate-600 font-medium">Loại xe yêu cầu</label>
                                {canEdit && vehicleSelections.length < 5 && (
                                    <button type="button" onClick={addVehicleSelection} className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1">
                                        <Plus className="h-3.5 w-3.5" />
                                        Thêm loại xe
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {vehicleSelections.map((selection, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <select
                                                className={makeInputCls({ enabled: selectEnabledCls, disabled: selectDisabledCls })}
                                                value={selection.categoryId}
                                                onChange={(e) => updateVehicleSelection(index, "categoryId", e.target.value)}
                                                {...disableInputProps}
                                            >
                                                <option value="">-- Chọn loại xe --</option>
                                                {categories
                                                    .filter(
                                                        (c) =>
                                                            !selection.categoryId ||
                                                            String(c.id) === String(selection.categoryId) ||
                                                            !vehicleSelections.some((v, i) => i !== index && String(v.categoryId) === String(c.id))
                                                    )
                                                    .map((c) => (
                                                        <option key={c.id} value={String(c.id)}>
                                                            {c.categoryName || c.label}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className="w-20">
                                            <input
                                                type="number"
                                                min="1"
                                                className={makeInputCls({ enabled: inputEnabledCls, disabled: inputDisabledCls })}
                                                value={selection.quantity}
                                                onChange={(e) => updateVehicleSelection(index, "quantity", e.target.value.replace(/[^0-9]/g, "") || "1")}
                                                placeholder="1"
                                                {...disableInputProps}
                                            />
                                        </div>

                                        {canEdit && vehicleSelections.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeVehicleSelection(index)}
                                                className={cls(
                                                    "rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-2 text-slate-700 flex items-center",
                                                    !canEdit && "opacity-50 cursor-not-allowed"
                                                )}
                                                disabled={!canEdit}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {vehicleSelections.length > 0 && (
                                <div className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
                                    <CarFront className="h-3.5 w-3.5" />
                                    <span>
                    Tổng: {vehicleSelections.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)} xe
                                        {vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0).length > 1 &&
                                            ` (${vehicleSelections.filter((v) => v.categoryId && Number(v.categoryId) > 0).length} loại)`}
                  </span>
                                </div>
                            )}
                        </div>

                        {/* Chi nhánh - Ẩn với Consultant */}
                        {!isConsultant && (
                            <div className="mb-4">
                                <label className="text-[12px] text-slate-600 mb-1 block">Chi nhánh phụ trách</label>
                                <select
                                    className={makeInputCls({ enabled: selectEnabledCls, disabled: selectDisabledCls })}
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    {...disableInputProps}
                                >
                                    <option value="">-- Chọn chi nhánh --</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={String(b.id)}>
                                            {b.branchName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Kiểm tra khả dụng xe */}
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <button
                                type="button"
                                className={cls(
                                    "rounded-md border text-[12px] px-3 py-2 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                                    canEdit && !checkingAvailability
                                        ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                                disabled={!canEdit || checkingAvailability}
                                onClick={checkAvailability}
                            >
                                {checkingAvailability ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" /> : <CarFront className="h-4 w-4 text-sky-600" />}
                                <span>{checkingAvailability ? "Đang kiểm tra..." : "Kiểm tra xe"}</span>
                            </button>

                            {availabilityMsg ? (
                                <div
                                    className={cls(
                                        "text-[12px]",
                                        availabilityMsg.includes("✓") ? "text-emerald-600" : availabilityMsg.includes("⚠") ? "text-amber-700" : "text-slate-700"
                                    )}
                                >
                                    {availabilityMsg}
                                </div>
                            ) : (
                                <div className="text-[11px] text-slate-400 leading-relaxed">Hệ thống sẽ cảnh báo nếu hết xe khả dụng.</div>
                            )}
                        </div>

                        {distanceError && <div className="mt-2 text-[11px] text-rose-600">{distanceError}</div>}
                        {calculatingDistance && <div className="mt-2 text-[11px] text-slate-500">Đang tính khoảng cách...</div>}
                    </div>

                    {/* Ghi chú cho tài xế */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <FileText className="h-4 w-4 text-sky-600" />
                            Ghi chú cho tài xế
                        </div>
                        <textarea
                            rows={3}
                            className={canEditDriverNote ? cls(textareaEnabledCls, "resize-none") : cls(textareaDisabledCls, "resize-none")}
                            value={bookingNote}
                            onChange={(e) => {
                                if (!canEditDriverNote) return;
                                setBookingNote(e.target.value);
                            }}
                            placeholder="VD: Đón thêm 1 khách ở 123 Trần Hưng Đạo lúc 8h30, hành lý cồng kềnh..."
                            {...(canEditDriverNote ? {} : { disabled: true, readOnly: true })}
                        />
                        <div className="text-[11px] text-slate-400 mt-2">Ghi chú này sẽ hiển thị cho tài xế trong chi tiết chuyến đi.</div>
                    </div>

                    {/* Gán tài xế / xe - Ẩn với Consultant */}
                    {!isConsultant && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                                <CarFront className="h-4 w-4 text-sky-600" />
                                Gán tài xế / phân xe
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 text-[13px]">
                                {/* Driver */}
                                <div className="relative driver-dropdown-container">
                                    <label className={labelCls}>
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Tài xế</span>
                                        {loadingDrivers && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                                    </label>

                                    <div className="relative">
                                        <div className={cls("flex items-center gap-2 cursor-pointer", inputEnabledCls)} onClick={() => setShowDriverDropdown(!showDriverDropdown)}>
                                            <Search className="h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent outline-none text-sm"
                                                placeholder={selectedDriver ? "" : "Tìm tài xế..."}
                                                value={showDriverDropdown ? driverSearch : selectedDriver?.name || ""}
                                                onChange={(e) => {
                                                    setDriverSearch(e.target.value);
                                                    setShowDriverDropdown(true);
                                                }}
                                                onFocus={() => setShowDriverDropdown(true)}
                                            />
                                            {selectedDriver && !showDriverDropdown && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDriverId("");
                                                        setDriverSearch("");
                                                    }}
                                                    className="p-0.5 hover:bg-slate-100 rounded"
                                                >
                                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                            )}
                                            <ChevronDown className={cls("h-4 w-4 text-slate-400 transition-transform", showDriverDropdown && "rotate-180")} />
                                        </div>

                                        {showDriverDropdown && (
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                {loadingDrivers ? (
                                                    <div className="p-3 text-center text-slate-500 text-sm">
                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                                                        Đang tải...
                                                    </div>
                                                ) : filteredDrivers.length === 0 ? (
                                                    <div className="p-3 text-center text-slate-500 text-sm">Không tìm thấy tài xế</div>
                                                ) : (
                                                    filteredDrivers.map((d) => (
                                                        <div
                                                            key={d.id}
                                                            className={cls(
                                                                "px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between",
                                                                String(d.id) === String(driverId) && "bg-sky-50"
                                                            )}
                                                            onClick={() => {
                                                                setDriverId(String(d.id));
                                                                setDriverSearch("");
                                                                setShowDriverDropdown(false);
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-slate-900">{d.name}</div>
                                                                {d.phone && <div className="text-[11px] text-slate-500">{d.phone}</div>}
                                                            </div>
                                                            <span
                                                                className={cls(
                                                                    "text-[10px] px-1.5 py-0.5 rounded",
                                                                    d.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                                                )}
                                                            >
                                {d.status === "AVAILABLE" ? "Sẵn sàng" : d.status}
                              </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedDriver && <div className="text-[11px] text-emerald-600 mt-1">✓ Đã chọn: {selectedDriver.name}</div>}
                                </div>

                                {/* Vehicle */}
                                <div className="relative vehicle-dropdown-container">
                                    <label className={labelCls}>
                                        <CarFront className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Xe</span>
                                        {loadingVehicles && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                                    </label>

                                    <div className="relative">
                                        <div className={cls("flex items-center gap-2 cursor-pointer", inputEnabledCls)} onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}>
                                            <Search className="h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent outline-none text-sm"
                                                placeholder={selectedVehicle ? "" : "Tìm xe (biển số)..."}
                                                value={showVehicleDropdown ? vehicleSearch : selectedVehicle?.licensePlate || ""}
                                                onChange={(e) => {
                                                    setVehicleSearch(e.target.value);
                                                    setShowVehicleDropdown(true);
                                                }}
                                                onFocus={() => setShowVehicleDropdown(true)}
                                            />
                                            {selectedVehicle && !showVehicleDropdown && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setVehicleId("");
                                                        setVehicleSearch("");
                                                    }}
                                                    className="p-0.5 hover:bg-slate-100 rounded"
                                                >
                                                    <X className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                            )}
                                            <ChevronDown className={cls("h-4 w-4 text-slate-400 transition-transform", showVehicleDropdown && "rotate-180")} />
                                        </div>

                                        {showVehicleDropdown && (
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                {loadingVehicles ? (
                                                    <div className="p-3 text-center text-slate-500 text-sm">
                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                                                        Đang tải...
                                                    </div>
                                                ) : filteredVehicles.length === 0 ? (
                                                    <div className="p-3 text-center text-slate-500 text-sm">Không tìm thấy xe</div>
                                                ) : (
                                                    filteredVehicles.map((v) => (
                                                        <div
                                                            key={v.id}
                                                            className={cls(
                                                                "px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center justify-between",
                                                                String(v.id) === String(vehicleId) && "bg-sky-50"
                                                            )}
                                                            onClick={() => {
                                                                setVehicleId(String(v.id));
                                                                setVehicleSearch("");
                                                                setShowVehicleDropdown(false);
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-slate-900">{v.licensePlate}</div>
                                                                {v.categoryName && <div className="text-[11px] text-slate-500">{v.categoryName}</div>}
                                                            </div>
                                                            <span
                                                                className={cls(
                                                                    "text-[10px] px-1.5 py-0.5 rounded",
                                                                    v.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                                                                )}
                                                            >
                                {v.status === "AVAILABLE" ? "Sẵn sàng" : v.status}
                              </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedVehicle && (
                                        <div className="text-[11px] text-emerald-600 mt-1">
                                            ✓ Đã chọn: {selectedVehicle.licensePlate} {selectedVehicle.categoryName && `(${selectedVehicle.categoryName})`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assigned info */}
                            {(assignedDriver || assignedVehicle || assignedDriverId || assignedVehicleId) && (
                                <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                                    <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium mb-2">Đã gán cho đơn hàng</div>
                                    <div className="grid md:grid-cols-2 gap-3 text-[13px]">
                                        {(assignedDriver || assignedDriverId) && (
                                            <div className="flex items-start gap-2">
                                                <User className="h-4 w-4 text-emerald-600 mt-0.5" />
                                                <div>
                                                    <div className="text-[11px] text-slate-500 mb-0.5">Tài xế:</div>
                                                    <div className="font-medium text-slate-900">{assignedDriver?.name || `Đang tải... (ID: ${assignedDriverId})`}</div>
                                                    {assignedDriver?.phone && <div className="text-[11px] text-slate-500">{assignedDriver.phone}</div>}
                                                </div>
                                            </div>
                                        )}
                                        {(assignedVehicle || assignedVehicleId) && (
                                            <div className="flex items-start gap-2">
                                                <CarFront className="h-4 w-4 text-emerald-600 mt-0.5" />
                                                <div>
                                                    <div className="text-[11px] text-slate-500 mb-0.5">Xe:</div>
                                                    <div className="font-medium text-slate-900">{assignedVehicle?.licensePlate || `Đang tải... (ID: ${assignedVehicleId})`}</div>
                                                    {assignedVehicle?.categoryName && <div className="text-[11px] text-slate-500">{assignedVehicle.categoryName}</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {cooldownRemaining > 0 && (
                                        <div className="mt-2 text-[11px] text-sky-700 flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Có thể thay đổi sau: {Math.floor(cooldownRemaining / 60000)}:{String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, "0")}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onAssign}
                                    disabled={(!driverId && !vehicleId) || cooldownRemaining > 0 || assigning}
                                    className={cls(
                                        "rounded-md font-medium text-[13px] px-4 py-2 shadow-sm flex items-center gap-2",
                                        (driverId || vehicleId) && cooldownRemaining === 0 ? "bg-sky-600 hover:bg-sky-500 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CarFront className="h-4 w-4" />}
                                    {assigning ? "Đang gán..." : cooldownRemaining > 0 ? "Đang chờ..." : "Gán tài xế / xe"}
                                </button>

                                <div className="text-[11px] text-slate-500">
                                    {cooldownRemaining > 0
                                        ? `Đợi ${Math.floor(cooldownRemaining / 60000)}:${String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, "0")} để thay đổi`
                                        : !driverId && !vehicleId
                                            ? "Chọn ít nhất tài xế hoặc xe để gán"
                                            : "Áp dụng cho toàn bộ chuyến của đơn."}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTNOTE */}
            <div className="text-[11px] text-slate-500 mt-8 leading-relaxed">
                {/* có thể thêm info debug ở đây nếu cần */}
            </div>
        </div>
    );
}
