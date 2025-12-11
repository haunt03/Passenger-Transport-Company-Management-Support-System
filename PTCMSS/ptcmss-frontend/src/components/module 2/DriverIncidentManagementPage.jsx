import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  XCircle,
  Filter,
  Ambulance,
  Phone,
  Truck,
  UserCheck,
  Ban,
  FileText,
  Calendar,
  User,
  Send,
  Info,
  AlertCircle,
} from "lucide-react";
import { listIncidentsByDriver } from "../../api/incidents";
import { getDriverProfileByUser, reportIncident, getDriverDashboard, getDriverSchedule } from "../../api/drivers";
import { getStoredUserId } from "../../utils/session";

// Constants
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
    color: "text-info-700 bg-info-50 border-info-200",
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

const INCIDENT_TYPES = [
  { value: "ACCIDENT", label: "Tai nạn giao thông" },
  { value: "VEHICLE_BREAKDOWN", label: "Xe hỏng" },
  { value: "TRAFFIC_JAM", label: "Kẹt xe nghiêm trọng" },
  { value: "WEATHER", label: "Thời tiết xấu" },
  { value: "CUSTOMER_ISSUE", label: "Vấn đề với khách hàng" },
  { value: "ROAD_CONDITION", label: "Đường xấu/ngập nước" },
  { value: "OTHER", label: "Khác" },
];

const RESOLUTION_ACTIONS = {
  SEND_EMERGENCY_SUPPORT: {
    label: "Gửi hỗ trợ khẩn cấp",
    icon: Ambulance,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  CONTACT_DRIVER: {
    label: "Liên hệ với tài xế",
    icon: Phone,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  SEND_REPLACEMENT_VEHICLE: {
    label: "Gửi xe thay thế",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  REASSIGN_TRIP: {
    label: "Chuyển chuyến đi",
    icon: UserCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  CANCEL_TRIP: {
    label: "Hủy chuyến đi",
    icon: Ban,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  OTHER: {
    label: "Giải pháp khác",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
};

// Helper function to translate trip status to Vietnamese
const getTripStatusLabel = (status) => {
  const statusMap = {
    SCHEDULED: "Đã lên lịch",
    ASSIGNED: "Đã phân xe",
    ONGOING: "Đang diễn ra",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return statusMap[status] || status;
};

// Helper function to translate severity to Vietnamese
const getSeverityLabel = (severity) => {
  const severityMap = {
    MINOR: "Nhẹ",
    NORMAL: "Bình thường",
    MAJOR: "Trung bình",
    CRITICAL: "Nghiêm trọng",
  };
  return severityMap[severity] || severity;
};

const SEVERITY_COLORS = {
  MINOR: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  NORMAL: { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
  MAJOR: { color: "text-info-700", bg: "bg-info-50", border: "border-info-200" },
  CRITICAL: { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
};

export default function DriverIncidentManagementPage() {
  const userId = useMemo(() => getStoredUserId(), []);
  const [activeTab, setActiveTab] = useState("report"); // "report" or "list"
  
  // Driver state
  const [driver, setDriver] = useState(null);
  const [driverLoading, setDriverLoading] = useState(true);
  
  // Report form state
  const [tripId, setTripId] = useState("");
  const [tripIdInput, setTripIdInput] = useState("");
  const [tripSelectionMode, setTripSelectionMode] = useState("auto");
  const [currentTrip, setCurrentTrip] = useState(null);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("MAJOR");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  
  // List state
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

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

  // Load driver profile
  useEffect(() => {
    if (!userId) {
      setDriverLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setDriverLoading(true);
        const data = await getDriverProfileByUser(Number(userId));
        if (cancelled) return;
        setDriver(data);
        
        // Load current trip and available trips
        if (data?.driverId) {
          await loadTrips(data.driverId);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Không tải được thông tin tài xế:", err);
      } finally {
        if (!cancelled) setDriverLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Load trips for reporting
  const loadTrips = async (driverId) => {
    try {
      const dash = await getDriverDashboard(driverId);
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

      const schedule = await getDriverSchedule(driverId);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const reportableTrips = Array.isArray(schedule)
        ? schedule
            .filter((t) => {
              const tripDate = new Date(t.startTime || t.start_time);
              const tripStatus = t.status || "SCHEDULED";
              const validStatus = ["SCHEDULED", "ASSIGNED", "ONGOING"].includes(tripStatus);
              if (!validStatus) return false;
              
              const isToday =
                tripDate.getDate() === today.getDate() &&
                tripDate.getMonth() === today.getMonth() &&
                tripDate.getFullYear() === today.getFullYear();
              
              const isYesterdayOngoing =
                tripStatus === "ONGOING" &&
                tripDate.getDate() === yesterday.getDate() &&
                tripDate.getMonth() === yesterday.getMonth() &&
                tripDate.getFullYear() === yesterday.getFullYear();
              
              const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
              const isUpcoming = tripDate <= twoHoursFromNow && tripDate >= now;
              
              return isToday || isYesterdayOngoing || isUpcoming;
            })
            .sort((a, b) => {
              const statusOrder = { ONGOING: 1, ASSIGNED: 2, SCHEDULED: 3 };
              const aOrder = statusOrder[a.status] || 99;
              const bOrder = statusOrder[b.status] || 99;
              if (aOrder !== bOrder) return aOrder - bOrder;
              
              const aTime = new Date(a.startTime || a.start_time).getTime();
              const bTime = new Date(b.startTime || b.start_time).getTime();
              return bTime - aTime;
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
    } catch (err) {
      console.error("Lỗi khi tải danh sách chuyến đi:", err);
    }
  };

  // Location autocomplete
  useEffect(() => {
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
        if (!resp.ok) throw new Error(`Lỗi kết nối: HTTP ${resp.status}`);
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
    }, 400);

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
    setLocationSuggestions([]);
  };

  // Load incidents list
  useEffect(() => {
    if (driverLoading || !driver?.driverId || activeTab !== "list") return;
    fetchIncidents();
  }, [driver, driverLoading, filter, activeTab]);

  const fetchIncidents = async () => {
    if (!driver?.driverId) return;
    try {
      setLoading(true);
      setError("");
      const resolved = filter === "all" ? null : filter === "resolved";
      const data = await listIncidentsByDriver(driver.driverId, resolved);
      const list = Array.isArray(data) ? data : data?.data || [];
      setIncidents(list);
    } catch (err) {
      setError(err?.message || "Không tải được danh sách sự cố");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle trip selection
  const handleTripSelect = (selectedTripId) => {
    const trip = availableTrips.find(t => String(t.tripId) === String(selectedTripId));
    if (trip) {
      setSelectedTrip(trip);
      setTripId(String(trip.tripId));
      setTripSelectionMode("dropdown");
    }
  };

  const handleManualInput = (value) => {
    setTripIdInput(value);
    setTripId(value);
    setTripSelectionMode("manual");
    setSelectedTrip(null);
  };

  // Submit report
  async function onSubmit(e) {
    e.preventDefault();

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

      const selectedTripForValidation = selectedTrip || availableTrips.find(t => String(t.tripId) === String(tId));
      if (selectedTripForValidation) {
        const tripStatus = selectedTripForValidation.status;
        const invalidStatuses = ["COMPLETED", "CANCELLED"];
        if (invalidStatuses.includes(tripStatus)) {
          throw new Error(`Không thể báo cáo sự cố cho chuyến đi đã ${tripStatus === "COMPLETED" ? "hoàn thành" : "bị hủy"}.`);
        }
      }

      const fullDescription = `[${INCIDENT_TYPES.find(t => t.value === incidentType)?.label || incidentType}] ${description.trim()}${location ? `\nĐịa điểm: ${location}` : ''}`;

      await reportIncident({
        driverId: driver.driverId,
        tripId: tId,
        severity,
        description: fullDescription,
      });

      setToast({ type: "success", message: "Đã gửi báo cáo sự cố thành công. Điều phối viên sẽ xử lý sớm nhất." });

      // Reset form
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
      
      // Switch to list tab and refresh
      setActiveTab("list");
      setTimeout(() => fetchIncidents(), 500);
    } catch (e) {
      console.error("Lỗi khi gửi báo cáo sự cố:", e);
      setToast({
        type: "error",
        message: e.message || "Gửi báo cáo thất bại. Vui lòng kiểm tra và thử lại."
      });
    } finally {
      setSubmitting(false);
    }
  }

  const getSeverityBadge = (severity) => {
    const config = SEVERITY_COLORS[severity] || SEVERITY_COLORS.NORMAL;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${config.bg} ${config.color} border ${config.border}`}>
        {getSeverityLabel(severity) || "Bình thường"}
      </span>
    );
  };

  const getResolutionBadge = (incident) => {
    if (!incident.resolved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-info-100 text-info-700 border border-info-200">
          <Clock className="h-3.5 w-3.5" /> Chờ xử lý
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Đã xử lý
      </span>
    );
  };

  const resolvedCount = incidents.filter((i) => i.resolved).length;
  const pendingCount = incidents.filter((i) => !i.resolved).length;

  if (driverLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
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
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Quản lý sự cố</h1>
            <p className="text-sm text-slate-600">Báo cáo và theo dõi các sự cố trong chuyến đi</p>
          </div>
        </div>
        {driver && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg inline-flex">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              <strong>{driver.fullName}</strong>
              {driver.branchName && ` - ${driver.branchName}`}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg border border-slate-200 p-1 inline-flex">
        <button
          onClick={() => setActiveTab("report")}
          className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === "report"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Báo cáo sự cố
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("list");
            if (driver?.driverId) fetchIncidents();
          }}
          className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
            activeTab === "list"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Danh sách sự cố
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-info-500 text-white rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "report" ? (
        <div className="max-w-4xl mx-auto">
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="space-y-6">
              {/* Trip Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Chọn chuyến đi <span className="text-rose-500">*</span>
                </label>

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
                            <span className="text-xs px-2 py-0.5 bg-info-100 text-info-700 rounded-md font-medium">
                              Đang diễn ra
                            </span>
                          )}
                          {currentTrip.status === "ASSIGNED" && (
                            <span className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md font-medium">
                              Đã phân xe
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

                {tripSelectionMode === "dropdown" && (
                  <select
                    value={tripId}
                    onChange={(e) => handleTripSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn chuyến đi --</option>
                    {availableTrips.map((trip) => (
                      <option key={trip.tripId} value={trip.tripId}>
                        Chuyến {trip.tripId} - {trip.pickupAddress} → {trip.dropoffAddress} ({getTripStatusLabel(trip.status)})
                      </option>
                    ))}
                  </select>
                )}

                {tripSelectionMode === "manual" && (
                  <input
                    type="text"
                    value={tripIdInput}
                    onChange={(e) => handleManualInput(e.target.value)}
                    placeholder="Nhập mã chuyến đi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {tripSelectionMode !== "manual" && availableTrips.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setTripSelectionMode("manual")}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Nhập mã chuyến đi thủ công
                  </button>
                )}
              </div>

              {/* Incident Type */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <AlertTriangle className="h-4 w-4 text-slate-400" />
                  Loại sự cố <span className="text-rose-500">*</span>
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn loại sự cố --</option>
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Info className="h-4 w-4 text-slate-400" />
                  Mức độ nghiêm trọng <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SEVERITIES.map((sev) => {
                    const Icon = sev.icon;
                    return (
                      <button
                        key={sev.value}
                        type="button"
                        onClick={() => setSeverity(sev.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          severity === sev.value
                            ? `${sev.color} border-current shadow-md`
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 ${severity === sev.value ? sev.color.split(' ')[0] : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <div className="font-medium">{sev.label}</div>
                            <div className="text-xs mt-1">{sev.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Địa điểm (tùy chọn)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Nhập địa điểm hoặc tọa độ GPS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {locationSuggestions.map((sugg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(sugg)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 text-sm"
                        >
                          {sugg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                  placeholder="Mô tả chi tiết về sự cố đã xảy ra..."
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Tối thiểu 10 ký tự</p>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTripId("");
                    setTripIdInput("");
                    setIncidentType("");
                    setSeverity("MAJOR");
                    setLocation("");
                    setDescription("");
                    if (currentTrip) {
                      setTripId(String(currentTrip.tripId));
                      setSelectedTrip(currentTrip);
                      setTripSelectionMode("auto");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Đặt lại
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Gửi báo cáo
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{incidents.length}</div>
                  <div className="text-sm text-slate-600">Tổng sự cố</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-600">{pendingCount}</div>
                  <div className="text-sm text-slate-600">Chờ xử lý</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div>
                  <div className="text-sm text-slate-600">Đã xử lý</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">Lọc theo:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === "pending"
                    ? "bg-primary-600 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Chờ xử lý
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === "resolved"
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Đã xử lý
              </button>
            </div>
            <button
              onClick={fetchIncidents}
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
          </div>

          {/* Incident List */}
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-4 w-4" /> {error}
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center">
              <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Chưa có sự cố nào</h3>
              <p className="text-sm text-slate-600">
                {filter === "all"
                  ? "Bạn chưa báo cáo sự cố nào. Hãy báo cáo khi có sự cố xảy ra."
                  : filter === "resolved"
                  ? "Chưa có sự cố nào đã được xử lý."
                  : "Tất cả sự cố đã được xử lý."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {incidents.map((inc) => {
                const resolution = inc.resolutionAction
                  ? RESOLUTION_ACTIONS[inc.resolutionAction]
                  : null;
                const ResolutionIcon = resolution?.icon;

                return (
                  <div
                    key={inc.id}
                    className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">Chuyến {inc.tripId}</span>
                              {getSeverityBadge(inc.severity)}
                              {getResolutionBadge(inc)}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <span>ID: {inc.id}</span>
                              <span>•</span>
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {inc.createdAt
                                  ? new Date(inc.createdAt).toLocaleString("vi-VN")
                                  : "--"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-sm text-slate-700 leading-relaxed">{inc.description}</div>
                        </div>

                        {inc.resolved && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                            <div className="flex items-start gap-3">
                              {ResolutionIcon && (
                                <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                                  <ResolutionIcon className={`h-5 w-5 ${resolution.color}`} />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-semibold text-emerald-900 mb-1">
                                  Giải pháp đã áp dụng: {resolution?.label || "Đã xử lý"}
                                </div>
                                {inc.resolutionNote && (
                                  <div className="text-sm text-emerald-800 mt-2 mb-2">
                                    {inc.resolutionNote}
                                  </div>
                                )}
                                <div className="text-xs text-emerald-700 flex items-center gap-2 mt-2">
                                  <User className="h-3.5 w-3.5" />
                                  <span>
                                    Xử lý bởi: {inc.resolvedByName || "Điều phối viên"}
                                    {inc.resolvedAt && (
                                      <>
                                        {" • "}
                                        {new Date(inc.resolvedAt).toLocaleString("vi-VN")}
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

