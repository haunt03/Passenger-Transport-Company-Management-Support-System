// EditOrderPage.jsx (LIGHT THEME)
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBooking, updateBooking, calculatePrice, assignBooking } from "../../api/bookings";
import { calculateDistance } from "../../api/graphhopper";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { listBranches } from "../../api/branches";
import { listDriversByBranch } from "../../api/drivers";
import { listVehicles } from "../../api/vehicles";
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
    Loader2,
    Navigation,
    Users,
    FileText,
    Search,
    ChevronDown,
    X,
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
        "ring-1 ring-emerald-200 bg-amber-50 text-amber-700",
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
                        "rounded-md px-3 py-2 shadow-sm border bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-amber-200 bg-amber-50 text-amber-700",
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
    const [pax, setPax] = React.useState("1");
    const [vehiclesNeeded, setVehiclesNeeded] = React.useState("1");
    const [categoryId, setCategoryId] = React.useState("");
    const [categories, setCategories] = React.useState([]);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [branches, setBranches] = React.useState([]);

    const [availabilityMsg, setAvailabilityMsg] =
        React.useState("");
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
    const [tripIds, setTripIds] = React.useState([]); // Store trip IDs for assignment
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
    const [assignedDriverId, setAssignedDriverId] = React.useState(null); // Raw ID from API
    const [assignedVehicleId, setAssignedVehicleId] = React.useState(null); // Raw ID from API
    const [lastAssignmentTime, setLastAssignmentTime] = React.useState(null);
    const [cooldownRemaining, setCooldownRemaining] = React.useState(0);

    /* --- submit state --- */
    const [submittingDraft, setSubmittingDraft] =
        React.useState(false);
    const [submittingUpdate, setSubmittingUpdate] =
        React.useState(false);

    /* --- quyền sửa --- */
    // Check: status phải là DRAFT/PENDING/CONFIRMED/ASSIGNED và còn >= 12h trước chuyến
    const canEdit = React.useMemo(() => {
        const editableStatuses = ["DRAFT", "PENDING", "CONFIRMED", "ASSIGNED", "QUOTATION_SENT"];
        if (!editableStatuses.includes(status)) return false;

        // Check thời gian: phải còn >= 12h trước chuyến
        if (startTime) {
            const tripStart = new Date(startTime);
            const now = new Date();
            const hoursUntilTrip = (tripStart - now) / (1000 * 60 * 60);
            if (hoursUntilTrip < 12) {
                return false; // Còn < 12h, không cho sửa
            }
        }
        return true;
    }, [status, startTime]);

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
            if (!Number.isNaN(d.getTime())) setStartTime(d.toISOString().slice(0, 16));
        }
        if (seedOrder.dropoff_eta) {
            const d2 = new Date(String(seedOrder.dropoff_eta).replace(" ", "T"));
            if (!Number.isNaN(d2.getTime())) setEndTime(d2.toISOString().slice(0, 16));
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
                    const mapped = cats.map(c => ({
                        id: String(c.id),
                        categoryName: c.categoryName,
                        seats: c.seats || 0
                    }));
                    setCategories(mapped);
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
                // Filter chỉ lấy branches ACTIVE
                const activeItems = items.filter(b => !b.status || b.status === "ACTIVE");
                if (activeItems.length > 0) {
                    setBranches(activeItems);
                } else {
                    pushToast("Không thể tải chi nhánh: Không có chi nhánh hoạt động", "error");
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
                // Convert UTC to local datetime-local format (YYYY-MM-DDTHH:mm)
                if (t.startTime) {
                    const d = new Date(t.startTime);
                    if (!Number.isNaN(d.getTime())) {
                        const localStr = d.getFullYear() + '-' +
                            String(d.getMonth() + 1).padStart(2, '0') + '-' +
                            String(d.getDate()).padStart(2, '0') + 'T' +
                            String(d.getHours()).padStart(2, '0') + ':' +
                            String(d.getMinutes()).padStart(2, '0');
                        setStartTime(localStr);
                    }
                }
                if (t.endTime) {
                    const d2 = new Date(t.endTime);
                    if (!Number.isNaN(d2.getTime())) {
                        const localStr2 = d2.getFullYear() + '-' +
                            String(d2.getMonth() + 1).padStart(2, '0') + '-' +
                            String(d2.getDate()).padStart(2, '0') + 'T' +
                            String(d2.getHours()).padStart(2, '0') + ':' +
                            String(d2.getMinutes()).padStart(2, '0');
                        setEndTime(localStr2);
                    }
                }
                setDistanceKm(String(t.distance || ""));
                // Load pax from trip or booking
                const paxValue = t.paxCount || b.paxCount || 1;
                setPax(String(paxValue));

                const qty = Array.isArray(b.vehicles) ? b.vehicles.reduce((s, v) => s + (v.quantity || 0), 0) : 1;
                const catId = Array.isArray(b.vehicles) && b.vehicles.length ? String(b.vehicles[0].vehicleCategoryId) : "";
                setVehiclesNeeded(String(qty));
                setCategoryId(catId);
                setSystemPrice(Number(b.estimatedCost || 0));
                setDiscountAmount(String(b.discountAmount || 0));
                setFinalPrice(Number(b.totalCost || 0));
                // Load note
                setBookingNote(b.note || "");
                // Load trip IDs for assignment
                if (Array.isArray(b.trips) && b.trips.length > 0) {
                    const ids = b.trips.map(t => t.tripId || t.id).filter(Boolean);
                    setTripIds(ids);
                    // Load assigned driver/vehicle info from first trip
                    const firstTrip = b.trips[0];
                    if (firstTrip.driverId || firstTrip.driver) {
                        const dId = firstTrip.driverId || firstTrip.driver?.driverId;
                        setAssignedDriverId(dId);
                        // If we have full driver info from API, use it
                        if (firstTrip.driver?.driverName || firstTrip.driver?.fullName) {
                            setAssignedDriver({
                                id: dId,
                                name: firstTrip.driver?.driverName || firstTrip.driver?.fullName,
                                phone: firstTrip.driver?.phone || ""
                            });
                        }
                    }
                    if (firstTrip.vehicleId || firstTrip.vehicle) {
                        const vId = firstTrip.vehicleId || firstTrip.vehicle?.vehicleId;
                        setAssignedVehicleId(vId);
                        // If we have full vehicle info from API, use it
                        if (firstTrip.vehicle?.licensePlate) {
                            setAssignedVehicle({
                                id: vId,
                                licensePlate: firstTrip.vehicle?.licensePlate,
                                categoryName: firstTrip.vehicle?.categoryName || ""
                            });
                        }
                    }
                }
            } catch { }
        })();
    }, [orderId]);

    // Update selectedCategory khi categoryId thay đổi
    React.useEffect(() => {
        if (categoryId && categories.length > 0) {
            const found = categories.find(c => c.id === categoryId);
            if (found) {
                setSelectedCategory(found);
            }
        }
    }, [categoryId, categories]);

    // Update assigned driver info when driversList is loaded
    React.useEffect(() => {
        if (assignedDriverId && driversList.length > 0 && !assignedDriver) {
            const found = driversList.find(d => String(d.id) === String(assignedDriverId));
            if (found) {
                setAssignedDriver({
                    id: found.id,
                    name: found.name,
                    phone: found.phone || ""
                });
            }
        }
    }, [assignedDriverId, driversList, assignedDriver]);

    // Update assigned vehicle info when vehiclesList is loaded
    React.useEffect(() => {
        if (assignedVehicleId && vehiclesList.length > 0 && !assignedVehicle) {
            const found = vehiclesList.find(v => String(v.id) === String(assignedVehicleId));
            if (found) {
                setAssignedVehicle({
                    id: found.id,
                    licensePlate: found.licensePlate,
                    categoryName: found.categoryName || ""
                });
            }
        }
    }, [assignedVehicleId, vehiclesList, assignedVehicle]);

    // Load drivers và vehicles khi branchId thay đổi
    React.useEffect(() => {
        if (!branchId) return;

        // Load drivers
        (async () => {
            setLoadingDrivers(true);
            try {
                const drivers = await listDriversByBranch(branchId);
                const list = Array.isArray(drivers) ? drivers : (drivers?.data || []);
                setDriversList(list.map(d => ({
                    id: d.driverId || d.id,
                    name: d.driverName || d.fullName || d.name || `Driver #${d.driverId || d.id}`,
                    phone: d.phone || "",
                    status: d.status || "AVAILABLE"
                })));
            } catch (err) {
                console.error("Failed to load drivers:", err);
                setDriversList([]);
            } finally {
                setLoadingDrivers(false);
            }
        })();

        // Load vehicles
        (async () => {
            setLoadingVehicles(true);
            try {
                const vehicles = await listVehicles({ branchId, categoryId: categoryId || undefined });
                const list = Array.isArray(vehicles) ? vehicles : (vehicles?.data || []);
                setVehiclesList(list.map(v => ({
                    id: v.vehicleId || v.id,
                    licensePlate: v.licensePlate || `#${v.vehicleId || v.id}`,
                    categoryName: v.categoryName || "",
                    status: v.status || "AVAILABLE"
                })));
            } catch (err) {
                console.error("Failed to load vehicles:", err);
                setVehiclesList([]);
            } finally {
                setLoadingVehicles(false);
            }
        })();
    }, [branchId, categoryId]);

    // Filter drivers and vehicles based on search
    const filteredDrivers = React.useMemo(() => {
        if (!driverSearch) return driversList;
        const search = driverSearch.toLowerCase();
        return driversList.filter(d =>
            d.name.toLowerCase().includes(search) ||
            d.phone.toLowerCase().includes(search)
        );
    }, [driversList, driverSearch]);

    const filteredVehicles = React.useMemo(() => {
        if (!vehicleSearch) return vehiclesList;
        const search = vehicleSearch.toLowerCase();
        return vehiclesList.filter(v =>
            v.licensePlate.toLowerCase().includes(search) ||
            v.categoryName.toLowerCase().includes(search)
        );
    }, [vehiclesList, vehicleSearch]);

    // Get selected driver/vehicle info
    const selectedDriver = React.useMemo(() =>
            driversList.find(d => String(d.id) === String(driverId)),
        [driversList, driverId]
    );
    const selectedVehicle = React.useMemo(() =>
            vehiclesList.find(v => String(v.id) === String(vehicleId)),
        [vehiclesList, vehicleId]
    );

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.driver-dropdown-container')) {
                setShowDriverDropdown(false);
            }
            if (!e.target.closest('.vehicle-dropdown-container')) {
                setShowVehicleDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cooldown timer for reassignment (5 minutes)
    React.useEffect(() => {
        if (!lastAssignmentTime) {
            setCooldownRemaining(0);
            return;
        }
        const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        const updateCooldown = () => {
            const elapsed = Date.now() - lastAssignmentTime;
            const remaining = Math.max(0, COOLDOWN_MS - elapsed);
            setCooldownRemaining(remaining);
        };
        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [lastAssignmentTime]);

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
        if (!categoryId || !branchId) {
            setAvailabilityMsg("Thiếu loại xe hoặc chi nhánh");
            pushToast("Vui lòng chọn loại xe và chi nhánh trước", "error");
            return;
        }
        if (!startTime || !endTime) {
            setAvailabilityMsg("Thiếu thời gian đón/trả");
            pushToast("Vui lòng nhập thời gian đón và trả", "error");
            return;
        }

        setCheckingAvailability(true);
        setAvailabilityMsg("");

        try {
            const { checkVehicleAvailability } = await import("../../api/bookings");
            const result = await checkVehicleAvailability({
                branchId: Number(branchId),
                categoryId: Number(categoryId),
                startTime: toIsoZ(startTime),
                endTime: toIsoZ(endTime),
                quantity: Number(vehiclesNeeded || 1),
            });
            if (result?.ok || result?.available) {
                const count = result.availableCount || result.count || 0;
                setAvailabilityMsg(`✓ Khả dụng: Còn ${count} xe`);
                pushToast(`Xe còn sẵn (${count} chiếc)`, "success");
            } else {
                setAvailabilityMsg("⚠ Cảnh báo: Hết xe trong khung giờ này");
                pushToast("Hết xe khớp loại bạn chọn", "error");
            }
        } catch (e) {
            console.error("Check availability error:", e);
            setAvailabilityMsg("Không kiểm tra được - thử lại sau");
            pushToast("Không kiểm tra được khả dụng xe: " + (e.message || "Lỗi"), "error");
        } finally {
            setCheckingAvailability(false);
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
        // Validate thông tin khách hàng
        if (!customerPhone || customerPhone.trim().length < 10) {
            pushToast("Số điện thoại không hợp lệ (cần ít nhất 10 số)", "error");
            return;
        }
        if (!customerName || customerName.trim().length < 2) {
            pushToast("Vui lòng nhập tên khách hàng", "error");
            return;
        }

        // Validate điểm đón/trả
        if (!pickup || pickup.trim().length < 3) {
            pushToast("Vui lòng nhập điểm đón", "error");
            return;
        }
        if (!dropoff || dropoff.trim().length < 3) {
            pushToast("Vui lòng nhập điểm đến", "error");
            return;
        }

        // Validate time
        if (!startTime || !endTime) {
            pushToast("Vui lòng nhập thời gian đón và kết thúc", "error");
            return;
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        const now = new Date();

        // Check if start time is in the past
        if (startDate < now) {
            pushToast("Thời gian đón phải lớn hơn thời gian hiện tại", "error");
            return;
        }

        // Check if end time is after start time
        if (endDate <= startDate) {
            pushToast("Thời gian kết thúc phải sau thời gian đón", "error");
            return;
        }

        // Validate số khách
        const paxNum = Number(pax || 0);
        if (paxNum < 1) {
            pushToast("Số khách phải >= 1", "error");
            return;
        }
        if (selectedCategory && selectedCategory.seats && paxNum >= selectedCategory.seats) {
            pushToast(`Số khách phải < ${selectedCategory.seats} (số ghế xe)`, "error");
            return;
        }

        setSubmittingDraft(true);

        const cleanDiscount = Number(
            String(discountAmount || "0").replace(/[^0-9]/g, "")
        );

        const req = {
            customer: { fullName: customerName.trim(), phone: customerPhone.trim(), email: customerEmail?.trim() || null },
            branchId: Number(branchId || 0) || undefined,
            trips: [{
                startLocation: pickup.trim(),
                endLocation: dropoff.trim(),
                startTime: toIsoZ(startTime),
                endTime: toIsoZ(endTime),
                distance: distanceKm ? Number(distanceKm) : undefined,
                paxCount: paxNum
            }],
            vehicles: [{ vehicleCategoryId: Number(categoryId || 0), quantity: Number(vehiclesNeeded || 1) }],
            estimatedCost: Number(systemPrice || 0),
            discountAmount: cleanDiscount,
            totalCost: Number(finalPrice || 0),
            note: bookingNote?.trim() || null,
        };
        try {
            await updateBooking(orderId, req);
            pushToast('Đã lưu thay đổi.', 'success');
            navigate('/orders', { state: { refresh: true, toast: 'Đã lưu thay đổi.' } });
        } catch (err) {
            pushToast('Lưu thất bại: ' + (err.response?.data?.message || err.message || 'Lỗi không xác định'), 'error');
        }

        setSubmittingDraft(false);
    };

    /* --- PUT status=PENDING --- */
    const onSubmitOrder = async () => {
        // Validate time
        if (startTime && endTime) {
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);
            const now = new Date();

            // Check if start time is in the past
            if (startDate < now) {
                pushToast("Thời gian đón phải lớn hơn hoặc bằng thời gian hiện tại", "error");
                return;
            }

            // Check if end time is after start time
            if (endDate <= startDate) {
                pushToast("Thời gian kết thúc phải sau thời gian đón", "error");
                return;
            }
        }

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
            trips: [{ startLocation: pickup, endLocation: dropoff, startTime: toIsoZ(startTime), endTime: toIsoZ(endTime), distance: distanceKm ? Number(distanceKm) : undefined }],
            vehicles: [{ vehicleCategoryId: Number(categoryId || 0), quantity: Number(vehiclesNeeded || 1) }],
            estimatedCost: Number(systemPrice || 0),
            discountAmount: cleanDiscount,
            totalCost: Number(finalPrice || 0),
            status: 'PENDING',
        };
        try {
            await updateBooking(orderId, req2);
            setStatus('PENDING');
            pushToast('Đã cập nhật đơn hàng.', 'success');
            navigate('/orders', { state: { refresh: true, toast: 'Đã cập nhật đơn hàng.' } });
        } catch (err) {
            pushToast('Cập nhật đơn thất bại: ' + (err.response?.data?.message || err.message || 'Lỗi không xác định'), 'error');
        }

        setSubmittingUpdate(false);
    };

    // Assign driver/vehicle to all trips
    const [assigning, setAssigning] = React.useState(false);
    const onAssign = async () => {
        if (tripIds.length === 0) {
            pushToast("Không tìm thấy chuyến để gán. Vui lòng tải lại trang.", "error");
            return;
        }

        // Check cooldown
        if (cooldownRemaining > 0) {
            const mins = Math.floor(cooldownRemaining / 60000);
            const secs = Math.floor((cooldownRemaining % 60000) / 1000);
            pushToast(`Vui lòng đợi ${mins}:${String(secs).padStart(2, '0')} để thay đổi tài xế/xe`, "error");
            return;
        }

        setAssigning(true);
        try {
            await assignBooking(orderId, {
                driverId: driverId ? Number(driverId) : undefined,
                vehicleId: vehicleId ? Number(vehicleId) : undefined,
                tripIds: tripIds,
            });
            pushToast("Đã gán tài xế/xe cho đơn hàng", "success");
            // Store assigned info and start cooldown
            if (driverId && selectedDriver) {
                setAssignedDriverId(driverId);
                setAssignedDriver({ ...selectedDriver });
            }
            if (vehicleId && selectedVehicle) {
                setAssignedVehicleId(vehicleId);
                setAssignedVehicle({ ...selectedVehicle });
            }
            setLastAssignmentTime(Date.now());
            // Reset selection
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
    const lockedReason = React.useMemo(() => {
        const editableStatuses = ["DRAFT", "PENDING", "CONFIRMED", "ASSIGNED", "QUOTATION_SENT"];
        if (!editableStatuses.includes(status)) {
            return `Đơn hàng ở trạng thái ${ORDER_STATUS_LABEL[status] || status}. Không thể chỉnh sửa.`;
        }
        if (startTime) {
            // startTime đã được convert sang local format (YYYY-MM-DDTHH:mm)
            const tripStart = new Date(startTime);
            const now = new Date();
            const diffMs = tripStart.getTime() - now.getTime();
            const hoursUntilTrip = diffMs / (1000 * 60 * 60);

            if (hoursUntilTrip < 12) {
                const absHours = Math.abs(hoursUntilTrip);
                const hours = Math.floor(absHours);
                const minutes = Math.floor((absHours - hours) * 60);

                if (hoursUntilTrip < 0) {
                    return `Chuyến đi đã diễn ra ${hours} giờ ${minutes} phút trước. Không thể chỉnh sửa.`;
                }
                return `Chỉ còn ${hours} giờ ${minutes} phút trước chuyến đi. Cần >= 12 giờ để chỉnh sửa.`;
            }
        }
        return null;
    }, [status, startTime]);

    const lockedBanner = !canEdit && lockedReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] flex items-start gap-2 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="leading-relaxed">
                {lockedReason}
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
                            <DollarSign className="h-6 w-6 text-amber-600" />
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
                    {/* Lưu thay đổi */}
                    <button
                        disabled={
                            !canEdit || submittingDraft
                        }
                        onClick={onSaveDraft}
                        className={cls(
                            "rounded-md font-medium text-[13px] px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                            canEdit
                                ? "bg-[#EDC531] hover:bg-amber-500 text-white"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        {submittingDraft
                            ? "Đang lưu..."
                            : "Lưu thay đổi"}
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
                            <DollarSign className="h-4 w-4 text-amber-600" />
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
                            <CarFront className="h-4 w-4 text-amber-600" />
                            Hành trình & loại xe
                        </div>

                        {/* Điểm đón */}
                        <div className="mb-3">
                            <label className={labelCls}>
                                <MapPin className="h-3.5 w-3.5 text-amber-600" />
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
                                <label className={labelCls}>
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số khách</span>
                                    {selectedCategory && selectedCategory.seats > 0 && (
                                        <span className="text-[11px] text-slate-500 font-normal ml-1">
                                            (Tối đa: {selectedCategory.seats - 1})
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedCategory && selectedCategory.seats ? selectedCategory.seats - 1 : undefined}
                                    className={makeInputCls({
                                        enabled: inputEnabledCls,
                                        disabled: inputDisabledCls,
                                    })}
                                    value={pax}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        setPax(val);
                                    }}
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

                            <div>
                                <label className={labelCls}>
                                    <CarFront className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số lượng xe</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    className={makeInputCls({
                                        enabled: inputEnabledCls,
                                        disabled: inputDisabledCls,
                                    })}
                                    value={vehiclesNeeded}
                                    onChange={(e) =>
                                        setVehiclesNeeded(
                                            e.target.value.replace(/[^0-9]/g, "")
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
                                    canEdit && !checkingAvailability
                                        ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                        : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                                disabled={!canEdit || checkingAvailability}
                                onClick={checkAvailability}
                            >
                                {checkingAvailability ? (
                                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                                ) : (
                                    <CarFront className="h-4 w-4 text-amber-600" />
                                )}
                                <span>{checkingAvailability ? "Đang kiểm tra..." : "Kiểm tra xe"}</span>
                            </button>

                            {availabilityMsg ? (
                                <div className={cls(
                                    "text-[12px]",
                                    availabilityMsg.includes("✓") ? "text-emerald-600" :
                                        availabilityMsg.includes("⚠") ? "text-amber-600" : "text-slate-700"
                                )}>
                                    {availabilityMsg}
                                </div>
                            ) : (
                                <div className="text-[11px] text-slate-400 leading-relaxed">
                                    Hệ thống sẽ cảnh báo nếu hết xe khả dụng.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ghi chú cho tài xế */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <FileText className="h-4 w-4 text-amber-600" />
                            Ghi chú cho tài xế
                        </div>
                        <textarea
                            rows={3}
                            className={makeInputCls({
                                enabled: cls(textareaEnabledCls, "resize-none"),
                                disabled: cls(textareaDisabledCls, "resize-none"),
                            })}
                            value={bookingNote}
                            onChange={(e) => setBookingNote(e.target.value)}
                            placeholder="VD: Đón thêm 1 khách ở 123 Trần Hưng Đạo lúc 8h30, hành lý cồng kềnh..."
                            {...disableInputProps}
                        />
                        <div className="text-[11px] text-slate-400 mt-2">
                            Ghi chú này sẽ hiển thị cho tài xế trong chi tiết chuyến đi.
                        </div>
                    </div>

                    {/* Gán tài xế / xe */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-4">
                            <CarFront className="h-4 w-4 text-sky-600" />
                            Gán tài xế / phân xe
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-[13px]">
                            {/* Driver Dropdown */}
                            <div className="relative driver-dropdown-container">
                                <label className={labelCls}>
                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Tài xế</span>
                                    {loadingDrivers && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                                </label>
                                <div className="relative">
                                    <div
                                        className={cls(
                                            "flex items-center gap-2 cursor-pointer",
                                            inputEnabledCls
                                        )}
                                        onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                                    >
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent outline-none text-sm"
                                            placeholder={selectedDriver ? "" : "Tìm tài xế..."}
                                            value={showDriverDropdown ? driverSearch : (selectedDriver?.name || "")}
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
                                                <div className="p-3 text-center text-slate-500 text-sm">
                                                    Không tìm thấy tài xế
                                                </div>
                                            ) : (
                                                filteredDrivers.map(d => (
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
                                                        <span className={cls(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            d.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {d.status === "AVAILABLE" ? "Sẵn sàng" : d.status}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedDriver && (
                                    <div className="text-[11px] text-emerald-600 mt-1">
                                        ✓ Đã chọn: {selectedDriver.name}
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Dropdown */}
                            <div className="relative vehicle-dropdown-container">
                                <label className={labelCls}>
                                    <CarFront className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Xe</span>
                                    {loadingVehicles && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                                </label>
                                <div className="relative">
                                    <div
                                        className={cls(
                                            "flex items-center gap-2 cursor-pointer",
                                            inputEnabledCls
                                        )}
                                        onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                                    >
                                        <Search className="h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent outline-none text-sm"
                                            placeholder={selectedVehicle ? "" : "Tìm xe (biển số)..."}
                                            value={showVehicleDropdown ? vehicleSearch : (selectedVehicle?.licensePlate || "")}
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
                                                <div className="p-3 text-center text-slate-500 text-sm">
                                                    Không tìm thấy xe
                                                </div>
                                            ) : (
                                                filteredVehicles.map(v => (
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
                                                        <span className={cls(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            v.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                        )}>
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

                        {/* Hiển thị thông tin đã gán */}
                        {(assignedDriver || assignedVehicle || assignedDriverId || assignedVehicleId) && (
                            <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                                <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium mb-2">
                                    Đã gán cho đơn hàng
                                </div>
                                <div className="grid md:grid-cols-2 gap-3 text-[13px]">
                                    {(assignedDriver || assignedDriverId) && (
                                        <div className="flex items-start gap-2">
                                            <User className="h-4 w-4 text-emerald-600 mt-0.5" />
                                            <div>
                                                <div className="text-[11px] text-slate-500 mb-0.5">Tài xế:</div>
                                                <div className="font-medium text-slate-900">
                                                    {assignedDriver?.name || `Đang tải... (ID: ${assignedDriverId})`}
                                                </div>
                                                {assignedDriver?.phone && <div className="text-[11px] text-slate-500">{assignedDriver.phone}</div>}
                                            </div>
                                        </div>
                                    )}
                                    {(assignedVehicle || assignedVehicleId) && (
                                        <div className="flex items-start gap-2">
                                            <CarFront className="h-4 w-4 text-emerald-600 mt-0.5" />
                                            <div>
                                                <div className="text-[11px] text-slate-500 mb-0.5">Xe:</div>
                                                <div className="font-medium text-slate-900">
                                                    {assignedVehicle?.licensePlate || `Đang tải... (ID: ${assignedVehicleId})`}
                                                </div>
                                                {assignedVehicle?.categoryName && <div className="text-[11px] text-slate-500">{assignedVehicle.categoryName}</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {cooldownRemaining > 0 && (
                                    <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Có thể thay đổi sau: {Math.floor(cooldownRemaining / 60000)}:{String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, '0')}
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
                                    (driverId || vehicleId) && cooldownRemaining === 0
                                        ? "bg-sky-600 hover:bg-sky-500 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CarFront className="h-4 w-4" />}
                                {assigning ? "Đang gán..." : (cooldownRemaining > 0 ? "Đang chờ..." : "Gán tài xế / xe")}
                            </button>
                            <div className="text-[11px] text-slate-500">
                                {cooldownRemaining > 0
                                    ? `Đợi ${Math.floor(cooldownRemaining / 60000)}:${String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, '0')} để thay đổi`
                                    : (!driverId && !vehicleId
                                        ? "Chọn ít nhất tài xế hoặc xe để gán"
                                        : "Áp dụng cho toàn bộ chuyến của đơn.")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTNOTE */}
            <div className="text-[11px] text-slate-500 mt-8 leading-relaxed">
                {/* <div className="text-slate-700 font-mono text-[11px]">
                    PUT /api/orders/{MOCK_ORDER.id}
                </div>
                <div>
                    Trạng thái hiện tại:{" "}
                    <span className="text-slate-900 font-semibold">
                        {ORDER_STATUS_LABEL[status] ||
                            status}
                    </span>
                </div> */}
                {/* <div className="text-[12px] text-slate-600">
                    Nếu trạng thái là{" "}
                    <span className="text-amber-600 font-semibold">
                        ASSIGNED
                    </span>{" "}
                    hoặc{" "}
                    <span className="text-amber-600 font-semibold">
                        COMPLETED
                    </span>
                    , chỉnh sửa phải thông qua điều
                    phối viên.
                </div> */}
            </div>
        </div>
    );
}
