import React from "react";
import {
    UserRound,
    Car,
    CalendarDays,
    Building2,
    Sparkles,
    BadgeCheck,
    AlertTriangle,
    X,
    Check,
    Loader2,
} from "lucide-react";
import { getAssignmentSuggestions, assignTrips, reassignTrips } from "../../api/dispatch";

/**
 * AssignDriverDialog – M5.S3 (Popup/Subscreen) – LIGHT THEME VERSION
 *
 * Chức năng:
 *  - Mở khi bấm "Gán chuyến" từ M5.S1
 *  - Tóm tắt yêu cầu (thời gian, loại xe, chi nhánh)
 *  - Lấy gợi ý tài xế + xe
 *      GET /api/v1/coordinator/orders/{orderId}/suggestions
 *      -> [{ driver, vehicle, score, reasons[] }]
 *  - Tự động gán
 *      POST /api/v1/coordinator/orders/{orderId}/assign { auto: true }
 *  - Chọn thủ công
 *      POST /api/v1/coordinator/orders/{orderId}/assign { driver_id, vehicle_id }
 *
 * Props:
 *  - open: boolean
 *  - order: { id, code?, pickup_time, vehicle_type?, branch_name? }
 *  - onClose: () => void
 *  - onAssigned?: (payload) => void
 */

// Endpoints đã được chuyển sang sử dụng API functions từ dispatch.js

export default function AssignDriverDialog({
                                               open,
                                               order,
                                               onClose,
                                               onAssigned,
                                           }) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [suggestions, setSuggestions] = React.useState([]); // [{driver, vehicle, score, reasons[]}]
    const [driverCandidates, setDriverCandidates] = React.useState([]);
    const [vehicleCandidates, setVehicleCandidates] = React.useState([]);
    const [summary, setSummary] = React.useState(null);
    const [driverId, setDriverId] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");

    const [posting, setPosting] = React.useState(false);
    const [autoPosting, setAutoPosting] =
        React.useState(false);

    // Lấy tripId: ưu tiên order.tripId, nếu không có thì lấy từ tripIds[0], cuối cùng mới fallback về order.id
    const tripId = order?.tripId || (Array.isArray(order?.tripIds) && order.tripIds.length > 0 ? order.tripIds[0] : null) || order?.id;
    const tripIds = order?.tripIds; // Danh sách trips nếu có nhiều xe (chưa gán)
    const bookingId = order?.bookingId;
    const vehicleCount = order?.vehicle_count || 1; // Số lượng xe trong booking
    const hasMixedVehicleCategories = !!order?.hasMixedVehicleCategories;

    // Thông tin tài xế / xe hiện tại (nếu đang ở chế độ reassign)
    const currentDriverId = order?.driverId ? Number(order.driverId) : null;
    const currentVehicleId = order?.vehicleId ? Number(order.vehicleId) : null;

    // Tính số trips chưa gán (nếu có nhiều xe)
    const [unassignedTripCount, setUnassignedTripCount] = React.useState(0);
    // Nếu đơn có nhiều loại xe khác nhau -> mặc định KHÔNG gán cho tất cả để tránh sai loại xe
    const [assignToAllTrips, setAssignToAllTrips] = React.useState(!hasMixedVehicleCategories);

    // Multi-assign mode: khi có nhiều trip chưa gán, mỗi trip cần 1 tài xế + 1 xe riêng
    const multiMode = Array.isArray(tripIds) && tripIds.length > 1;
    const rawTripDetails = Array.isArray(order?.trips) ? order.trips : [];
    const multiTripItems = React.useMemo(() => {
        if (rawTripDetails.length > 0) {
            return rawTripDetails
                .map((t, idx) => {
                    const id = t.id || t.tripId;
                    if (!id) return null;
                    const base =
                        t.vehicle_category ||
                        t.vehicleCategory ||
                        `Xe ${idx + 1}`;
                    const route =
                        t.startLocation && t.endLocation
                            ? ` · ${t.startLocation} → ${t.endLocation}`
                            : "";
                    return {
                        tripId: Number(id),
                        label: `${base}${route}`,
                        vehicleCategory: t.vehicle_category || t.vehicleCategory || null,
                    };
                })
                .filter(Boolean);
        }
        if (Array.isArray(tripIds) && tripIds.length > 0) {
            return tripIds.map((id, idx) => {
                // Tìm vehicle_category từ order.trips nếu có
                const tripInfo = rawTripDetails.find(t => (t.id || t.tripId) === id);
                return {
                    tripId: Number(id),
                    label: tripInfo?.vehicle_category
                        ? `${tripInfo.vehicle_category} · Chuyến #${id}`
                        : `Xe ${idx + 1} · Chuyến #${id}`,
                    vehicleCategory: tripInfo?.vehicle_category || tripInfo?.vehicleCategory || null,
                };
            });
        }
        return [];
    }, [rawTripDetails, tripIds]);

    const [multiAssignments, setMultiAssignments] = React.useState([]);
    // Lưu vehicle category và suggestions cho từng trip trong multi-mode
    const [tripVehicleCategories, setTripVehicleCategories] = React.useState({}); // { tripId: vehicleCategory }
    const [tripSuggestions, setTripSuggestions] = React.useState({}); // { tripId: { drivers, vehicles, summary } }

    // Fetch gợi ý khi popup mở
    React.useEffect(() => {
        let cancelled = false;
        async function run() {
            console.log(`[AssignDriverDialog] useEffect triggered:`, {
                open,
                tripId,
                bookingId,
                tripIds: tripIds?.length || 0,
                multiMode,
            });

            if (!open) {
                console.log(`[AssignDriverDialog] Dialog not open, skipping`);
                return;
            }

            if (!tripId) {
                console.warn(`[AssignDriverDialog] No tripId provided!`, { order });
                setError("Không tìm thấy thông tin chuyến đi.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");
            // Cho phép gán chuyến khi booking ở trạng thái:
            // - CONFIRMED: Khách đã xác nhận (đã đặt cọc) - gán mới
            // - INPROGRESS: Đang thực hiện - có thể reassign
            // - COMPLETED: Tạm thời cho phép để test (có thể reassign sau khi hoàn thành)
            const rawStatus = order?.status || "";
            const normalizedStatus = rawStatus.replace(/[_\s]/g, "").toUpperCase();
            const allowedStatuses = ["CONFIRMED", "INPROGRESS", "COMPLETED"]; // Tạm thời thêm COMPLETED để test
            const isAllowed = allowedStatuses.includes(normalizedStatus);

            console.log(`[AssignDriverDialog] Checking booking status:`, {
                rawStatus,
                normalizedStatus,
                allowedStatuses,
                isAllowed,
            });

            if (!isAllowed) {
                console.warn(`[AssignDriverDialog] Booking status "${rawStatus}" (normalized: "${normalizedStatus}") is not in allowed statuses [${allowedStatuses.join(", ")}]. Cannot assign.`);
                setLoading(false);
                if (normalizedStatus === "COMPLETED") {
                    setError("Không thể gán chuyến cho đơn hàng đã hoàn thành.");
                } else if (normalizedStatus === "CANCELLED") {
                    setError("Không thể gán chuyến cho đơn hàng đã hủy.");
                } else {
                    setError("Chỉ được gán chuyến khi đơn hàng ở trạng thái \"Khách đã xác nhận\" (đã đặt cọc) hoặc \"Đang thực hiện\".");
                }
                return;
            }

            console.log(`[AssignDriverDialog] Booking status "${normalizedStatus}" is allowed, proceeding to fetch suggestions...`);
            setDriverId("");
            setVehicleId("");

            // Tính số trips chưa gán từ tripIds (đã được lọc từ OrderDetailPage)
            if (tripIds && tripIds.length > 0) {
                setUnassignedTripCount(tripIds.length);

                if (multiMode) {
                    // Multi-mode: mỗi trip phải gán riêng, không auto "gán cho tất cả"
                    setAssignToAllTrips(false);
                    setMultiAssignments(
                        multiTripItems.map((item) => ({
                            tripId: item.tripId,
                            driverId: "",
                            vehicleId: "",
                        }))
                    );

                    // Gọi API cho từng trip riêng biệt để lấy vehicle category đúng
                    const tripCategories = {};
                    const tripSuggestionsData = {};
                    try {
                        for (const item of multiTripItems) {
                            try {
                                const data = await getAssignmentSuggestions(item.tripId);
                                console.log(`[AssignDriverDialog] Loaded suggestions for trip ${item.tripId}:`, {
                                    drivers: data?.drivers?.length || 0,
                                    vehicles: data?.vehicles?.length || 0,
                                    vehicleType: data?.summary?.vehicleType,
                                });
                                tripCategories[item.tripId] = data?.summary?.vehicleType || null;
                                tripSuggestionsData[item.tripId] = {
                                    drivers: Array.isArray(data?.drivers) ? data.drivers : [],
                                    vehicles: Array.isArray(data?.vehicles) ? data.vehicles : [],
                                    summary: data?.summary || null,
                                };
                            } catch (err) {
                                console.error(`Failed to load suggestions for trip ${item.tripId}:`, err);
                                // Đảm bảo vẫn set data rỗng để tránh fallback về options chung không phù hợp
                                tripCategories[item.tripId] = null;
                                tripSuggestionsData[item.tripId] = {
                                    drivers: [],
                                    vehicles: [],
                                    summary: null,
                                };
                            }
                        }
                        if (!cancelled) {
                            setTripVehicleCategories(tripCategories);
                            setTripSuggestions(tripSuggestionsData);
                            console.log(`[AssignDriverDialog] Set trip suggestions for ${Object.keys(tripSuggestionsData).length} trips`);
                        }
                    } catch (err) {
                        console.error("Failed to load multi-trip suggestions:", err);
                    }
                } else {
                    // Single-mode hoặc chỉ 1 trip: giữ behaviour cũ
                    setAssignToAllTrips(tripIds.length > 1 && !hasMixedVehicleCategories);
                    setMultiAssignments([]);
                }
            } else {
                setUnassignedTripCount(1);
                setAssignToAllTrips(false); // Chỉ gán cho 1 trip
                setMultiAssignments([]);
            }

            // Gọi API cho trip đầu tiên (single-mode hoặc để hiển thị suggestions)
            try {
                const data = await getAssignmentSuggestions(tripId);
                console.log(`[AssignDriverDialog] API response for trip ${tripId}:`, {
                    hasSummary: !!data?.summary,
                    suggestionsCount: data?.suggestions?.length || 0,
                    driversCount: data?.drivers?.length || 0,
                    vehiclesCount: data?.vehicles?.length || 0,
                    eligibleDrivers: data?.drivers?.filter(d => d.eligible)?.length || 0,
                    eligibleVehicles: data?.vehicles?.filter(v => v.eligible)?.length || 0,
                    vehicleType: data?.summary?.vehicleType,
                });

                if (!cancelled) {
                    setSummary(data?.summary || null);
                    setSuggestions(
                        Array.isArray(data?.suggestions)
                            ? data.suggestions
                            : []
                    );
                    const allDrivers = Array.isArray(data?.drivers) ? data.drivers : [];
                    const allVehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];

                    console.log(`[AssignDriverDialog] Setting drivers/vehicles:`, {
                        totalDrivers: allDrivers.length,
                        eligibleDrivers: allDrivers.filter(d => d.eligible).length,
                        totalVehicles: allVehicles.length,
                        eligibleVehicles: allVehicles.filter(v => v.eligible).length,
                    });

                    // Log chi tiết từng driver để debug
                    if (allDrivers.length > 0) {
                        console.log(`[AssignDriverDialog] Driver details:`, allDrivers.map(d => ({
                            id: d.id,
                            name: d.name,
                            eligible: d.eligible,
                            reasons: d.reasons,
                        })));
                    } else {
                        console.warn(`[AssignDriverDialog] No drivers returned from API for trip ${tripId}`);
                    }

                    setDriverCandidates(allDrivers);
                    setVehicleCandidates(allVehicles);

                    // Auto-select recommended (chỉ trong single-mode)
                    if (!multiMode) {
                        if (data?.recommendedDriverId) {
                            setDriverId(String(data.recommendedDriverId));
                        }
                        if (data?.recommendedVehicleId) {
                            setVehicleId(String(data.recommendedVehicleId));
                        }
                    }
                }
            } catch (err) {
                if (cancelled) return;
                console.error(`[AssignDriverDialog] Failed to load suggestions for trip ${tripId}:`, err);
                console.error(`[AssignDriverDialog] Error details:`, {
                    message: err.message,
                    response: err.response,
                    stack: err.stack,
                });
                setError(
                    "Không thể tải gợi ý tài xế/xe: " + (err.message || "Lỗi không xác định")
                );
                setSuggestions([]);
                setDriverCandidates([]);
                setVehicleCandidates([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    console.log(`[AssignDriverDialog] Finished loading suggestions for trip ${tripId}`);
                }
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [open, tripId, order, multiMode, multiTripItems, tripIds]);

    // danh sách tài xế (chỉ eligible, và nếu đang reassign thì loại bỏ tài xế hiện tại)
    const driverOptions = React.useMemo(() => {
        const eligible = driverCandidates.filter(d => d.eligible);
        console.log(`[AssignDriverDialog] driverOptions computed:`, {
            totalCandidates: driverCandidates.length,
            eligibleCount: eligible.length,
            currentDriverId,
        });
        let filtered = eligible;
        if (currentDriverId) {
            filtered = eligible.filter(d => Number(d.id) !== Number(currentDriverId));
            if (eligible.length !== filtered.length) {
                console.log(`[AssignDriverDialog] Filtered out currently assigned driverId=${currentDriverId} from options`);
            }
        }
        if (driverCandidates.length > 0 && filtered.length === 0) {
            console.warn(`[AssignDriverDialog] All ${driverCandidates.length} drivers are not eligible after filtering!`,
                driverCandidates.map(d => ({ id: d.id, name: d.name, eligible: d.eligible, reasons: d.reasons }))
            );
        }
        return filtered;
    }, [driverCandidates, currentDriverId]);

    // Loại xe khách đã đặt (dùng để lọc danh sách xe phù hợp)
    // Ưu tiên lấy từ summary (từ API) vì đã được map đúng cho trip này
    const expectedVehicleType =
        summary?.vehicleType ||
        order?.trip?.vehicle_category ||
        order?.vehicle_type ||
        order?.vehicleType ||
        null;

    // danh sách xe (chỉ eligible & đúng loại xe mà khách đặt, và loại bỏ xe hiện đang gán nếu reassign)
    const vehicleOptions = React.useMemo(() => {
        const base = vehicleCandidates.filter(v => {
            if (!v.eligible) return false;
            if (!expectedVehicleType) return true;
            const vType = v.type || v.categoryName || v.vehicleType || "";
            return vType === expectedVehicleType;
        });
        if (currentVehicleId) {
            const filtered = base.filter(v => Number(v.id) !== Number(currentVehicleId));
            if (base.length !== filtered.length) {
                console.log(`[AssignDriverDialog] Filtered out currently assigned vehicleId=${currentVehicleId} from options`);
            }
            return filtered;
        }
        return base;
    }, [vehicleCandidates, expectedVehicleType, currentVehicleId]);

    // Helper: Lấy vehicle options cho một trip cụ thể trong multi-mode
    const getVehicleOptionsForTrip = React.useCallback((tripId) => {
        if (!multiMode) return vehicleOptions;

        // Lấy vehicle category cho trip này
        const vehicleCategory = tripVehicleCategories[tripId] ||
            (order?.trips?.find(t => (t.id || t.tripId) === tripId)?.vehicle_category);

        // Lấy vehicles từ suggestions của trip này
        const tripData = tripSuggestions[tripId];
        if (tripData && tripData.vehicles) {
            const filtered = tripData.vehicles.filter(v => {
                if (!v.eligible) return false;
                if (!vehicleCategory) return true;
                // So sánh linh hoạt hơn: check cả categoryName và type
                const vType = v.categoryName || v.type || v.vehicleType || "";
                // Nếu vehicleCategory là "Xe 16 chỗ" và vType là "Xe 16 chỗ (Limousine)", vẫn match
                return vType.includes(vehicleCategory) || vehicleCategory.includes(vType) || vType === vehicleCategory;
            });
            console.log(`[AssignDriverDialog] getVehicleOptionsForTrip(${tripId}):`, {
                vehicleCategory,
                totalVehicles: tripData.vehicles.length,
                eligibleVehicles: filtered.length,
            });
            return filtered;
        }

        console.warn(`[AssignDriverDialog] No trip data found for trip ${tripId}, using fallback vehicleOptions`);
        // Fallback: dùng vehicleOptions chung
        return vehicleOptions;
    }, [multiMode, tripVehicleCategories, tripSuggestions, vehicleOptions, order?.trips]);

    // Helper: Lấy driver options cho một trip cụ thể trong multi-mode
    const getDriverOptionsForTrip = React.useCallback((tripId) => {
        if (!multiMode) return driverOptions;

        // Lấy drivers từ suggestions của trip này
        const tripData = tripSuggestions[tripId];
        if (tripData && tripData.drivers) {
            // Filter 1: Chỉ lấy drivers eligible (từ backend)
            let filtered = tripData.drivers.filter(d => d.eligible);

            // Filter 2: Loại bỏ tài xế đã được chọn cho chuyến khác trong cùng popup
            // Rule: Mỗi chuyến trong cùng booking phải có tài xế khác nhau
            const otherSelectedDriverIds = multiAssignments
                .filter(a => a.tripId !== tripId && a.driverId) // Chuyến khác và đã chọn tài xế
                .map(a => String(a.driverId));

            if (otherSelectedDriverIds.length > 0) {
                filtered = filtered.filter(d => !otherSelectedDriverIds.includes(String(d.id)));
            }

            console.log(`[AssignDriverDialog] getDriverOptionsForTrip(${tripId}):`, {
                totalDrivers: tripData.drivers.length,
                eligibleDrivers: tripData.drivers.filter(d => d.eligible).length,
                afterFiltering: filtered.length,
                otherSelectedDriverIds: otherSelectedDriverIds,
            });
            return filtered;
        }

        console.warn(`[AssignDriverDialog] No trip data found for trip ${tripId}, using fallback driverOptions`);
        // Fallback: dùng driverOptions chung
        return driverOptions;
    }, [multiMode, tripSuggestions, driverOptions, multiAssignments]);

    // khi click 1 dòng gợi ý => fill vào dropdown
    const handlePickSuggestion = (s) => {
        setDriverId(
            String(s?.driver?.id || "")
        );
        setVehicleId(
            String(s?.vehicle?.id || "")
        );
    };

    const canConfirm =
        (!multiMode && driverId && vehicleId && !posting) ||
        (multiMode &&
            multiAssignments.length > 0 &&
            multiAssignments.every(
                (a) => a.driverId && a.vehicleId
            ) &&
            !posting);

    // Helper: Trích xuất message lỗi từ response
    const extractErrorMessage = (err) => {
        // Thử lấy message từ các cấu trúc response khác nhau
        const msg = err?.response?.data?.message
            || err?.response?.data?.error
            || err?.message
            || "Lỗi không xác định";
        return msg;
    };

    // Cập nhật lựa chọn cho từng trip trong multi-mode
    const updateMultiAssignment = (tripId, field, value) => {
        setMultiAssignments((prev) =>
            prev.map((a) =>
                a.tripId === tripId
                    ? { ...a, [field]: value }
                    : a
            )
        );
    };

    // Gán thủ công
    const doAssignManual = async () => {
        // Multi-mode: gán đủ tài xế/xe cho từng trip
        if (multiMode) {
            if (!bookingId || multiAssignments.length === 0)
                return;

            // Đảm bảo tất cả trip đều có driver + vehicle
            const invalid = multiAssignments.find(
                (a) => !a.driverId || !a.vehicleId
            );
            if (invalid) {
                setError(
                    "Vui lòng chọn đầy đủ tài xế và xe cho tất cả các chuyến."
                );
                return;
            }

            setPosting(true);
            setError("");
            try {
                for (const a of multiAssignments) {
                    await assignTrips({
                        bookingId: Number(bookingId),
                        tripIds: [Number(a.tripId)],
                        driverId: Number(a.driverId),
                        vehicleId: Number(a.vehicleId),
                        autoAssign: false,
                    });
                }

                onAssigned?.({
                    type: "multi-manual",
                    bookingId,
                    assignments: multiAssignments,
                });
                onClose?.();
            } catch (e) {
                console.error(
                    "❌ Gán nhiều chuyến thất bại:",
                    e
                );
                const errorMsg = extractErrorMessage(e);
                setError(
                    `Gán chuyến thất bại: ${errorMsg}`
                );
            } finally {
                setPosting(false);
            }
            return;
        }

        if (
            !bookingId ||
            !driverId ||
            !vehicleId
        )
            return;
        setPosting(true);
        setError(""); // Clear previous error
        try {
            // Check if trip already has assignment (reassign) hoặc gán mới
            const isReassign = order?.driverId || order?.vehicleId;

            // Xác định trips cần gán
            let targetTripIds = undefined;
            if (!assignToAllTrips && tripId) {
                // Chỉ gán cho 1 trip cụ thể
                targetTripIds = [Number(tripId)];
            } else if (assignToAllTrips && tripIds && tripIds.length > 0) {
                // Gán cho tất cả trips
                targetTripIds = tripIds.map(id => Number(id));
            } else if (tripId) {
                // Fallback: gán cho 1 trip
                targetTripIds = [Number(tripId)];
            }

            if (isReassign && tripId) {
                // Use reassign API - chỉ reassign 1 trip tại một thời điểm
                // QUAN TRỌNG: luôn truyền bookingId để backend không báo lỗi "Mã đơn hàng là bắt buộc"
                const result = await reassignTrips({
                    bookingId: Number(bookingId),
                    tripIds: [Number(tripId)],
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    note: "Reassign từ dialog",
                });

                onAssigned?.({
                    type: "reassign",
                    tripId,
                    bookingId,
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    response: result,
                });
            } else {
                // Use assign API - có thể gán cho nhiều trips
                const result = await assignTrips({
                    bookingId: Number(bookingId),
                    tripIds: targetTripIds, // undefined = gán tất cả, array = gán các trips được chọn
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    autoAssign: false,
                });

                onAssigned?.({
                    type: "manual",
                    tripId: tripId,
                    tripIds: targetTripIds,
                    bookingId,
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    response: result,
                });
            }
            onClose?.();
        } catch (e) {
            console.error("❌ Gán chuyến thất bại:", e);
            const errorMsg = extractErrorMessage(e);
            setError(`Gán chuyến thất bại: ${errorMsg}`);
        } finally {
            setPosting(false);
        }
    };

    // Gán tự động
    const doAssignAuto = async () => {
        if (!bookingId) return;
        setAutoPosting(true);
        setError(""); // Clear previous error
        try {
            // Xác định trips cần gán: nếu có nhiều trips (nhiều xe), gán cho tất cả
            let targetTripIds = undefined;
            if (tripIds && tripIds.length > 0) {
                // Gán cho tất cả trips (nhiều xe)
                targetTripIds = tripIds.map(id => Number(id));
            } else if (tripId) {
                // Chỉ có 1 trip
                targetTripIds = [Number(tripId)];
            }

            const result = await assignTrips({
                bookingId: Number(bookingId),
                tripIds: targetTripIds, // undefined = gán tất cả, array = gán các trips được chọn
                autoAssign: true,
            });

            onAssigned?.({
                type: "auto",
                tripId,
                tripIds: targetTripIds,
                bookingId,
                response: result,
            });
            onClose?.();
        } catch (e) {
            console.error("❌ Tự động gán thất bại:", e);
            const errorMsg = extractErrorMessage(e);
            setError(`Tự động gán thất bại: ${errorMsg}`);
        } finally {
            setAutoPosting(false);
        }
    };

    if (!open) return null;

    /* ================= UI (LIGHT THEME) ================= */
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-2xl"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
                    <Sparkles className="h-5 w-5 text-primary-600" />
                    <div className="font-semibold text-slate-900 text-sm">
                        Gán chuyến (Assign
                        Driver)
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                    >
                        <X className="h-4 w-4" />
                        Đóng
                    </button>
                </div>

                {/* Summary */}
                <div className="px-5 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Thời gian:
                            </span>
                            <span className="font-mono text-slate-900 font-medium">
                                {fmtDateTime(
                                    order?.pickup_time || order?.pickupTime
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Loại xe:
                            </span>
                            <span className="text-slate-900 font-medium">
                                {summary?.vehicleType ||
                                    order?.vehicle_type ||
                                    order?.vehicleType ||
                                    "—"}
                                {/* Chỉ hiển thị số lượng nếu đang gán cho nhiều trips cùng loại xe */}
                                {assignToAllTrips && unassignedTripCount > 1 && !hasMixedVehicleCategories && ` (${unassignedTripCount} xe)`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Chi nhánh:
                            </span>
                            <span className="text-slate-900 font-medium">
                                {order?.branch_name ||
                                    order?.branchName ||
                                    summary?.branchName ||
                                    "—"}
                            </span>
                        </div>
                    </div>

                    {/* Thông báo nếu có nhiều chuyến chưa gán */}
                    {unassignedTripCount > 1 && !multiMode && (
                        <div className="mt-3 rounded-lg border border-info-200 bg-info-50 px-3 py-2 text-[12px] text-info-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-medium mb-1">
                                    Còn {unassignedTripCount} chuyến chưa gán tài xế/xe
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={assignToAllTrips}
                                        onChange={(e) => setAssignToAllTrips(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-info-500"
                                    />
                                    <span>
                                        Gán cho tất cả {unassignedTripCount} chuyến còn lại
                                    </span>
                                </label>
                                {hasMixedVehicleCategories && assignToAllTrips && (
                                    <div className="mt-1 text-[11px] text-blue-600 font-medium">
                                        ℹ️ Hệ thống sẽ tự động chọn xe phù hợp cho từng chuyến (xe 9 chỗ cho chuyến 1, xe 45 chỗ cho chuyến 2, ...)
                                    </div>
                                )}
                                {!hasMixedVehicleCategories && assignToAllTrips && (
                                    <div className="mt-1 text-[11px] text-blue-600 font-medium">
                                        ℹ️ Sẽ gán cùng tài xế/xe cho tất cả {unassignedTripCount} chuyến
                                    </div>
                                )}
                                {!assignToAllTrips && (
                                    <div className="mt-1 text-[11px] text-info-700">
                                        (Chỉ gán cho chuyến đầu tiên trong danh sách chưa gán)
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Suggestions block */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                        <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-200 bg-slate-50 font-medium uppercase tracking-wide">
                            Gợi ý hệ thống
                        </div>

                        {error && (
                            <div className="px-3 py-2 text-[12px] text-info-700 border-b border-info-200 bg-info-50 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-primary-600 shrink-0" />
                                <span>
                                    {error}
                                </span>
                            </div>
                        )}

                        {loading ? (
                            <div className="px-3 py-6 text-[13px] text-slate-500 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                Đang tải gợi ý…
                            </div>
                        ) : suggestions.length ===
                        0 ? (
                            <div className="px-3 py-6 text-[13px] text-slate-500 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-primary-600" />
                                <span>
                                    Không có
                                    gợi ý phù
                                    hợp.
                                </span>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200 max-h-56 overflow-y-auto">
                                {suggestions.map(
                                    (
                                        s,
                                        idx
                                    ) => (
                                        <li
                                            key={
                                                s.id ??
                                                `${s?.driver?.id}-${s?.vehicle?.id}-${idx}`
                                            }
                                            className="p-3 hover:bg-slate-50 cursor-pointer"
                                            onClick={() =>
                                                handlePickSuggestion(
                                                    s
                                                )
                                            }
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* row top */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        {/* driver */}
                                                        <div className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium min-w-0">
                                                            <UserRound className="h-4 w-4 text-primary-600" />
                                                            <span
                                                                className="truncate"
                                                                title={
                                                                    s
                                                                        ?.driver
                                                                        ?.name
                                                                }
                                                            >
                                                                {s
                                                                        ?.driver
                                                                        ?.name ||
                                                                    "—"}
                                                            </span>
                                                            {s
                                                                ?.driver
                                                                ?.id && (
                                                                <span className="text-[11px] text-slate-500 font-normal">
                                                                        #
                                                                    {
                                                                        s
                                                                            .driver
                                                                            .id
                                                                    }
                                                                    </span>
                                                            )}
                                                        </div>

                                                        {/* vehicle */}
                                                        <div className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium min-w-0">
                                                            <Car className="h-4 w-4 text-sky-600" />
                                                            <span
                                                                className="truncate"
                                                                title={
                                                                    s
                                                                        ?.vehicle
                                                                        ?.plate
                                                                }
                                                            >
                                                                {s
                                                                        ?.vehicle
                                                                        ?.plate ||
                                                                    "—"}
                                                            </span>
                                                            {s
                                                                ?.vehicle
                                                                ?.type && (
                                                                <span className="text-[11px] text-slate-500 font-normal">
                                                                        ·{" "}
                                                                    {
                                                                        s
                                                                            .vehicle
                                                                            .type
                                                                    }
                                                                    </span>
                                                            )}
                                                        </div>

                                                        {/* score - chỉ hiển thị nếu có lịch sử với khách hàng */}
                                                        {typeof s?.score ===
                                                            "number" &&
                                                            s?.driver?.hasHistoryWithCustomer && (
                                                                <div className="ml-auto flex items-center gap-1 text-[11px] text-primary-600 font-medium">
                                                                    <BadgeCheck className="h-4 w-4 text-primary-600" />
                                                                    <span>
                                                                        Score:{" "}
                                                                        {
                                                                            s.score
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* reasons */}
                                                    {Array.isArray(
                                                            s?.reasons
                                                        ) &&
                                                        s
                                                            .reasons
                                                            .length >
                                                        0 && (
                                                            <div className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                                                                {s.reasons.join(
                                                                    " · "
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Manual pick */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                        <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-200 bg-slate-50 font-medium uppercase tracking-wide">
                            Chọn thủ công
                        </div>

                        {/* Multi-mode: chọn tài xế/xe cho từng chuyến */}
                        {multiMode ? (
                            <div className="p-3 space-y-3 text-[13px]">
                                {loading && multiTripItems.length > 0 && (
                                    <div className="text-center py-4 text-slate-500 text-[13px]">
                                        Đang tải danh sách tài xế và xe...
                                    </div>
                                )}
                                {multiTripItems.map((item, idx) => {
                                    const current =
                                        multiAssignments.find(
                                            (a) =>
                                                a.tripId ===
                                                item.tripId
                                        ) || {
                                            tripId:
                                            item.tripId,
                                            driverId:
                                                "",
                                            vehicleId:
                                                "",
                                        };
                                    return (
                                        <div
                                            key={item.tripId}
                                            className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
                                        >
                                            <div className="text-[12px] font-medium text-slate-600">
                                                Xe {idx + 1}:{" "}
                                                <span className="text-slate-900">
                                                    {
                                                        item.label
                                                    }
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                                        Tài xế
                                                        (rảnh &
                                                        phù hợp)
                                                    </div>
                                                    <select
                                                        value={
                                                            current.driverId ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateMultiAssignment(
                                                                item.tripId,
                                                                "driverId",
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    >
                                                        <option value="">
                                                            --
                                                            Chọn
                                                            tài
                                                            xế
                                                            --
                                                        </option>
                                                        {(() => {
                                                            const driverOptions = getDriverOptionsForTrip(item.tripId);
                                                            const tripData = tripSuggestions[item.tripId];
                                                            const allDrivers = tripData?.drivers || [];
                                                            const ineligibleCount = allDrivers.filter(d => !d.eligible).length;

                                                            console.log(`[AssignDriverDialog] Rendering driver dropdown for trip ${item.tripId}:`, {
                                                                driverOptionsLength: driverOptions.length,
                                                                allDriversLength: allDrivers.length,
                                                                tripDataExists: !!tripData,
                                                                loading: loading,
                                                                driverOptions: driverOptions.slice(0, 2).map(d => ({ id: d.id, name: d.name, eligible: d.eligible })),
                                                            });

                                                            // Nếu đang loading và chưa có data, hiển thị loading message
                                                            if (loading && !tripData) {
                                                                return (
                                                                    <option value="" disabled>
                                                                        Đang tải danh sách tài xế...
                                                                    </option>
                                                                );
                                                            }

                                                            if (driverOptions.length === 0) {
                                                                if (allDrivers.length === 0) {
                                                                    return (
                                                                        <option value="" disabled>
                                                                            Không có tài xế trong hệ thống
                                                                        </option>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <option value="" disabled>
                                                                            Không có tài xế phù hợp ({ineligibleCount} tài xế không đủ điều kiện)
                                                                        </option>
                                                                    );
                                                                }
                                                            }
                                                            return driverOptions.map((d) => (
                                                                <option
                                                                    key={d.id}
                                                                    value={d.id}
                                                                >
                                                                    {d.hasHistoryWithCustomer
                                                                        ? "✓ "
                                                                        : ""}
                                                                    {d.name}{" "}
                                                                    {d.tripsToday != null
                                                                        ? `(${d.tripsToday} chuyến hôm nay)`
                                                                        : ""}
                                                                </option>
                                                            ));
                                                        })()}
                                                    </select>
                                                </div>
                                                <div>
                                                    <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                                        Xe
                                                        (rảnh &
                                                        phù hợp)
                                                    </div>
                                                    <select
                                                        value={
                                                            current.vehicleId ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateMultiAssignment(
                                                                item.tripId,
                                                                "vehicleId",
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    >
                                                        <option value="">
                                                            --
                                                            Chọn
                                                            xe
                                                            --
                                                        </option>
                                                        {(() => {
                                                            const vehicleOptions = getVehicleOptionsForTrip(item.tripId);
                                                            const tripData = tripSuggestions[item.tripId];
                                                            const allVehicles = tripData?.vehicles || [];

                                                            console.log(`[AssignDriverDialog] Rendering vehicle dropdown for trip ${item.tripId}:`, {
                                                                vehicleOptionsLength: vehicleOptions.length,
                                                                allVehiclesLength: allVehicles.length,
                                                                tripDataExists: !!tripData,
                                                                loading: loading,
                                                                vehicleOptions: vehicleOptions.slice(0, 2).map(v => ({ id: v.id, plate: v.plate, eligible: v.eligible })),
                                                            });

                                                            // Nếu đang loading và chưa có data, hiển thị loading message
                                                            if (loading && !tripData) {
                                                                return (
                                                                    <option value="" disabled>
                                                                        Đang tải danh sách xe...
                                                                    </option>
                                                                );
                                                            }

                                                            if (vehicleOptions.length === 0) {
                                                                return (
                                                                    <option value="" disabled>
                                                                        Không có xe phù hợp
                                                                    </option>
                                                                );
                                                            }
                                                            return vehicleOptions.map((v) => (
                                                                <option
                                                                    key={v.id}
                                                                    value={v.id}
                                                                >
                                                                    {v.plate}{" "}
                                                                    {v.model
                                                                        ? `· ${v.model}`
                                                                        : ""}{" "}
                                                                    {v.status
                                                                        ? `(${v.status})`
                                                                        : ""}
                                                                </option>
                                                            ));
                                                        })()}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Single-mode: UI cũ
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                                {/* Driver select */}
                                <div>
                                    <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                        Tài xế (chỉ
                                        hiện rảnh &
                                        phù hợp)
                                    </div>
                                    <select
                                        value={driverId}
                                        onChange={(e) =>
                                            setDriverId(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="">
                                            -- Chọn
                                            tài xế
                                            --
                                        </option>
                                        {(() => {
                                            const ineligibleCount = driverCandidates.filter(d => !d.eligible).length;
                                            if (driverOptions.length === 0) {
                                                if (driverCandidates.length === 0) {
                                                    return (
                                                        <option value="" disabled>
                                                            Không có tài xế trong hệ thống
                                                        </option>
                                                    );
                                                } else {
                                                    return (
                                                        <option value="" disabled>
                                                            Không có tài xế phù hợp ({ineligibleCount} tài xế không đủ điều kiện)
                                                        </option>
                                                    );
                                                }
                                            }
                                            return driverOptions.map((d) => (
                                                <option
                                                    key={d.id}
                                                    value={d.id}
                                                >
                                                    {d.hasHistoryWithCustomer
                                                        ? "✓ "
                                                        : ""}
                                                    {d.name}{" "}
                                                    {d.tripsToday != null
                                                        ? `(${d.tripsToday} chuyến hôm nay)`
                                                        : ""}
                                                </option>
                                            ));
                                        })()}
                                    </select>
                                </div>

                                {/* Vehicle select */}
                                <div>
                                    <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                        Xe (chỉ
                                        hiện rảnh
                                        & phù hợp)
                                    </div>
                                    <select
                                        value={vehicleId}
                                        onChange={(e) =>
                                            setVehicleId(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    >
                                        <option value="">
                                            -- Chọn
                                            xe --
                                        </option>
                                        {vehicleOptions.map(
                                            (v) => (
                                                <option
                                                    key={
                                                        v.id
                                                    }
                                                    value={
                                                        v.id
                                                    }
                                                >
                                                    {v.plate}{" "}
                                                    {v.model
                                                        ? `· ${v.model}`
                                                        : ""}{" "}
                                                    {v.status
                                                        ? `(${v.status})`
                                                        : ""}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center gap-2 justify-end text-[13px]">
                    {/* Auto-assign */}
                    <button
                        disabled={
                            autoPosting
                        }
                        onClick={
                            doAssignAuto
                        }
                        className={`
                            rounded-md px-3 py-2 border text-[13px] font-medium flex items-center gap-1
                            ${autoPosting
                            ? "opacity-60 cursor-not-allowed border-info-300 text-primary-400 bg-white"
                            : "border-sky-500 text-sky-700 bg-white hover:bg-sky-50"
                        }
                        `}
                    >
                        {autoPosting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                        ) : (
                            <Sparkles className="h-4 w-4 text-primary-600" />
                        )}
                        <span>
                            Tự động gán
                            (Auto-assign)
                        </span>
                    </button>

                    {/* Manual confirm */}
                    <button
                        disabled={
                            !canConfirm
                        }
                        onClick={
                            doAssignManual
                        }
                        className={`
                            rounded-md px-3 py-2 border text-[13px] font-medium flex items-center gap-1
                            ${canConfirm
                            ? "border-sky-600 text-sky-700 bg-white hover:bg-sky-50"
                            : "opacity-60 cursor-not-allowed border-slate-300 text-slate-400 bg-white"
                        }
                        `}
                    >
                        <Check className="h-4 w-4 text-sky-600" />
                        <span>
                            Xác nhận gán
                            chuyến
                        </span>
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="rounded-md px-3 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-[13px] text-slate-600 font-medium flex items-center gap-1"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                        <span>Đóng</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============ Helpers ============ */

function pad2(n) {
    return String(n).padStart(2, "0");
}
function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${day}/${m}/${y} ${hh}:${mm}`;
}

