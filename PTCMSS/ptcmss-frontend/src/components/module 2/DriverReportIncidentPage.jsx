import React from "react";
import {
    AlertTriangle, MapPin, Clock, FileText, Send, CheckCircle2,
    XCircle, Loader2, Info, AlertCircle, Shield, User, Phone
} from "lucide-react";
import { getDriverProfileByUser, reportIncident, getDriverDashboard, getDriverSchedule } from "../../api/drivers";

// Các mức độ nghiêm trọng với mô tả chi tiết
const SEVERITIES = [
    {
        value: "MINOR",
        label: "Nhẹ",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        icon: Info,
        description: "Sự cố nhỏ, không ảnh hưởng đến an toàn"
    },
    {
        value: "MAJOR",
        label: "Trung bình",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        icon: AlertCircle,
        description: "Sự cố cần xử lý, có thể ảnh hưởng đến lịch trình"
    },
    {
        value: "CRITICAL",
        label: "Nghiêm trọng",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        icon: AlertTriangle,
        description: "Sự cố nghiêm trọng, cần xử lý khẩn cấp"
    },
];

// Các loại sự cố thường gặp
const INCIDENT_TYPES = [
    { value: "ACCIDENT", label: "Tai nạn giao thông" },
    { value: "VEHICLE_BREAKDOWN", label: "Xe hỏng" },
    { value: "TRAFFIC_JAM", label: "Kẹt xe nghiêm trọng" },
    { value: "WEATHER", label: "Thời tiết xấu" },
    { value: "CUSTOMER_ISSUE", label: "Vấn đề với khách hàng" },
    { value: "ROAD_CONDITION", label: "Đường xấu/ngập nước" },
    { value: "OTHER", label: "Khác" },
];

export default function DriverReportIncidentPage() {
    const [driver, setDriver] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [tripId, setTripId] = React.useState("");
    const [tripIdInput, setTripIdInput] = React.useState(""); // For manual input
    const [tripSelectionMode, setTripSelectionMode] = React.useState("auto"); // "auto", "dropdown", "manual"
    const [currentTrip, setCurrentTrip] = React.useState(null);
    const [availableTrips, setAvailableTrips] = React.useState([]);
    const [selectedTrip, setSelectedTrip] = React.useState(null);
    const [incidentType, setIncidentType] = React.useState("");
    const [severity, setSeverity] = React.useState("MAJOR");
    const [location, setLocation] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [toast, setToast] = React.useState(null);
    const [resolvedAddress, setResolvedAddress] = React.useState("");
    const [locationSuggestions, setLocationSuggestions] = React.useState([]);
    const [fetchingSuggestions, setFetchingSuggestions] = React.useState(false);

    // Format time helper
    const fmtHM = (iso) => {
        if (!iso) return "--:--";
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            });
        } catch {
            return "--:--";
        }
    };

    // Gợi ý địa điểm (autocomplete) bằng Nominatim/OSM có sẵn
    React.useEffect(() => {
        const query = location?.trim();
        if (!query || query.length < 3) {
            setLocationSuggestions([]);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setFetchingSuggestions(true);
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`,
                    { signal: controller.signal }
                );
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await resp.json();
                const mapped = Array.isArray(data)
                    ? data.map((item) => ({
                        label: item.display_name,
                        lat: item.lat,
                        lon: item.lon,
                    }))
                    : [];
                setLocationSuggestions(mapped);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setLocationSuggestions([]);
                }
            } finally {
                setFetchingSuggestions(false);
            }
        }, 400); // debounce để tránh spam API

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [location]);

    const handleSelectSuggestion = (sugg) => {
        if (!sugg) return;
        const lat = parseFloat(sugg.lat);
        const lon = parseFloat(sugg.lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } else {
            setLocation(sugg.label);
        }
        setResolvedAddress(sugg.label || "");
        setLocationSuggestions([]);
    };

    React.useEffect(() => {
        async function load() {
            try {
                const uid = localStorage.getItem("userId");
                if (!uid) {
                    setToast({ type: "error", message: "Không tìm thấy thông tin người dùng" });
                    setLoading(false);
                    return;
                }
                const p = await getDriverProfileByUser(uid);
                setDriver(p);

                // Load current trip from dashboard
                if (p?.driverId) {
                    try {
                        const dash = await getDriverDashboard(p.driverId);
                        if (dash && dash.tripId) {
                            const tripDate = new Date(dash.startTime);
                            const today = new Date();
                            const isToday =
                                tripDate.getDate() === today.getDate() &&
                                tripDate.getMonth() === today.getMonth() &&
                                tripDate.getFullYear() === today.getFullYear();

                            if (isToday) {
                                const trip = {
                                    tripId: dash.tripId,
                                    pickupAddress: dash.startLocation,
                                    dropoffAddress: dash.endLocation ?? dash.EndLocation,
                                    pickupTime: dash.startTime,
                                    customerName: dash.customerName,
                                    customerPhone: dash.customerPhone,
                                    status: dash.status || "SCHEDULED",
                                };
                                setCurrentTrip(trip);
                                setTripId(String(dash.tripId));
                                setSelectedTrip(trip);
                                setTripSelectionMode("auto");
                            } else {
                                setTripSelectionMode("dropdown");
                            }
                        } else {
                            setTripSelectionMode("dropdown");
                        }

                        // Load available trips for incident reporting
                        // Business Logic: Chỉ cho phép báo cáo sự cố cho các chuyến:
                        // - ONGOING: Đang diễn ra (ưu tiên cao nhất)
                        // - ASSIGNED: Đã phân xe, sắp bắt đầu
                        // - SCHEDULED: Đã lên lịch
                        // KHÔNG cho phép: COMPLETED, CANCELLED
                        // Phạm vi thời gian: Hôm nay + các chuyến đang diễn ra từ hôm qua (nếu còn ONGOING)
                        try {
                            const schedule = await getDriverSchedule(p.driverId);
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);

                            const reportableTrips = Array.isArray(schedule)
                                ? schedule
                                    .filter((t) => {
                                        const tripDate = new Date(t.startTime || t.start_time);
                                        const tripStatus = t.status || "SCHEDULED";

                                        // Chỉ cho phép các status có thể báo cáo sự cố
                                        const validStatus = ["SCHEDULED", "ASSIGNED", "ONGOING"].includes(tripStatus);
                                        if (!validStatus) return false;

                                        // Cho phép:
                                        // 1. Chuyến hôm nay (bất kỳ status nào trong danh sách)
                                        const isToday =
                                            tripDate.getDate() === today.getDate() &&
                                            tripDate.getMonth() === today.getMonth() &&
                                            tripDate.getFullYear() === today.getFullYear();

                                        // 2. Chuyến ONGOING từ hôm qua (có thể vẫn đang diễn ra)
                                        const isYesterdayOngoing =
                                            tripStatus === "ONGOING" &&
                                            tripDate.getDate() === yesterday.getDate() &&
                                            tripDate.getMonth() === yesterday.getMonth() &&
                                            tripDate.getFullYear() === yesterday.getFullYear();

                                        // 3. Chuyến sắp tới trong 2 giờ tới (có thể cần báo cáo sớm)
                                        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                                        const isUpcoming = tripDate <= twoHoursFromNow && tripDate >= now;

                                        return isToday || isYesterdayOngoing || isUpcoming;
                                    })
                                    .sort((a, b) => {
                                        // Sắp xếp: ONGOING trước, sau đó theo thời gian
                                        const statusOrder = { ONGOING: 1, ASSIGNED: 2, SCHEDULED: 3 };
                                        const aOrder = statusOrder[a.status] || 99;
                                        const bOrder = statusOrder[b.status] || 99;
                                        if (aOrder !== bOrder) return aOrder - bOrder;

                                        const aTime = new Date(a.startTime || a.start_time).getTime();
                                        const bTime = new Date(b.startTime || b.start_time).getTime();
                                        return bTime - aTime; // Mới nhất trước
                                    })
                                    .map((t) => ({
                                        tripId: t.tripId || t.trip_id,
                                        pickupAddress: t.startLocation || t.start_location || "—",
                                        dropoffAddress: t.endLocation || t.end_location || "—",
                                        pickupTime: t.startTime || t.start_time,
                                        customerName: t.customerName || t.customer_name,
                                        status: t.status || "SCHEDULED",
                                    }))
                                : [];
                            setAvailableTrips(reportableTrips);

                            // If no current trip was set and have available trips, select first one
                            if (!dash?.tripId && todayTrips.length > 0) {
                                setSelectedTrip(todayTrips[0]);
                                setTripId(String(todayTrips[0].tripId));
                            }
                        } catch (err) {
                            console.error("Error loading schedule:", err);
                        }
                    } catch (err) {
                        console.error("Error loading dashboard:", err);
                    }
                }
            } catch (err) {
                console.error("Error loading driver profile:", err);
                setToast({ type: "error", message: "Không tải được thông tin tài xế" });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Handle trip selection change
    const handleTripSelect = (selectedTripId) => {
        const trip = availableTrips.find(t => String(t.tripId) === String(selectedTripId));
        if (trip) {
            setSelectedTrip(trip);
            setTripId(String(trip.tripId));
            setTripSelectionMode("dropdown");
        }
    };

    // Handle manual input
    const handleManualInput = (value) => {
        setTripIdInput(value);
        setTripId(value);
        setTripSelectionMode("manual");
        setSelectedTrip(null);
    };

    async function onSubmit(e) {
        e.preventDefault();

        // Validation
        const finalTripId = tripSelectionMode === "manual" ? tripIdInput.trim() : tripId;
        if (!finalTripId) {
            setToast({ type: "error", message: "Vui lòng chọn hoặc nhập mã chuyến đi" });
            return;
        }
        if (!incidentType) {
            setToast({ type: "error", message: "Vui lòng chọn loại sự cố" });
            return;
        }
        if (!description.trim()) {
            setToast({ type: "error", message: "Vui lòng mô tả chi tiết sự cố" });
            return;
        }
        if (description.trim().length < 10) {
            setToast({ type: "error", message: "Mô tả phải có ít nhất 10 ký tự" });
            return;
        }

        setSubmitting(true);
        try {
            if (!driver?.driverId) {
                throw new Error("Không tìm thấy thông tin tài xế");
            }

            const tId = Number(String(finalTripId).trim());
            if (!tId || isNaN(tId)) {
                throw new Error("Mã chuyến đi không hợp lệ");
            }

            // Business Logic Validation: Kiểm tra chuyến đi có thể báo cáo sự cố không
            const selectedTripForValidation = selectedTrip || availableTrips.find(t => String(t.tripId) === String(tId));
            if (selectedTripForValidation) {
                const tripStatus = selectedTripForValidation.status;
                const invalidStatuses = ["COMPLETED", "CANCELLED"];
                if (invalidStatuses.includes(tripStatus)) {
                    throw new Error(`Không thể báo cáo sự cố cho chuyến đi đã ${tripStatus === "COMPLETED" ? "hoàn thành" : "bị hủy"}. Vui lòng chọn chuyến đi đang diễn ra hoặc sắp diễn ra.`);
                }
            }

            // Tạo mô tả đầy đủ
            const fullDescription = `[${INCIDENT_TYPES.find(t => t.value === incidentType)?.label || incidentType}] ${description.trim()}${location ? `\nĐịa điểm: ${location}` : ''}`;

            await reportIncident({
                driverId: driver.driverId,
                tripId: tId,
                severity,
                description: fullDescription,
            });

            setToast({ type: "success", message: "Đã gửi báo cáo sự cố thành công. Điều phối viên sẽ xử lý sớm nhất." });

            // Reset form (but keep current trip if exists)
            if (currentTrip) {
                setTripId(String(currentTrip.tripId));
                setSelectedTrip(currentTrip);
                setTripSelectionMode("auto");
            } else {
                setTripId("");
                setSelectedTrip(null);
                setTripSelectionMode("dropdown");
            }
            setTripIdInput("");
            setIncidentType("");
            setSeverity("MAJOR");
            setLocation("");
            setDescription("");

        } catch (e) {
            console.error("Error submitting incident:", e);
            setToast({
                type: "error",
                message: e.message || "Gửi báo cáo thất bại. Vui lòng kiểm tra và thử lại."
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}>
                        {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <span className="text-sm">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2">
                            <XCircle className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Báo cáo sự cố</h1>
                            <p className="text-sm text-slate-600">Thông báo sự cố trong chuyến đi để được hỗ trợ kịp thời</p>
                        </div>
                    </div>
                    {driver && (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                <strong>{driver.fullName}</strong>
                                {driver.branchName && ` - ${driver.branchName}`}
              </span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="space-y-6">
                        {/* Trip Selection */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Chọn chuyến đi <span className="text-rose-500">*</span>
                            </label>

                            {/* Current Trip Card (if exists) */}
                            {currentTrip && tripSelectionMode === "auto" && (
                                <div className="mb-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="text-sm font-semibold text-blue-900">Chuyến đi hiện tại</span>
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                          ID: {currentTrip.tripId}
                        </span>
                                                {currentTrip.status === "ONGOING" && (
                                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-medium">
                            Đang diễn ra
                          </span>
                                                )}
                                                {currentTrip.status === "ASSIGNED" && (
                                                    <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md font-medium">
                            Đã phân xe
                          </span>
                                                )}
                                                {currentTrip.status === "SCHEDULED" && (
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                            Đã lên lịch
                          </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-blue-800 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{currentTrip.pickupAddress} → {currentTrip.dropoffAddress}</span>
                                                </div>
                                                {currentTrip.customerName && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>{currentTrip.customerName}</span>
                                                        {currentTrip.customerPhone && (
                                                            <>
                                                                <Phone className="h-3.5 w-3.5 ml-2" />
                                                                <span>{currentTrip.customerPhone}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{fmtHM(currentTrip.pickupTime)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTripSelectionMode("dropdown")}
                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Chọn chuyến khác
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Dropdown Selection */}
                            {(tripSelectionMode === "dropdown" || !currentTrip) && availableTrips.length > 0 && (
                                <div className="mb-3">
                                    <select
                                        value={selectedTrip?.tripId || ""}
                                        onChange={(e) => handleTripSelect(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="">-- Chọn chuyến đi --</option>
                                        {availableTrips.map((trip) => {
                                            const statusLabel = {
                                                ONGOING: "🟢 Đang diễn ra",
                                                ASSIGNED: "🔵 Đã phân xe",
                                                SCHEDULED: "⚪ Đã lên lịch"
                                            }[trip.status] || trip.status;
                                            return (
                                                <option key={trip.tripId} value={trip.tripId}>
                                                    {statusLabel} | ID {trip.tripId}: {trip.pickupAddress} → {trip.dropoffAddress} ({fmtHM(trip.pickupTime)})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {selectedTrip && (
                                        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="font-medium text-slate-700">Thông tin chuyến:</div>
                                                {selectedTrip.status === "ONGOING" && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-medium text-[10px]">
                            Đang diễn ra
                          </span>
                                                )}
                                                {selectedTrip.status === "ASSIGNED" && (
                                                    <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md font-medium text-[10px]">
                            Đã phân xe
                          </span>
                                                )}
                                                {selectedTrip.status === "SCHEDULED" && (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px]">
                            Đã lên lịch
                          </span>
                                                )}
                                            </div>
                                            <div>{selectedTrip.pickupAddress} → {selectedTrip.dropoffAddress}</div>
                                            {selectedTrip.customerName && <div>Khách: {selectedTrip.customerName}</div>}
                                            <div className="text-slate-500 mt-1">Thời gian: {fmtHM(selectedTrip.pickupTime)}</div>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTripSelectionMode("manual");
                                            setSelectedTrip(null);
                                        }}
                                        className="mt-2 text-xs text-slate-600 hover:text-slate-800 underline"
                                    >
                                        Hoặc nhập mã chuyến đi thủ công
                                    </button>
                                </div>
                            )}

                            {/* Manual Input */}
                            {tripSelectionMode === "manual" && (
                                <div>
                                    <input
                                        type="text"
                                        value={tripIdInput}
                                        onChange={(e) => handleManualInput(e.target.value)}
                                        placeholder="Nhập mã chuyến đi (Trip ID)"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Ví dụ: 123, 456</p>
                                    {availableTrips.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTripSelectionMode("dropdown");
                                                setTripIdInput("");
                                            }}
                                            className="mt-2 text-xs text-slate-600 hover:text-slate-800 underline"
                                        >
                                            Hoặc chọn từ danh sách chuyến đi
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* No trips available */}
                            {availableTrips.length === 0 && !currentTrip && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800 mb-2">Không có chuyến đi nào hôm nay.</p>
                                    <input
                                        type="text"
                                        value={tripIdInput}
                                        onChange={(e) => handleManualInput(e.target.value)}
                                        placeholder="Nhập mã chuyến đi (Trip ID)"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Incident Type */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                                Loại sự cố <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={incidentType}
                                onChange={(e) => setIncidentType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            >
                                <option value="">-- Chọn loại sự cố --</option>
                                {INCIDENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <AlertTriangle className="h-4 w-4 text-slate-400" />
                                Mức độ nghiêm trọng <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {SEVERITIES.map(sev => {
                                    const Icon = sev.icon;
                                    const isSelected = severity === sev.value;
                                    return (
                                        <button
                                            key={sev.value}
                                            type="button"
                                            onClick={() => setSeverity(sev.value)}
                                            className={`p-4 border-2 rounded-lg transition-all ${isSelected
                                                ? `${sev.color} border-current shadow-md`
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon className={`h-5 w-5 ${isSelected ? '' : 'text-slate-400'}`} />
                                                <span className={`font-semibold ${isSelected ? '' : 'text-slate-700'}`}>
                          {sev.label}
                        </span>
                                            </div>
                                            <p className={`text-xs ${isSelected ? '' : 'text-slate-500'}`}>
                                                {sev.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="relative">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Địa điểm xảy ra sự cố
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Nhập địa điểm, tên đường hoặc tọa độ. Gõ để được gợi ý..."
                                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>
                            {/* <p className="text-xs text-slate-500 mt-1">
                Nhập địa điểm để nhận gợi ý tự động (autocomplete).
              </p> */}
                            {resolvedAddress && (
                                <p className="text-xs text-emerald-700 mt-1 break-words">
                                    Địa chỉ: {resolvedAddress}
                                </p>
                            )}
                            {locationSuggestions.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                                    {locationSuggestions.map((s, idx) => (
                                        <button
                                            key={`${s.lat}-${s.lon}-${idx}`}
                                            type="button"
                                            onClick={() => handleSelectSuggestion(s)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b last:border-b-0 border-slate-100"
                                        >
                                            <div className="font-medium text-slate-800 truncate">{s.label}</div>
                                            <div className="text-xs text-slate-500">
                                                {s.lat && s.lon ? `${parseFloat(s.lat).toFixed(6)}, ${parseFloat(s.lon).toFixed(6)}` : ""}
                                            </div>
                                        </button>
                                    ))}
                                    {fetchingSuggestions && (
                                        <div className="px-3 py-2 text-xs text-slate-500">Đang gợi ý...</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                Mô tả chi tiết <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                placeholder="Mô tả chi tiết tình huống, thiệt hại (nếu có), và những gì bạn đã làm..."
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                required
                            />
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">Tối thiểu 10 ký tự</p>
                                <p className="text-xs text-slate-400">{description.length} ký tự</p>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-700">
                                    <p className="font-medium mb-1">Lưu ý quan trọng:</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Báo cáo sự cố càng sớm càng tốt để được hỗ trợ kịp thời</li>
                                        <li>Cung cấp thông tin chi tiết, chính xác để xử lý hiệu quả</li>
                                        <li>Trong trường hợp khẩn cấp, hãy gọi điện cho điều phối viên</li>
                                        <li>Giữ an toàn cho bản thân và hành khách là ưu tiên hàng đầu</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Đang gửi...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Gửi báo cáo sự cố</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Help Section */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium mb-1">Cần hỗ trợ khẩn cấp?</p>
                            <p className="text-xs">
                                Liên hệ ngay với điều phối viên qua hotline: <strong className="text-amber-900">1900-xxxx</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}