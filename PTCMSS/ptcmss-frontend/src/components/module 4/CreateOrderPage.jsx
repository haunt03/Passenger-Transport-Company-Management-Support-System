// CreateOrderPage.jsx (LIGHT THEME)
import React from "react";
import { useNavigate } from "react-router-dom";
import { listVehicleCategories } from "../../api/vehicleCategories";
import { listHireTypes } from "../../api/hireTypes";
import { calculatePrice, createBooking, getBooking, pageBookings, checkVehicleAvailability } from "../../api/bookings";
import { calculateDistance } from "../../api/graphhopper";
import { getBranchByUserId, listBranches } from "../../api/branches";
import PlaceAutocomplete from "../common/PlaceAutocomplete";
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
    Navigation,
    Plus,
    Minus,
    Search,
    History,
    Sparkles,
    ArrowRight,
    X,
} from "lucide-react";
import AnimatedDialog from "../common/AnimatedDialog";

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

function stripAccents(str = "") {
    try {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    } catch {
        return String(str || "").toLowerCase();
    }
}

function normalizeNumberValue(value) {
    if (value == null) return NaN;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : NaN;
    }

    const raw = String(value).trim();
    if (!raw) return NaN;

    // Remove all characters except digits, dot, comma, minus
    const digitsOnly = raw.replace(/[^\d.,-]/g, "");
    if (!digitsOnly) return NaN;

    // Replace commas with dots to unify decimal separators
    const dotNormalized = digitsOnly.replace(/,/g, ".");

    // If there are multiple dots, treat the last one as decimal and remove the others (thousand separators)
    const parts = dotNormalized.split(".");
    let normalizedNumber = dotNormalized;
    if (parts.length > 2) {
        const decimalPart = parts.pop();
        const integerPart = parts.join("");
        normalizedNumber = `${integerPart}.${decimalPart}`;
    }

    const parsed = parseFloat(normalizedNumber);
    return Number.isNaN(parsed) ? NaN : parsed;
}

function mapHireTypeNameToCode(name) {
    const normalized = stripAccents(name);
    if (!normalized) return "ONE_WAY";
    if (normalized.includes("hai") || normalized.includes("round") || normalized.includes("khu")) {
        return "ROUND_TRIP";
    }
    if (normalized.includes("ngay") || normalized.includes("daily")) {
        return "DAILY";
    }
    if (normalized.includes("multi")) {
        return "MULTI_DAY";
    }
    if (normalized.includes("co dinh") || normalized.includes("fixed")) {
        return "FIXED_ROUTE";
    }
    return "ONE_WAY";
}

function toDatetimeLocalValue(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    const tzOffsetMinutes = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - tzOffsetMinutes * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
}

function formatReadableDateTime(isoString) {
    if (!isoString) return "Chưa rõ";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Chưa rõ";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function extractPageItems(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.data?.content)) return payload.data.content;
    return [];
}

// Convert "YYYY-MM-DDTHH:mm" (datetime-local) to ISO string with Z
function toIsoZ(s) {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString();
}

// Removed MOCK_CATEGORIES - chỉ dùng data từ API, báo lỗi nếu không fetch được

/* mini toast (light style) */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback(
        (msg, kind = "info", ttl = 2500) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((arr) => [...arr, { id, msg, kind }]);
            setTimeout(() => {
                setToasts((arr) => arr.filter((t) => t.id !== id));
            }, ttl);
        },
        [setToasts]
    );
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
    const navigate = useNavigate();

    /* --- Phần 1: khách hàng --- */
    const [phone, setPhone] = React.useState("");
    const [customerName, setCustomerName] = React.useState("");
    const [email, setEmail] = React.useState("");

    /* --- Phần 2: hình thức thuê --- */
    const [hireType, setHireType] =
        React.useState("ONE_WAY"); // ONE_WAY | ROUND_TRIP | DAILY
    const [hireTypeId, setHireTypeId] = React.useState(""); // ID từ backend
    const [hireTypesList, setHireTypesList] = React.useState([]); // Danh sách từ backend

    /* --- Phần 3: chuyến đi / yêu cầu xe --- */
    const [pickup, setPickup] = React.useState("");
    const [dropoff, setDropoff] = React.useState("");
    const [startTime, setStartTime] = React.useState("");
    const [endTime, setEndTime] = React.useState("");
    const [timeError, setTimeError] = React.useState(""); // Error message cho validation thời gian
    const [categories, setCategories] = React.useState([]);
    const [paxCount, setPaxCount] = React.useState(1);

    // Multiple vehicle selections: [{ categoryId, quantity }]
    const [vehicleSelections, setVehicleSelections] = React.useState([
        { categoryId: "", quantity: 1 }
    ]);

    // Helper: thêm loại xe
    const addVehicleSelection = () => {
        if (vehicleSelections.length >= 5) return; // Max 5 loại
        const unusedCategory = categories.find(c =>
            !vehicleSelections.some(v => v.categoryId === c.id)
        );
        setVehicleSelections([...vehicleSelections, {
            categoryId: unusedCategory?.id || "",
            quantity: 1
        }]);
    };

    // Helper: xóa loại xe
    const removeVehicleSelection = (index) => {
        if (vehicleSelections.length <= 1) return; // Ít nhất 1 loại
        setVehicleSelections(vehicleSelections.filter((_, i) => i !== index));
    };

    // Helper: cập nhật loại xe
    const updateVehicleSelection = (index, field, value) => {
        const updated = [...vehicleSelections];

        // Nếu đang thay đổi categoryId, kiểm tra trùng lặp
        if (field === 'categoryId') {
            // Kiểm tra xem loại xe này đã được chọn ở selection khác chưa
            const isDuplicate = vehicleSelections.some((v, i) =>
                i !== index && v.categoryId === value && value !== ""
            );

            if (isDuplicate) {
                // Không cho phép chọn loại xe đã được chọn
                alert("Loại xe này đã được chọn. Vui lòng chọn loại xe khác hoặc tăng số lượng của loại xe đã chọn.");
                return;
            }
        }

        updated[index] = { ...updated[index], [field]: value };
        setVehicleSelections(updated);
    };

    // Tính tổng số chỗ
    const totalSeats = React.useMemo(() => {
        return vehicleSelections.reduce((sum, v) => {
            const cat = categories.find(c => c.id === v.categoryId);
            return sum + (cat?.seats || 0) * (v.quantity || 0);
        }, 0);
    }, [vehicleSelections, categories]);

    // Lấy categoryId đầu tiên để tương thích với code cũ
    const categoryId = vehicleSelections[0]?.categoryId || "";
    const vehicleCount = vehicleSelections[0]?.quantity || 1;
    const selectedCategory = categories.find(c => c.id === categoryId) || null;
    const [recentBookingSuggestion, setRecentBookingSuggestion] = React.useState(null);
    const [showPrefillDialog, setShowPrefillDialog] = React.useState(false);
    const [prefillLoading, setPrefillLoading] = React.useState(false);
    const [showSuggestionDialog, setShowSuggestionDialog] = React.useState(false);

    // branch management
    const [branchId, setBranchId] = React.useState("");
    const [branchName, setBranchName] = React.useState("");
    const [availableBranches, setAvailableBranches] = React.useState([]);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [loadingBranch, setLoadingBranch] = React.useState(true);

    // availability check
    const [availabilityInfo, setAvailabilityInfo] =
        React.useState(null);
    const [checkingAvail, setCheckingAvail] =
        React.useState(false);

    // Real API check-availability với suggestions - CHECK ALL VEHICLES
    React.useEffect(() => {
        // Chỉ check khi có ít nhất 1 loại xe được chọn
        const hasValidSelection = vehicleSelections.some(v => v.categoryId && v.quantity > 0);
        if (!startTime || !hasValidSelection || !branchId) {
            setAvailabilityInfo(null);
            return;
        }
        if (hireType !== "ONE_WAY" && !endTime) {
            setAvailabilityInfo(null);
            return;
        }

        const checkAvail = async () => {
            setCheckingAvail(true);
            try {
                const sStart = new Date(startTime).toISOString();
                // ONE_WAY: endTime = startTime + 2 giờ
                const sEnd = hireType === "ONE_WAY" && !endTime
                    ? new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString()
                    : new Date(endTime).toISOString();

                // Check availability cho TẤT CẢ các loại xe đã chọn
                const results = await Promise.all(
                    vehicleSelections
                        .filter(v => v.categoryId && v.quantity > 0)
                        .map(async (selection) => {
                            const data = await checkVehicleAvailability({
                                branchId: Number(branchId),
                                categoryId: Number(selection.categoryId),
                                startTime: sStart,
                                endTime: sEnd,
                                quantity: selection.quantity || 1,
                            });
                            return { ...data, categoryId: selection.categoryId, quantity: selection.quantity };
                        })
                );

                console.log("[CheckAvailability] All results:", results);

                // Tổng hợp kết quả: nếu có bất kỳ loại xe nào hết thì báo hết
                const allOk = results.every(r => r.ok);
                const failedChecks = results.filter(r => !r.ok);

                if (allOk) {
                    // Tất cả đều có đủ xe
                    const totalAvailable = results.reduce((sum, r) => sum + (r.availableCount || 0), 0);
                    setAvailabilityInfo({
                        ok: true,
                        count: totalAvailable,
                        text: `Khả dụng: Tất cả loại xe đều có sẵn`,
                        branch: branchId,
                        results: results,
                    });
                } else {
                    // Có ít nhất 1 loại xe hết
                    const firstFailed = failedChecks[0];
                    const cat = categories.find(c => c.id === firstFailed.categoryId);
                    setAvailabilityInfo({
                        ok: false,
                        count: firstFailed.availableCount || 0,
                        needed: firstFailed.needed,
                        totalCandidates: firstFailed.totalCandidates || 0,
                        busyCount: firstFailed.busyCount || 0,
                        text: `${cat?.name || 'Xe'}: Hết xe (${firstFailed.busyCount || 0}/${firstFailed.totalCandidates || 0} đang bận)`,
                        branch: branchId,
                        // Suggestions từ kết quả đầu tiên bị fail
                        alternativeCategories: firstFailed.alternativeCategories,
                        nextAvailableSlots: firstFailed.nextAvailableSlots,
                        failedCategoryId: firstFailed.categoryId,
                        results: results,
                    });
                    // Tự động mở popup gợi ý khi không đủ xe và có suggestions
                    if (firstFailed.alternativeCategories?.length > 0 || firstFailed.nextAvailableSlots?.length > 0) {
                        setShowSuggestionDialog(true);
                    }
                }
            } catch (err) {
                console.error("Check availability error:", err);
                setAvailabilityInfo({
                    ok: true,
                    count: 0,
                    text: "Lỗi kiểm tra: " + (err.message || "Không xác định"),
                    branch: branchId,
                });
            } finally {
                setCheckingAvail(false);
            }
        };

        // Debounce 500ms
        const timer = setTimeout(checkAvail, 500);
        return () => clearTimeout(timer);
    }, [startTime, endTime, branchId, hireType, vehicleSelections, categories]);

    /* --- Part 4: báo giá --- */
    const [estPriceSys, setEstPriceSys] =
        React.useState(0); // giá gợi ý system
    const [discountPercent, setDiscountPercent] = React.useState(0); // phần trăm giảm giá (0-100)
    const [discount, setDiscount] = React.useState(0); // số tiền giảm (VND) - tính từ phần trăm
    const [discountReason, setDiscountReason] =
        React.useState("");
    const [quotedPrice, setQuotedPrice] = React.useState(0);
    const [quotedPriceTouched, setQuotedPriceTouched] = React.useState(false);

    const [calculatingPrice, setCalculatingPrice] =
        React.useState(false);

    const [distanceKm, setDistanceKm] = React.useState("");
    const [calculatingDistance, setCalculatingDistance] = React.useState(false);
    const [distanceError, setDistanceError] = React.useState("");

    // Tự động tính discount và quotedPrice khi discountPercent hoặc estPriceSys thay đổi
    React.useEffect(() => {
        const discountAmount = Math.round((estPriceSys * discountPercent) / 100);
        setDiscount(discountAmount);

        // Tự động cập nhật giá báo khách nếu chưa được chỉnh sửa thủ công
        if (!quotedPriceTouched) {
            const newQuotedPrice = Math.max(0, estPriceSys - discountAmount);
            setQuotedPrice(newQuotedPrice);
        }
    }, [discountPercent, estPriceSys, quotedPriceTouched]);

    // Các field mới cho logic tính giá
    const [isHoliday, setIsHoliday] = React.useState(false);
    const [isWeekend, setIsWeekend] = React.useState(false);

    // Note cho tài xế (ghi chú điểm đón/trả, hướng dẫn...)
    const [bookingNote, setBookingNote] = React.useState("");
    const loadRecentBookingSuggestion = React.useCallback(async (phoneNumber) => {
        if (!phoneNumber) return;
        try {
            const payload = await pageBookings({
                keyword: phoneNumber,
                page: 1,
                size: 1,
                sortBy: "id:desc",
            });
            const items = extractPageItems(payload);
            if (items.length > 0) {
                const latest = items[0];
                setRecentBookingSuggestion({
                    id: latest.id,
                    customerName: latest.customerName,
                    routeSummary: latest.routeSummary,
                    startDate: latest.startDate,
                    totalCost: latest.totalCost,
                    status: latest.status,
                });
                setShowPrefillDialog(true);
            } else {
                setRecentBookingSuggestion(null);
            }
        } catch (error) {
            console.error("Failed to load recent booking suggestion:", error);
        }
    }, []);
    const applyBookingToForm = React.useCallback((booking) => {
        if (!booking) return;
        setHireTypeId(booking.hireTypeId ? String(booking.hireTypeId) : "");
        setHireType(mapHireTypeNameToCode(booking.hireTypeName));
        setCustomerName(booking.customer?.fullName || "");
        setEmail(booking.customer?.email || "");
        const primaryTrip = booking.trips?.[0];
        setPickup(primaryTrip?.startLocation || "");
        setDropoff(primaryTrip?.endLocation || "");
        setStartTime(primaryTrip?.startTime ? toDatetimeLocalValue(primaryTrip.startTime) : "");
        setEndTime(primaryTrip?.endTime ? toDatetimeLocalValue(primaryTrip.endTime) : "");
        if (Array.isArray(booking.vehicles) && booking.vehicles.length > 0) {
            const firstVehicle = booking.vehicles[0];
            if (firstVehicle?.vehicleCategoryId) {
                setCategoryId(String(firstVehicle.vehicleCategoryId));
            }
            const totalVehicles = booking.vehicles.reduce((sum, v) => sum + (v.quantity || 0), 0);
            if (totalVehicles > 0) {
                setVehicleCount(totalVehicles);
            }
        }
        if (primaryTrip?.distance != null) {
            const parsedDistance = normalizeNumberValue(primaryTrip.distance);
            if (!Number.isNaN(parsedDistance)) {
                setDistanceKm(parsedDistance.toFixed(2));
            }
        }
        setQuotedPrice(Number(booking.totalCost || 0));
        setQuotedPriceTouched(false);
        const savedEstPrice = Number(booking.estimatedCost || 0);
        setEstPriceSys(savedEstPrice);
        const savedDiscount = Number(booking.discountAmount || 0);
        // Tính phần trăm giảm giá từ số tiền đã lưu
        if (savedEstPrice > 0) {
            const percent = (savedDiscount / savedEstPrice) * 100;
            setDiscountPercent(Math.min(100, Math.max(0, percent)));
        } else {
            setDiscountPercent(0);
        }
        // discount sẽ được tính tự động bởi useEffect từ discountPercent
    }, []);
    const handleApplyRecentBooking = React.useCallback(async () => {
        if (!recentBookingSuggestion?.id) return;
        try {
            setPrefillLoading(true);
            const booking = await getBooking(recentBookingSuggestion.id);
            applyBookingToForm(booking);
            push(`Đã tự động điền theo đơn #${recentBookingSuggestion.id}`, "success");
            setShowPrefillDialog(false);
        } catch (error) {
            console.error("Prefill booking failed:", error);
            push("Không thể tải đơn hàng gần nhất để tự động điền", "error");
        } finally {
            setPrefillLoading(false);
        }
    }, [recentBookingSuggestion, applyBookingToForm, push]);
    React.useEffect(() => {
        const cleaned = (phone || "").replace(/[^0-9]/g, "");
        if (!cleaned || cleaned.length < 10) {
            setRecentBookingSuggestion(null);
            setShowPrefillDialog(false);
        }
    }, [phone]);

    // Load branch based on user role
    React.useEffect(() => {
        (async () => {
            try {
                setLoadingBranch(true);
                const userId = localStorage.getItem("userId");
                const roleName = (localStorage.getItem("roleName") || "").toUpperCase();
                const isAdminUser = roleName === "ADMIN";

                console.log("🔍 Branch Loading Debug:", {
                    userId,
                    roleName,
                    isAdminUser
                });

                setIsAdmin(isAdminUser);

                if (isAdminUser) {
                    // Admin: Load all branches for selection
                    console.log("👑 Loading branches for Admin...");
                    const branchesData = await listBranches({ page: 0, size: 100 });
                    console.log("📦 Branches API Response:", branchesData);

                    // Try multiple possible response structures
                    let branches = branchesData?.data?.items ||
                        branchesData?.items ||
                        branchesData?.data?.content ||
                        branchesData?.content ||
                        (Array.isArray(branchesData?.data) ? branchesData.data : []) ||
                        (Array.isArray(branchesData) ? branchesData : []);

                    // Filter only ACTIVE branches
                    branches = branches.filter(b => b && b.id && b.status === 'ACTIVE');

                    // Normalize field names: id -> branchId for consistency
                    const normalizedBranches = branches.map(b => ({
                        branchId: b.id || b.branchId,
                        branchName: b.branchName,
                        location: b.location,
                        status: b.status
                    }));

                    console.log("✅ Extracted branches:", normalizedBranches);
                    setAvailableBranches(normalizedBranches);

                    if (normalizedBranches.length > 0) {
                        setBranchId(String(normalizedBranches[0].branchId));
                        setBranchName(normalizedBranches[0].branchName);
                        console.log("✅ Set default branch:", normalizedBranches[0]);
                        push(`Đã tải ${normalizedBranches.length} chi nhánh`, "success");
                    } else {
                        console.warn("⚠️ No active branches found for Admin");
                        push("Không tìm thấy chi nhánh ACTIVE nào trong hệ thống", "error");
                    }
                } else {
                    // Manager/Other roles: Get branch by userId
                    console.log("👤 Loading branch for Manager/User...");
                    if (userId) {
                        const branchData = await getBranchByUserId(Number(userId));
                        console.log("📦 Branch by User Response:", branchData);

                        if (branchData) {
                            // Normalize: id -> branchId
                            const normalizedBranchId = branchData.id || branchData.branchId;
                            setBranchId(String(normalizedBranchId));
                            setBranchName(branchData.branchName);
                            console.log("✅ Set user branch:", { branchId: normalizedBranchId, branchName: branchData.branchName });
                            push(`Chi nhánh: ${branchData.branchName}`, "success");
                        } else {
                            console.warn("⚠️ Branch data is null");
                            push("Không tìm thấy chi nhánh của bạn", "error");
                        }
                    } else {
                        console.warn("⚠️ No userId found in localStorage");
                        push("Không tìm thấy thông tin người dùng", "error");
                    }
                }
            } catch (err) {
                console.error("❌ Failed to load branch:", err);
                push("Không thể tải thông tin chi nhánh: " + (err.message || "Lỗi không xác định"), "error");
            } finally {
                setLoadingBranch(false);
                console.log("✅ Branch loading completed");
            }
        })();
    }, []);

    // load categories from backend
    React.useEffect(() => {
        (async () => {
            try {
                const list = await listVehicleCategories();
                if (Array.isArray(list) && list.length > 0) {
                    // Filter chỉ lấy danh mục xe đang hoạt động (ACTIVE)
                    const activeCategories = list.filter(c => !c.status || c.status === "ACTIVE");
                    const mapped = activeCategories.map(c => ({
                        id: String(c.id),
                        name: c.categoryName,
                        seats: c.seats || 0 // Lưu số ghế
                    }));
                    setCategories(mapped);
                    if (mapped.length > 0) {
                        const firstCategory = mapped[0];
                        // Set categoryId đầu tiên cho vehicleSelections
                        setVehicleSelections([{ categoryId: firstCategory.id, quantity: 1 }]);
                    } else {
                        push("Không có danh mục xe nào đang hoạt động", "error");
                    }
                } else {
                    push("Không thể tải danh mục xe: Dữ liệu trống", "error");
                }
            } catch (err) {
                console.error("Failed to load categories:", err);
                push("Không thể tải danh mục xe: " + (err.message || "Lỗi không xác định"), "error");
            }
        })();
    }, []);

    // Load hireTypes từ backend
    React.useEffect(() => {
        (async () => {
            try {
                const list = await listHireTypes();
                if (Array.isArray(list) && list.length > 0) {
                    setHireTypesList(list);
                    // Set default hireTypeId cho ONE_WAY
                    const oneWay = list.find(h => h.code === "ONE_WAY");
                    if (oneWay) {
                        setHireTypeId(String(oneWay.id));
                    }
                }
            } catch (err) {
                console.error("Failed to load hire types:", err);
            }
        })();
    }, []);

    // Update hireTypeId khi hireType thay đổi
    React.useEffect(() => {
        if (hireType && hireTypesList.length > 0) {
            const found = hireTypesList.find(h => h.code === hireType);
            if (found) {
                setHireTypeId(String(found.id));
            }
        }
    }, [hireType, hireTypesList]);

    // Reset số khách nếu vượt quá tổng số chỗ
    React.useEffect(() => {
        if (totalSeats > 0 && paxCount > totalSeats) {
            setPaxCount(Math.max(1, totalSeats));
        }
    }, [totalSeats, paxCount]);

    // Auto-calculate distance when both pickup and dropoff are entered
    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!pickup || !dropoff) {
                setDistanceError("");
                return;
            }

            // Only calculate if both fields have reasonable length
            if (pickup.trim().length < 5 || dropoff.trim().length < 5) {
                return;
            }

            setCalculatingDistance(true);
            setDistanceError("");

            try {
                const result = await calculateDistance(pickup, dropoff);
                const parsedDistance = normalizeNumberValue(result.distance);
                if (Number.isNaN(parsedDistance)) {
                    setDistanceError("Không xác định được quãng đường. Vui lòng nhập thủ công.");
                    setDistanceKm("");
                } else {
                    setDistanceError("");
                    setDistanceKm(parsedDistance.toFixed(2));
                }
                push(`Khoảng cách: ${result.formattedDistance} (~${result.formattedDuration})`, "success");
            } catch (error) {
                console.error("Distance calculation error:", error);
                setDistanceError("Không tính được khoảng cách. Vui lòng nhập thủ công.");
                push("Không tính được khoảng cách tự động", "error");
            } finally {
                setCalculatingDistance(false);
            }
        }, 1500); // Debounce 1.5 seconds

        return () => clearTimeout(timeoutId);
    }, [pickup, dropoff]);

    // Tự động detect cuối tuần từ startTime
    React.useEffect(() => {
        if (startTime) {
            try {
                const date = new Date(startTime);
                const dayOfWeek = date.getDay(); // 0 = Chủ nhật, 6 = Thứ 7
                setIsWeekend(dayOfWeek === 0 || dayOfWeek === 6);
            } catch (e) {
                setIsWeekend(false);
            }
        } else {
            setIsWeekend(false);
        }
    }, [startTime]);

    // Validate thời gian real-time khi startTime hoặc endTime thay đổi
    React.useEffect(() => {
        if (hireType === "ONE_WAY") {
            setTimeError(""); // ONE_WAY không cần validate
            return;
        }

        if (startTime && endTime) {
            const startDate = new Date(startTime);
            const endDate = new Date(endTime);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                setTimeError(""); // Chưa parse được thì chưa validate
                return;
            }

            if (endDate <= startDate) {
                setTimeError("Thời gian về phải sau thời gian đi");
            } else {
                setTimeError(""); // Clear error nếu hợp lệ
            }
        } else {
            setTimeError(""); // Chưa đủ thông tin thì chưa validate
        }
    }, [startTime, endTime, hireType]);

    // calculate via backend when possible
    React.useEffect(() => {
        const run = async () => {
            // Cần đủ thông tin cơ bản để tính giá
            const validSelections = vehicleSelections.filter(v => v.categoryId && v.quantity > 0);
            if (validSelections.length === 0 || !distanceKm) return;

            // Nếu thiếu startTime, không tính giá
            // ONE_WAY không cần endTime
            if (!startTime) {
                console.log("⏸️ Skipping price calculation: missing startTime");
                return;
            }
            if (hireType !== "ONE_WAY" && !endTime) {
                console.log("⏸️ Skipping price calculation: missing endTime for non-ONE_WAY");
                return;
            }

            setCalculatingPrice(true);
            try {
                // Convert datetime-local to ISO string
                const startISO = toIsoZ(startTime);
                // ONE_WAY: endTime = startTime + 2 giờ (mặc định)
                const endISO = hireType === "ONE_WAY" && !endTime
                    ? toIsoZ(new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString())
                    : toIsoZ(endTime);

                // Gửi tất cả loại xe đã chọn
                const price = await calculatePrice({
                    vehicleCategoryIds: validSelections.map(v => Number(v.categoryId)),
                    quantities: validSelections.map(v => Number(v.quantity || 1)),
                    distance: Number(distanceKm || 0),
                    useHighway: false,
                    hireTypeId: hireTypeId ? Number(hireTypeId) : undefined,
                    isHoliday: isHoliday,
                    isWeekend: isWeekend,
                    startTime: startISO,
                    endTime: endISO,
                });
                const base = Number(price || 0);
                setEstPriceSys(base);
                setQuotedPrice((old) => (quotedPriceTouched ? old : base));
            } catch (err) {
                console.error("❌ Calculate price error:", err);
                // Không hiển thị toast error vì có thể là do user đang nhập dở
            } finally {
                setCalculatingPrice(false);
            }
        };
        run();
    }, [hireTypeId, isHoliday, isWeekend, startTime, endTime, quotedPriceTouched, distanceKm, vehicleSelections, hireType]);

    /* --- submit states --- */
    const [loadingDraft, setLoadingDraft] =
        React.useState(false);
    const [loadingSubmit, setLoadingSubmit] =
        React.useState(false);

    /* --- auto fill khách khi nhập SĐT --- */
    const [searchingCustomer, setSearchingCustomer] = React.useState(false);
    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            // Chỉ search nếu phone có ít nhất 10 số
            const normalizedPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
            if (!phone || normalizedPhone.length < 10) {
                return;
            }

            setSearchingCustomer(true);
            try {
                // Gọi API tìm customer by phone
                const response = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:8080"}/api/bookings/customers/phone/${encodeURIComponent(phone)}`, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    // Parse ApiResponse structure: { success, message, data }
                    const customer = result?.data || result;
                    if (customer && customer.fullName) {
                        setCustomerName(customer.fullName);
                        if (customer.email) setEmail(customer.email);
                        push("Đã tìm thấy khách hàng trong hệ thống", "success");
                    }
                } else if (response.status === 404) {
                    // Không tìm thấy - không làm gì, user sẽ nhập thủ công
                }
            } catch (err) {
                console.error("Search customer error:", err);
                // Không hiển thị lỗi, chỉ log
            } finally {
                setSearchingCustomer(false);
            }
        }, 1000); // Debounce 1 giây

        return () => clearTimeout(timeoutId);
    }, [phone, loadRecentBookingSuggestion, push]);

    /* --- helpers nhỏ --- */
    const numOnly = (s) => s.replace(/[^0-9]/g, "");

    const onChangePax = (v) => {
        setPaxCount(Number(numOnly(v)) || 0);
    };
    const decrementPax = () => {
        setPaxCount((prev) => Math.max(1, prev - 1));
    };

    const incrementPax = () => {
        if (totalSeats > 0) {
            setPaxCount((prev) => Math.min(totalSeats, prev + 1));
            return;
        }
        setPaxCount((prev) => prev + 1);
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

    // Validation: ONE_WAY không cần endTime
    const needsEndTime = hireType !== "ONE_WAY";

    // Validate thời gian: endTime phải > startTime
    const isTimeValid = React.useMemo(() => {
        if (!startTime) return true; // Chưa nhập startTime thì chưa cần validate
        if (!needsEndTime || !endTime) return true; // ONE_WAY hoặc chưa nhập endTime

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        return endDate > startDate;
    }, [startTime, endTime, needsEndTime]);

    const isValidCore =
        phone &&
        customerName &&
        pickup &&
        dropoff &&
        startTime &&
        (needsEndTime ? endTime : true) &&
        isTimeValid && // Thêm validation thời gian
        !timeError && // Không có lỗi thời gian
        categoryId &&
        branchId &&
        quotedPrice > 0;

    /* --- handlers --- */
    const saveDraft = async () => {
        // Check if branch is still loading
        if (loadingBranch) {
            push("Đang tải thông tin chi nhánh, vui lòng đợi...", "info");
            return;
        }

        if (!isValidCore) {
            push(
                "Thiếu dữ liệu bắt buộc (SĐT / Tên KH / Điểm đi / Điểm đến / Chi nhánh / Giá báo khách...)",
                "error"
            );
            return;
        }

        if (!branchId || branchId === "" || branchId === "0") {
            console.error("❌ BranchId is invalid:", branchId);
            push("Không tìm thấy chi nhánh. Vui lòng tải lại trang hoặc liên hệ quản trị viên.", "error");
            return;
        }

        // Validate time
        if (startTime) {
            const startDate = new Date(startTime);
            const now = new Date();

            // Check if start time is in the past
            if (startDate < now) {
                push("Thời gian đi phải lớn hơn thời gian hiện tại", "error");
                return;
            }

            // Check max 6 months in the future
            const sixMonthsLater = new Date();
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            if (startDate > sixMonthsLater) {
                push("Thời gian đi không được quá 6 tháng tính từ hiện tại", "error");
                return;
            }

            // Validate endTime nếu không phải ONE_WAY
            if (hireType !== "ONE_WAY" && endTime) {
                const endDate = new Date(endTime);

                // Check if end time is after start time
                if (endDate <= startDate) {
                    setTimeError("Thời gian về phải sau thời gian đi");
                    push("Thời gian về phải sau thời gian đi", "error");
                    return;
                } else {
                    setTimeError(""); // Clear error nếu hợp lệ
                }

                // Check minimum duration based on hire type
                const durationHours = (endDate - startDate) / (1000 * 60 * 60);
                let minDuration = 2; // Minimum 2 hours for round trip

                if (hireType === "DAILY" || hireType === "MULTI_DAY") {
                    minDuration = 8; // Minimum 8 hours for daily hire
                }

                if (durationHours < minDuration) {
                    const hireTypeLabel = hireType === "ROUND_TRIP" ? "hai chiều" : "theo ngày";
                    push(`Thời gian thuê ${hireTypeLabel} tối thiểu ${minDuration} giờ`, "error");
                    return;
                }
            }
        }

        setLoadingDraft(true);
        try {
            const sStart = toIsoZ(startTime);
            // ONE_WAY: endTime = startTime + 2 giờ (mặc định)
            const sEnd = hireType === "ONE_WAY" && !endTime
                ? toIsoZ(new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString())
                : toIsoZ(endTime);

            if (!sStart) {
                push("Thời gian đi không hợp lệ", "error");
                return;
            }

            const req = {
                customer: { fullName: customerName, phone, email },
                branchId: Number(branchId),
                hireTypeId: hireTypeId ? Number(hireTypeId) : null,
                useHighway: false,
                isHoliday: isHoliday,
                isWeekend: isWeekend,
                note: bookingNote || null,
                trips: [
                    { startLocation: pickup, endLocation: dropoff, startTime: sStart, endTime: sEnd },
                ],
                vehicles: vehicleSelections
                    .filter(v => v.categoryId)
                    .map(v => ({ vehicleCategoryId: Number(v.categoryId), quantity: Number(v.quantity || 1) })),
                estimatedCost: Number(estPriceSys || 0),
                discountAmount: Number(discount || 0),
                totalCost: Number(quotedPrice || 0),
                depositAmount: 0,
                status: "DRAFT",
                distance: Number(distanceKm || 0),
            };

            console.log("📤 Creating booking (draft) - STATUS:", req.status);
            console.log("📤 Full request payload:", req);
            const created = await createBooking(req);
            console.log("✅ Draft created response:", created);

            // Handle different response formats
            const bookingId = created?.id || created?.data?.id || created?.bookingId;

            if (bookingId) {
                push(`✓ Đã lưu nháp đơn hàng #${bookingId} - Đang chuyển đến trang chi tiết...`, "success", 3000);
                setTimeout(() => {
                    navigate(`/orders/${bookingId}`);
                }, 500);
            } else {
                push("Đã lưu nháp thành công", "success");
                navigate("/orders");
            }
        } catch (err) {
            console.error("❌ Save draft error:", err);
            push("Lưu nháp thất bại: " + (err.message || "Lỗi không xác định"), "error");
        } finally {
            setLoadingDraft(false);
        }
    };

    const submitOrder = async () => {
        // Check if branch is still loading
        if (loadingBranch) {
            push("Đang tải thông tin chi nhánh, vui lòng đợi...", "info");
            return;
        }

        if (!isValidCore) {
            push(
                "Thiếu dữ liệu bắt buộc. Kiểm tra lại thông tin.",
                "error"
            );
            return;
        }

        if (!branchId || branchId === "" || branchId === "0") {
            console.error("❌ BranchId is invalid:", branchId);
            push("Không tìm thấy chi nhánh. Vui lòng tải lại trang hoặc liên hệ quản trị viên.", "error");
            return;
        }

        // Validate time
        if (startTime) {
            const startDate = new Date(startTime);
            const now = new Date();

            // Check if start time is in the past
            if (startDate < now) {
                push("Thời gian đi phải lớn hơn thời gian hiện tại", "error");
                return;
            }

            // Check max 6 months in the future
            const sixMonthsLater = new Date();
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            if (startDate > sixMonthsLater) {
                push("Thời gian đi không được quá 6 tháng tính từ hiện tại", "error");
                return;
            }

            // Validate endTime nếu không phải ONE_WAY
            if (hireType !== "ONE_WAY" && endTime) {
                const endDate = new Date(endTime);

                // Check if end time is after start time
                if (endDate <= startDate) {
                    setTimeError("Thời gian về phải sau thời gian đi");
                    push("Thời gian về phải sau thời gian đi", "error");
                    return;
                } else {
                    setTimeError(""); // Clear error nếu hợp lệ
                }

                // Check minimum duration based on hire type
                const durationHours = (endDate - startDate) / (1000 * 60 * 60);
                let minDuration = 2; // Minimum 2 hours for round trip

                if (hireType === "DAILY" || hireType === "MULTI_DAY") {
                    minDuration = 8; // Minimum 8 hours for daily hire
                }

                if (durationHours < minDuration) {
                    const hireTypeLabel = hireType === "ROUND_TRIP" ? "hai chiều" : "theo ngày";
                    push(`Thời gian thuê ${hireTypeLabel} tối thiểu ${minDuration} giờ`, "error");
                    return;
                }
            }
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
            // ONE_WAY: endTime = startTime + 2 giờ (mặc định)
            const sEnd = hireType === "ONE_WAY" && !endTime
                ? toIsoZ(new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString())
                : toIsoZ(endTime);

            if (!sStart) {
                push("Thời gian đi không hợp lệ", "error");
                return;
            }

            const req = {
                customer: { fullName: customerName, phone, email },
                branchId: Number(branchId),
                hireTypeId: hireTypeId ? Number(hireTypeId) : null,
                useHighway: false,
                isHoliday: isHoliday,
                isWeekend: isWeekend,
                note: bookingNote || null,
                trips: [
                    { startLocation: pickup, endLocation: dropoff, startTime: sStart, endTime: sEnd },
                ],
                vehicles: vehicleSelections
                    .filter(v => v.categoryId)
                    .map(v => ({ vehicleCategoryId: Number(v.categoryId), quantity: Number(v.quantity || 1) })),
                estimatedCost: Number(estPriceSys || 0),
                discountAmount: Number(discount || 0),
                totalCost: Number(quotedPrice || 0),
                depositAmount: 0,
                status: "PENDING",
                distance: Number(distanceKm || 0),
            };

            console.log("📤 Creating booking:", req);
            const created = await createBooking(req);
            console.log("✅ Booking created response:", created);

            // Handle different response formats
            const bookingId = created?.id || created?.data?.id || created?.bookingId;

            if (bookingId) {
                push(`✓ Đã tạo đơn hàng #${bookingId} - Đang chuyển đến trang chi tiết...`, "success", 3000);
                // Chuyển đến trang chi tiết để tạo request đặt cọc
                setTimeout(() => {
                    navigate(`/orders/${bookingId}`);
                }, 500);
            } else {
                push("Đã tạo đơn hàng thành công", "success");
                navigate("/orders");
            }
        } catch (err) {
            console.error("❌ Submit order error:", err);
            push("Tạo đơn hàng thất bại: " + (err.message || "Lỗi không xác định"), "error");
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

            {/* DEBUG PANEL - Remove this after testing */}
            {/* {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                    <div className="font-bold mb-2">🔍 Debug Info:</div>
                    <div>loadingBranch: {String(loadingBranch)}</div>
                    <div>isAdmin: {String(isAdmin)}</div>
                    <div>branchId: {branchId || 'empty'}</div>
                    <div>branchName: {branchName || 'empty'}</div>
                    <div>availableBranches: {availableBranches.length} items</div>
                    <div>roleName: {localStorage.getItem("roleName") || 'not set'}</div>
                </div>
            )} */}

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="text-[20px] font-semibold text-slate-900 flex items-center gap-2">
                            <CarFront className="h-6 w-6 text-sky-600" />
                            <span>Tạo đơn hàng mới</span>
                        </div>

                        {/* Branch Display/Selection */}
                        {loadingBranch ? (
                            <span className="rounded-md border border-slate-300 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium flex items-center gap-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                                Đang tải chi nhánh...
                            </span>
                        ) : isAdmin ? (
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-slate-500" />
                                <select
                                    value={branchId}
                                    onChange={(e) => {
                                        const selectedBranch = availableBranches.find(
                                            b => String(b.branchId) === e.target.value
                                        );
                                        setBranchId(e.target.value);
                                        if (selectedBranch) {
                                            setBranchName(selectedBranch.branchName);
                                        }
                                    }}
                                    className="rounded-md border border-slate-300 bg-white text-[13px] px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                >
                                    {availableBranches.map((branch) => (
                                        <option key={branch.branchId} value={String(branch.branchId)}>
                                            {branch.branchName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <span className="rounded-md border border-slate-300 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                Chi nhánh:{" "}
                                <span className="text-slate-900 font-semibold">
                                    {branchName || branchId}
                                </span>
                            </span>
                        )}
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
                        disabled={loadingDraft || loadingBranch || !branchId}
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
                        disabled={loadingSubmit || loadingBranch || !branchId || (availabilityInfo && !availabilityInfo.ok)}
                        type="button"
                        className={cls(
                            "rounded-md font-medium text-[13px] px-4 py-2 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                            availabilityInfo && !availabilityInfo.ok
                                ? "bg-slate-400 text-white cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                        title={availabilityInfo && !availabilityInfo.ok ? "Không thể đặt đơn: Hết xe trong khung giờ này" : "Đặt đơn hàng"}
                    >
                        {loadingSubmit ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Send className="h-4 w-4 text-white" />
                        )}
                        <span>{availabilityInfo && !availabilityInfo.ok ? "Hết xe" : "Đặt đơn"}</span>
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

                        {/* Các tùy chọn phụ phí */}
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                            <div className="text-[12px] text-slate-600 mb-2 font-medium">
                                Tùy chọn phụ phí
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {/* Ngày lễ */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isHoliday}
                                        onChange={(e) => setIsHoliday(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-[13px] text-slate-700">
                                        Ngày lễ (+25%)
                                    </span>
                                </label>

                                {/* Cuối tuần - có thể chỉnh sửa */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isWeekend}
                                        onChange={(e) => setIsWeekend(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-[13px] text-slate-700">
                                        Cuối tuần (+20%)
                                    </span>
                                </label>
                            </div>
                            <div className="text-[11px] text-slate-500">
                                * Cuối tuần tự động bật khi đặt chuyến T7/CN. Có thể tắt thủ công nếu cần (VD: đi 2 lượt qua 2 ngày).
                            </div>
                        </div>
                    </section>

                    {/* Phần NOTE cho tài xế */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-900 text-[14px] font-semibold mb-4">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span>Ghi chú cho tài xế</span>
                        </div>
                        <textarea
                            value={bookingNote}
                            onChange={(e) => setBookingNote(e.target.value)}
                            rows={3}
                            className={cls(inputCls, "resize-none")}
                            placeholder="VD: Đón thêm 1 khách ở 123 Trần Hưng Đạo lúc 8h30, hành lý cồng kềnh cần xe có cốp rộng..."
                        />
                        <div className="text-[11px] text-slate-500 mt-2">
                            Ghi chú này sẽ hiển thị cho tài xế trong chi tiết chuyến đi.
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
                                    {calculatingDistance && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 ml-1" />
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={distanceKm}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === "" || raw === null) {
                                            setDistanceKm("");
                                            return;
                                        }
                                        const numberValue = Number(raw);
                                        if (Number.isNaN(numberValue)) {
                                            setDistanceKm(raw);
                                            return;
                                        }
                                        setDistanceKm(numberValue.toFixed(2));
                                    }}
                                    className={cls(inputCls, "tabular-nums")}
                                    placeholder={calculatingDistance ? "Đang tính..." : "Tự động tính hoặc nhập thủ công"}
                                    disabled={calculatingDistance}
                                />
                                {distanceError && (
                                    <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {distanceError}
                                    </div>
                                )}
                                {!calculatingDistance && !distanceError && distanceKm && (
                                    <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                                        <Navigation className="h-3 w-3" />
                                        Đã tự động lựa chọn tuyến đường tốt nhất !
                                    </div>
                                )}
                            </div>

                            {/* Giảm giá */}
                            <div className="md:col-span-1">
                                <div className={labelCls}>
                                    <Percent className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Giảm giá (%)</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={discountPercent === 0 ? "" : discountPercent}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        // Nếu input rỗng, set về 0
                                        if (inputValue === "" || inputValue === null || inputValue === undefined) {
                                            setDiscountPercent(0);
                                            return;
                                        }
                                        // Loại bỏ số 0 đầu tiên không cần thiết (ví dụ: "010" -> "10")
                                        const cleanedValue = inputValue.replace(/^0+/, "") || "0";
                                        const value = parseFloat(cleanedValue) || 0;
                                        const clampedValue = Math.min(100, Math.max(0, value));
                                        setDiscountPercent(clampedValue);
                                    }}
                                    onBlur={(e) => {
                                        // Khi blur, nếu giá trị rỗng thì set về 0
                                        if (e.target.value === "" || e.target.value === null) {
                                            setDiscountPercent(0);
                                        }
                                    }}
                                    className={cls(
                                        inputCls,
                                        "tabular-nums"
                                    )}
                                    placeholder="0"
                                />
                                <div className="text-[11px] text-slate-500 mt-1">
                                    Số tiền giảm: <span className="font-semibold text-amber-600">{fmtVND(discount)} đ</span>
                                </div>
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
                                    onChange={(e) => {
                                        setQuotedPriceTouched(true);
                                        setQuotedPrice(
                                            Number(
                                                numOnly(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            ) || 0
                                        );
                                    }}
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
                                <PlaceAutocomplete
                                    value={pickup}
                                    onChange={setPickup}
                                    placeholder="VD: Hồ Hoàn Kiếm, Sân bay Nội Bài..."
                                    className={inputCls}
                                />
                                {/* <div className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                                    <span>✅</span>
                                    <span>Gõ tiếng Việt được! Chọn từ gợi ý để tự động tính khoảng cách</span>
                                </div> */}
                            </div>

                            {/* Điểm đến */}
                            <div>
                                <div className={labelCls}>
                                    <MapPin className="h-3.5 w-3.5 text-rose-600" />
                                    <span>
                                        Điểm đến *
                                    </span>
                                </div>
                                <PlaceAutocomplete
                                    value={dropoff}
                                    onChange={setDropoff}
                                    placeholder="VD: Trung tâm Hà Nội, Phố cổ..."
                                    className={inputCls}
                                />
                                {/* <div className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                                    <span>✅</span>
                                    <span>Chọn địa chỉ từ dropdown để đảm bảo chính xác</span>
                                </div> */}
                            </div>

                            {/* Thời gian đón / Ngày bắt đầu */}
                            <div>
                                <div className={labelCls}>
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                        {hireType === "DAILY" || hireType === "MULTI_DAY"
                                            ? "Ngày bắt đầu *"
                                            : "Thời gian đi *"}
                                    </span>
                                </div>
                                <input
                                    type={hireType === "DAILY" || hireType === "MULTI_DAY" ? "date" : "datetime-local"}
                                    value={startTime}
                                    onChange={(e) => {
                                        const newStartTime = e.target.value;
                                        setStartTime(newStartTime);

                                        // Validate real-time: nếu đã có endTime, kiểm tra endTime > startTime
                                        if (newStartTime && endTime && hireType !== "ONE_WAY") {
                                            const startDate = new Date(newStartTime);
                                            const endDate = new Date(endTime);
                                            if (endDate <= startDate) {
                                                setTimeError("Thời gian về phải sau thời gian đi");
                                            } else {
                                                setTimeError("");
                                            }
                                        } else {
                                            setTimeError("");
                                        }
                                    }}
                                    className={cls(
                                        inputCls,
                                        timeError && "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {timeError && (
                                    <div className="text-[12px] text-red-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span>{timeError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Kết thúc dự kiến / Ngày kết thúc - Ẩn với ONE_WAY */}
                            {hireType !== "ONE_WAY" && (
                                <div>
                                    <div className={labelCls}>
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <span>
                                            {hireType === "DAILY" || hireType === "MULTI_DAY"
                                                ? "Ngày kết thúc *"
                                                : "Thời gian về *"}
                                        </span>
                                    </div>
                                    <input
                                        type={hireType === "DAILY" || hireType === "MULTI_DAY" ? "date" : "datetime-local"}
                                        value={endTime}
                                        onChange={(e) => {
                                            const newEndTime = e.target.value;
                                            setEndTime(newEndTime);

                                            // Validate real-time: endTime phải > startTime
                                            if (newEndTime && startTime) {
                                                const startDate = new Date(startTime);
                                                const endDate = new Date(newEndTime);
                                                if (endDate <= startDate) {
                                                    setTimeError("Thời gian về phải sau thời gian đi");
                                                } else {
                                                    setTimeError("");
                                                }
                                            } else {
                                                setTimeError("");
                                            }
                                        }}
                                        className={cls(
                                            inputCls,
                                            timeError && "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                        )}
                                    />
                                    {timeError && (
                                        <div className="text-[12px] text-red-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            <span>{timeError}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loại xe - Hỗ trợ nhiều loại */}
                            <div className="col-span-full">
                                <div className={labelCls}>
                                    <CarFront className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Loại xe yêu cầu *</span>
                                </div>

                                <div className="space-y-2 mt-1">
                                    {vehicleSelections.map((selection, index) => {
                                        const cat = categories.find(c => c.id === selection.categoryId);
                                        // Kiểm tra loại xe này có hết không (từ availabilityInfo.results)
                                        const thisVehicleResult = availabilityInfo?.results?.find(r => r.categoryId === selection.categoryId);
                                        const isOutOfStock = thisVehicleResult && !thisVehicleResult.ok;

                                        return (
                                            <div key={index} className={cls(
                                                "p-2 rounded-lg border",
                                                isOutOfStock
                                                    ? "bg-red-50 border-red-300"
                                                    : "bg-slate-50 border-slate-200"
                                            )}>
                                                {/* Row 1: Select + Số lượng + Số chỗ + Nút xóa */}
                                                <div className="flex items-center gap-2">
                                                    {/* Select loại xe */}
                                                    <select
                                                        value={selection.categoryId}
                                                        onChange={(e) => updateVehicleSelection(index, 'categoryId', e.target.value)}
                                                        className={cls(
                                                            "flex-1 border rounded-md px-3 py-2 text-[13px] shadow-sm outline-none focus:ring-2",
                                                            isOutOfStock
                                                                ? "bg-red-50 border-red-300 text-red-700 focus:ring-red-200"
                                                                : "bg-white border-slate-300 text-slate-900 focus:ring-[#0079BC]/20"
                                                        )}
                                                    >
                                                        <option value="">-- Chọn loại xe --</option>
                                                        {categories.map((c) => {
                                                            // Disable nếu loại xe này đã được chọn ở selection khác
                                                            const isAlreadySelected = vehicleSelections.some((v, i) =>
                                                                i !== index && v.categoryId === c.id
                                                            );
                                                            // Kiểm tra loại xe này có hết không
                                                            const catResult = availabilityInfo?.results?.find(r => r.categoryId === c.id);
                                                            const catOutOfStock = catResult && !catResult.ok;

                                                            return (
                                                                <option
                                                                    key={c.id}
                                                                    value={c.id}
                                                                    disabled={isAlreadySelected}
                                                                    className={catOutOfStock ? "text-red-600" : ""}
                                                                >
                                                                    {c.name} ({c.seats} chỗ) {isAlreadySelected ? '(đã chọn)' : ''}{catOutOfStock ? ' ⚠️ HẾT XE' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>

                                                    {/* Số lượng */}
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[12px] text-slate-500 whitespace-nowrap">SL:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateVehicleSelection(index, 'quantity', Math.max(1, selection.quantity - 1))}
                                                            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                                                            disabled={selection.quantity <= 1}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <span className="w-8 text-center text-[13px] font-medium">{selection.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateVehicleSelection(index, 'quantity', selection.quantity + 1)}
                                                            className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    {/* Hiện số chỗ */}
                                                    {cat && (
                                                        <span className={cls(
                                                            "text-[11px] whitespace-nowrap",
                                                            isOutOfStock ? "text-red-600 font-medium" : "text-slate-500"
                                                        )}>
                                                            = {cat.seats * selection.quantity} chỗ
                                                        </span>
                                                    )}

                                                    {/* Nút xóa */}
                                                    {vehicleSelections.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVehicleSelection(index)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            title="Xóa loại xe này"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Row 2: Badge hết xe (nếu có) */}
                                                {isOutOfStock && (
                                                    <div className="mt-2 flex items-center">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-100 text-red-700 border border-red-200">
                                                            <CarFront className="h-3.5 w-3.5" />
                                                            {cat?.name}: Hết xe ({thisVehicleResult?.busyCount || 0}/{thisVehicleResult?.totalCandidates || 0} đang bận) ({thisVehicleResult?.availableCount || 0} xe)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Nút thêm loại xe */}
                                    {vehicleSelections.length < 5 && categories.length > vehicleSelections.length && (
                                        <button
                                            type="button"
                                            onClick={addVehicleSelection}
                                            className="flex items-center gap-1 px-3 py-2 text-[12px] text-emerald-600 hover:bg-emerald-50 rounded-md border border-dashed border-emerald-300 w-full justify-center"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Thêm loại xe khác
                                        </button>
                                    )}
                                </div>

                                {/* Tổng số chỗ */}
                                <div className="mt-2 flex items-center justify-between text-[12px]">
                                    <span className="text-slate-500">
                                        Tổng: <span className="font-semibold text-slate-700">{totalSeats} chỗ</span>
                                        {vehicleSelections.length > 1 && (
                                            <span className="ml-1">
                                                ({vehicleSelections.filter(v => v.categoryId).map(v => {
                                                const c = categories.find(cat => cat.id === v.categoryId);
                                                return c ? `${v.quantity}×${c.seats}` : '';
                                            }).filter(Boolean).join(' + ')})
                                            </span>
                                        )}
                                    </span>

                                    {checkingAvail ? (
                                        <span className="inline-flex items-center gap-1 text-slate-500">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                            Đang kiểm tra...
                                        </span>
                                    ) : (
                                        <AvailabilityBadge info={availabilityInfo} />
                                    )}
                                </div>
                            </div>

                            {/* Số khách / Số xe */}
                            {/* Số khách */}
                            <div>
                                <div className={labelCls}>
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Số khách</span>
                                    {totalSeats > 0 && (
                                        <span className="text-[11px] text-slate-500 font-normal">
                                            (Tối đa: {totalSeats})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={decrementPax}
                                        disabled={paxCount <= 1}
                                        className={cls(
                                            "px-2 py-2 rounded-l-md border border-slate-300 bg-white hover:bg-slate-50 transition-colors",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                            "focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20"
                                        )}
                                    >
                                        <Minus className="h-4 w-4 text-slate-600" />
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalSeats > 0 ? totalSeats : undefined}
                                        value={paxCount}
                                        onChange={(e) => onChangePax(e.target.value)}
                                        className={cls(
                                            inputCls,
                                            "tabular-nums rounded-none border-x-0 text-center"
                                        )}
                                        placeholder="1"
                                    />
                                    <button
                                        type="button"
                                        onClick={incrementPax}
                                        disabled={totalSeats > 0 && paxCount >= totalSeats}
                                        className={cls(
                                            "px-2 py-2 rounded-r-md border border-slate-300 bg-white hover:bg-slate-50 transition-colors",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                            "focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20"
                                        )}
                                    >
                                        <Plus className="h-4 w-4 text-slate-600" />
                                    </button>
                                </div>
                                {totalSeats > 0 && paxCount > totalSeats && (
                                    <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Số khách vượt quá tổng số chỗ ({totalSeats} chỗ)
                                    </div>
                                )}
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
                        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>
                                    Không đủ xe {selectedCategory?.name || "loại này"} cho khung giờ này
                                    {(availabilityInfo.alternativeCategories?.length > 0 || availabilityInfo.nextAvailableSlots?.length > 0) && (
                                        <span className="text-amber-600"> - có gợi ý thay thế!</span>
                                    )}
                                </span>
                            </div>
                            {(availabilityInfo.alternativeCategories?.length > 0 || availabilityInfo.nextAvailableSlots?.length > 0) && (
                                <button
                                    type="button"
                                    onClick={() => setShowSuggestionDialog(true)}
                                    className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Xem gợi ý
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* FOOTER NOTE */}
            {/* <div className="text-[11px] text-slate-500 mt-8 leading-relaxed">
                ...
            </div> */}

            {recentBookingSuggestion && showPrefillDialog && (
                <AnimatedDialog
                    open={showPrefillDialog}
                    onClose={() => setShowPrefillDialog(false)}
                    size="lg"
                >
                    <div className="p-6 space-y-5">
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
                                <History className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                    Khách quen vừa được nhận diện
                                </p>
                                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    {recentBookingSuggestion.customerName || "Khách hàng cũ"}
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Hệ thống tìm thấy đơn gần nhất của khách này. Bạn có muốn tự động điền lại theo lịch sử để tiết kiệm thời gian không?
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500 mb-1">Hành trình</p>
                                <p className="font-semibold text-slate-900">
                                    {recentBookingSuggestion.routeSummary || "Chưa có mô tả"}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Thời gian dự kiến</p>
                                <p className="font-semibold text-slate-900">
                                    {formatReadableDateTime(recentBookingSuggestion.startDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Giá báo khách</p>
                                <p className="font-semibold text-emerald-600">
                                    {fmtVND(recentBookingSuggestion.totalCost)} đ
                                </p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 bg-white flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-sky-500" />
                            Bạn có thể chỉnh lại sau khi hệ thống tự động điền thông tin từ đơn #{recentBookingSuggestion.id}.
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPrefillDialog(false)}
                                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium bg-white hover:bg-slate-50 transition-colors"
                            >
                                Để sau
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyRecentBooking}
                                disabled={prefillLoading}
                                className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {prefillLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Tự động điền ngay
                            </button>
                        </div>
                    </div>
                </AnimatedDialog>
            )}

            {/* Popup gợi ý xe thay thế */}
            {availabilityInfo && !availabilityInfo.ok && showSuggestionDialog && (
                <AnimatedDialog
                    open={showSuggestionDialog}
                    onClose={() => setShowSuggestionDialog(false)}
                    size="md"
                >
                    <div className="p-6 space-y-5">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 flex items-center justify-center shadow-inner">
                                <AlertTriangle className="h-7 w-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    Không đủ xe khả dụng
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Cần <span className="font-medium text-slate-700">{availabilityInfo.needed}</span> xe {selectedCategory?.name || ""},
                                    hiện chỉ còn <span className="font-medium text-amber-600">{availabilityInfo.count}</span> xe rảnh.
                                    Vui lòng chọn một trong các gợi ý bên dưới.
                                </p>
                            </div>
                        </div>

                        {/* Gợi ý xe thay thế */}
                        {availabilityInfo.alternativeCategories && availabilityInfo.alternativeCategories.length > 0 && (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <CarFront className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-emerald-800">Loại xe thay thế</h4>
                                        <p className="text-[11px] text-emerald-600">Các loại xe khác có sẵn trong cùng khung giờ</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {availabilityInfo.alternativeCategories
                                        // Ẩn các loại xe đã được chọn trong form (tránh gợi ý trùng)
                                        .filter(
                                            (alt) =>
                                                !vehicleSelections.some(
                                                    (v) =>
                                                        String(v.categoryId) ===
                                                        String(alt.categoryId)
                                                )
                                        )
                                        .map((alt) => (
                                            <button
                                                key={alt.categoryId}
                                                type="button"
                                                onClick={() => {
                                                    // Tìm index của loại xe bị hết để thay thế
                                                    const failedIndex = vehicleSelections.findIndex(
                                                        v => v.categoryId === availabilityInfo.failedCategoryId
                                                    );
                                                    if (failedIndex >= 0) {
                                                        updateVehicleSelection(failedIndex, 'categoryId', String(alt.categoryId));
                                                    } else {
                                                        // Nếu không tìm thấy, cập nhật xe đầu tiên
                                                        updateVehicleSelection(0, 'categoryId', String(alt.categoryId));
                                                    }
                                                    setShowSuggestionDialog(false);
                                                    push(`Đã chọn ${alt.categoryName}`, "success");
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-slate-700 transition-all flex items-center justify-between group shadow-sm hover:shadow"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                                        <CarFront className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{alt.categoryName}</div>
                                                        <div className="text-[11px] text-slate-500">{alt.seats} chỗ ngồi • {alt.pricePerKm?.toLocaleString("vi-VN")}đ/km</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                                                    {alt.availableCount} xe rảnh
                                                </span>
                                                    <ArrowRight className="h-4 w-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Gợi ý thời gian khác */}
                        {availabilityInfo.nextAvailableSlots && availabilityInfo.nextAvailableSlots.length > 0 && (
                            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-sky-800">Thời gian khác</h4>
                                        <p className="text-[11px] text-sky-600">Xe {selectedCategory?.name || ""} sẽ rảnh vào các khung giờ sau</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {availabilityInfo.nextAvailableSlots.map((slot, idx) => {
                                        const fromDate = new Date(slot.availableFrom);
                                        const formattedTime = fromDate.toLocaleString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        });
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    // Chuyển sang local time phù hợp với input
                                                    const local = new Date(fromDate.getTime() - fromDate.getTimezoneOffset() * 60000);
                                                    if (hireType === "DAILY" || hireType === "MULTI_DAY") {
                                                        // Input dạng date: yyyy-MM-dd
                                                        const newDate = local.toISOString().slice(0, 10);
                                                        setStartTime(newDate);
                                                    } else {
                                                        // datetime-local: yyyy-MM-ddTHH:mm
                                                        const newStart = local.toISOString().slice(0, 16);
                                                        setStartTime(newStart);
                                                    }
                                                    setShowSuggestionDialog(false);
                                                    push(`Đã đổi giờ đón sang ${formattedTime}`, "success");
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 hover:border-sky-400 text-slate-700 transition-all flex items-center justify-between group shadow-sm hover:shadow"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                                                        <Calendar className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{formattedTime}</div>
                                                        {slot.vehicleLicensePlate && (
                                                            <div className="text-[11px] text-slate-500">Xe {slot.vehicleLicensePlate}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-medium">
                                                        {slot.availableCount} xe
                                                    </span>
                                                    <ArrowRight className="h-4 w-4 text-sky-500 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowSuggestionDialog(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </AnimatedDialog>
            )}
        </div>
    );
}
