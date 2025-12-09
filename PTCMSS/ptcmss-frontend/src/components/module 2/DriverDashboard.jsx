import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  MapPin,
  User,
  Phone,
  PlayCircle,
  CheckCircle2,
  Flag,
  Bell,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  getDriverDashboard,
  getDriverSchedule,
  getDayOffHistory,
  startTrip as apiStartTrip,
  completeTrip as apiCompleteTrip,
} from "../../api/drivers";
import { useWebSocket } from "../../contexts/WebSocketContext";

/**
 * DriverDashboard – M2.S1 (LIGHT THEME VERSION, CONNECTED TO API)
 *
 * - Dashboard tài xế: chuyến hiện tại / sắp tới, thông báo, action nhanh
 * - Giao diện dựa trên bản mock, nhưng dữ liệu lấy từ backend:
 *   + GET /api/drivers/by-user/{userId}/profile
 *   + GET /api/drivers/{driverId}/dashboard
 *   + POST /api/drivers/{driverId}/trips/{tripId}/start
 *   + POST /api/drivers/{driverId}/trips/{tripId}/complete
 */

/* ---------------- helpers ---------------- */
const cls = (...a) => a.filter(Boolean).join(" ");

// HH:MM từ ISO
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

// dd/mm từ ISO
const fmtDM = (iso) => {
  if (!iso) return "--/--";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "--/--";
  }
};

/* ---------------- Toasts ---------------- */
function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = (msg, kind = "info", ttl = 2600) => {
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
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cls(
            "rounded-lg px-3 py-2 text-sm border shadow-lg bg-white",
            t.kind === "success" &&
            "bg-info-50 border-info-200 text-info-700",
            t.kind === "error" &&
            "bg-rose-50 border-rose-200 text-rose-700",
            t.kind === "info" &&
            "bg-sky-50 border-sky-200 text-sky-700"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Avatar tài xế ---------------- */
function DriverAvatar({ name = "Tài xế" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100 shadow-sm text-[12px] font-semibold leading-none">
      {initials || "TX"}
      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-info-500 text-[9px] font-bold text-white ring-1 ring-white shadow-sm">
        ●
      </span>
    </div>
  );
}

/* ---------------- Phase pill client-side ---------------- */
function PhasePill({ phase }) {
  const phaseLabelMap = {
    IDLE: "Không có chuyến",
    READY: "Chờ bắt đầu",
    ON_ROUTE: "Đang di chuyển",
    PICKED: "Đã đón khách",
    DONE: "Hoàn thành",
  };

  const colorMap = {
    IDLE: "bg-slate-100 text-slate-600 border-slate-300",
    READY: "bg-info-50 text-info-700 border-info-300",
    ON_ROUTE: "bg-sky-50 text-sky-700 border-sky-300",
    PICKED: "bg-info-50 text-info-700 border-info-300",
    DONE: "bg-slate-100 text-slate-500 border-slate-300",
  };

  return (
    <span
      className={cls(
        "px-2 py-0.5 rounded-md border text-[10px] font-medium uppercase tracking-wide",
        colorMap[phase] || colorMap.IDLE
      )}
    >
      {phaseLabelMap[phase] || phase}
    </span>
  );
}

/* ---------------- Buttons ---------------- */
function ActionButton({ active, color, icon, label, onClick, loading }) {
  return (
    <button
      onClick={active && !loading ? onClick : undefined}
      disabled={!active || loading}
      className={cls(
        "rounded-md border px-3 py-2 text-sm font-medium flex items-center gap-2 min-w-[150px] justify-center shadow-sm transition-colors",
        active
          ? color === "start"
            ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
            : color === "picked"
              ? "border-info-300 bg-info-50 text-info-700 hover:bg-info-100"
              : "border-info-300 bg-info-50 text-info-800 hover:bg-info-100"
          : "border-slate-200 bg-white text-slate-400 cursor-not-allowed"
      )}
    >
      {icon}
      <span>{loading ? "Đang xử lý..." : label}</span>
    </button>
  );
}

/* ---------------- Notifications ---------------- */
function NotificationsCard({ notifications = [] }) {
  const list = notifications.slice(0, 5);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-sm text-slate-800 font-medium bg-slate-50/80">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100 shadow-sm">
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex-1">Thông báo mới</div>
        <div className="text-[11px] text-slate-500">{list.length} mục</div>
      </div>

      <div className="p-4 space-y-3 text-sm">
        {list.length === 0 ? (
          <div className="text-slate-500 text-xs">Không có thông báo nào.</div>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              className={cls(
                "flex items-start gap-2 rounded-lg border p-3 shadow-sm text-[13px] leading-snug",
                n.type === "warning"
                  ? "border-info-200 bg-info-50 text-info-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
              )}
            >
              <div className="rounded-md p-1.5 shrink-0 bg-white border border-slate-200 text-inherit">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="leading-snug text-slate-800">{n.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50/60">
        Xem tất cả thông báo trong mục Thông báo.
      </div>
    </div>
  );
}

/* ---------------- Trip card ---------------- */
function TripCard({
  activeTrip,
  isCurrent,
  phase,
  onStart,
  onPicked,
  onFinish,
  loading,
  backendStatus,
  isTripToday = true, // Default to true for backward compatibility
}) {
  if (!activeTrip) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm text-slate-500">Không có chuyến nào sắp tới</div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              Bạn đang rảnh 🎉
            </div>
            <div className="text-xs text-slate-500 mt-2 leading-relaxed">
              Khi Điều phối gán chuyến, thông tin sẽ hiện ở đây.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-slate-600">
              Chờ phân công
            </span>
          </div>
        </div>
      </div>
    );
  }

  const t = activeTrip;
  const dateStr = fmtDM(t.pickup_time);
  const timeStr = fmtHM(t.pickup_time);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 p-6">
      {/* top row */}
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="flex-1 min-w-[220px]">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="rounded-md border border-info-300 bg-info-50 text-info-700 px-2 py-0.5 shadow-sm">
              {isCurrent ? "Chuyến hiện tại" : "Chuyến sắp tới"}
            </span>

            <PhasePill phase={phase} />

            {backendStatus && (
              <span className="rounded-md border border-slate-300 bg-slate-50 text-[10px] text-slate-600 px-2 py-0.5">
                Backend: {backendStatus}
              </span>
            )}
          </div>

          <div className="text-lg sm:text-xl font-semibold text-slate-900 mt-3 leading-snug">
            {t.pickup_address} → {t.dropoff_address}
          </div>

          {t.note ? (
            <div className="text-xs text-info-700 flex items-start gap-1 mt-2 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-info-500 shrink-0" />
              <span>Ghi chú: {t.note}</span>
            </div>
          ) : null}
        </div>

        {/* thời gian đón */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 flex flex-col min-w-[120px] shadow-sm">
          <div className="flex items-center gap-1 text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-900 font-semibold mt-1">
            <Clock className="h-3.5 w-3.5 text-slate-700" />
            <span className="tabular-nums text-[13px]">{timeStr}</span>
          </div>
        </div>
      </div>

      {/* trip details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
          <div>
            <div className="text-slate-400 text-[11px] mb-1 uppercase tracking-wide">
              Điểm đón
            </div>
            <div className="text-slate-900 leading-snug">{t.pickup_address}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-primary-600 shrink-0" />
          <div>
            <div className="text-slate-400 text-[11px] mb-1 uppercase tracking-wide">
              Khách hàng
            </div>
            <div className="text-slate-900 leading-snug">
              {t.customer_name || "—"}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 text-primary-600 shrink-0" />
          <div>
            <div className="text-slate-400 text-[11px] mb-1 uppercase tracking-wide">
              Liên hệ
            </div>
            <div className="text-slate-900 leading-snug font-medium">
              {t.customer_phone || "—"}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
          <div>
            <div className="text-slate-400 text-[11px] mb-1 uppercase tracking-wide">
              Quãng đường
            </div>
            <div className="text-slate-900 leading-snug font-semibold">
              {t.distance != null && t.distance !== undefined 
                ? `${Number(t.distance).toFixed(1)} km` 
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Driver/Vehicle & Payment Info */}
      {(t.driver_name || t.vehicle_plate || (t.total_cost && t.total_cost > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 pt-5 border-t border-slate-200">
          {/* Driver & Vehicle Info */}
          {(t.driver_name || t.vehicle_plate) && (
            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-2">
                Thông tin điều phối
              </div>
              {t.driver_name && (
                <div className="flex items-start gap-2 text-sm">
                  <User className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400 text-[11px] mb-0.5">Tài xế</div>
                    <div className="text-slate-900 font-medium">{t.driver_name}</div>
                    {t.driver_phone && (
                      <div className="text-slate-600 text-xs mt-0.5">{t.driver_phone}</div>
                    )}
                  </div>
                </div>
              )}
              {t.vehicle_plate && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-400 text-[11px] mb-0.5">Biển số xe</div>
                    <div className="text-slate-900 font-medium">
                      {t.vehicle_plate}
                      {t.vehicle_model && ` - ${t.vehicle_model}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Info */}
          {t.total_cost && t.total_cost > 0 && (
            <div className="space-y-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-2">
                Thông tin thanh toán
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="text-[11px] text-slate-500 mb-1">Tổng tiền</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums">
                    {Number(t.total_cost || 0).toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                  <div className="text-[11px] text-emerald-600 mb-1">Đã thu</div>
                  <div className="text-base font-bold text-emerald-700 tabular-nums">
                    {Number(t.paid_amount || 0).toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="rounded-lg border border-info-200 bg-info-50 p-2">
                  <div className="text-[11px] text-primary-600 mb-1">Còn lại</div>
                  <div className="text-base font-bold text-info-700 tabular-nums">
                    {Number(t.remaining_amount || 0).toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* actions */}
      {isCurrent ? (
        <div className="flex flex-col gap-3 pt-5 border-t border-slate-200">
          {!isTripToday && phase !== "ON_ROUTE" && phase !== "PICKED" && (
            <div className="rounded-lg border border-info-200 bg-info-50 text-info-700 px-3 py-2 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Chỉ có thể bắt đầu chuyến trong ngày diễn ra. Chuyến đang diễn ra có thể hoàn thành bất cứ lúc nào.</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <ActionButton
              active={phase === "READY" && isTripToday}
              color="start"
              icon={<PlayCircle className="h-4 w-4 shrink-0 text-sky-700" />}
              label="Bắt đầu chuyến"
              onClick={onStart}
              loading={loading}
            />
            <ActionButton
              active={phase === "ON_ROUTE" && isTripToday}
              color="picked"
              icon={
                <CheckCircle2 className="h-4 w-4 shrink-0 text-info-700" />
              }
              label="Đã đón khách"
              onClick={onPicked}
              loading={false}
            />
            <ActionButton
              active={phase === "PICKED" || phase === "ON_ROUTE"}
              color="finish"
              icon={<Flag className="h-4 w-4 shrink-0 text-info-700" />}
              label="Hoàn thành chuyến"
              onClick={onFinish}
              loading={loading}
            />

            <div className="text-[11px] text-slate-500 font-mono ml-auto self-center">
              ID: <span className="text-slate-700">{t.trip_id}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-5 border-slate-200 text-xs text-slate-500 leading-relaxed">
          Chuyến này chưa bắt đầu · Bạn sẽ được nhắc khi đến giờ đón.
        </div>
      )}
    </div>
  );
}

/* ---------------- Stats Card ---------------- */
function StatsCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#0079BC]" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          {sublabel && (
            <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main page ---------------- */
export default function DriverDashboard() {
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  
  // Get WebSocket notifications for real-time updates
  const { notifications: wsNotifications } = useWebSocket();

  const [driver, setDriver] = React.useState(null);
  const [trip, setTrip] = React.useState(null);
  const [upcomingTrips, setUpcomingTrips] = React.useState([]);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [tripLoading, setTripLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [phase, setPhase] = React.useState("IDLE");
  const [stats, setStats] = React.useState({
    tripsToday: 0,
    tripsThisMonth: 0,
    daysOffUsed: 0,
    daysOffAllowed: 2,
  });

  const fetchDashboard = React.useCallback(async (driverId) => {
    if (!driverId) return;
    setTripLoading(true);
    setError("");
    try {
      const dash = await getDriverDashboard(driverId);

      let mapped = null;
      if (dash && dash.tripId) {
        // Check if trip is today
        const tripDate = new Date(dash.startTime);
        const today = new Date();
        const isToday =
          tripDate.getDate() === today.getDate() &&
          tripDate.getMonth() === today.getMonth() &&
          tripDate.getFullYear() === today.getFullYear();

        // Only show trip if it's today
        if (isToday) {
          mapped = {
            tripId: dash.tripId,
            pickupAddress: dash.startLocation,
            dropoffAddress: dash.endLocation ?? dash.EndLocation,
            pickupTime: dash.startTime,
            endTime: dash.endTime,
            status: dash.status || "SCHEDULED",
            customerName: dash.customerName,
            customerPhone: dash.customerPhone,
            distance: dash.distance,
            driverName: dash.driverName,
            driverPhone: dash.driverPhone,
            vehiclePlate: dash.vehiclePlate,
            vehicleModel: dash.vehicleModel,
            totalCost: dash.totalCost,
            paidAmount: dash.paidAmount,
            remainingAmount: dash.remainingAmount,
          };
        }
      }
      setTrip(mapped);

      // Load schedule and calculate statistics
      try {
        const schedule = await getDriverSchedule(driverId);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        if (Array.isArray(schedule)) {
          // Calculate tripsToday - count all trips today (including COMPLETED, ONGOING, etc.)
          const tripsToday = schedule.filter((t) => {
            const tripDate = new Date(t.startTime || t.start_time);
            return (
              tripDate.getDate() === today.getDate() &&
              tripDate.getMonth() === today.getMonth() &&
              tripDate.getFullYear() === today.getFullYear()
            );
          }).length;

          // Calculate tripsThisMonth - count all trips in current month
          const tripsThisMonth = schedule.filter((t) => {
            const tripDate = new Date(t.startTime || t.start_time);
            return (
              tripDate.getMonth() === currentMonth &&
              tripDate.getFullYear() === currentYear
            );
          }).length;

          // Update stats
          setStats((prev) => ({
            ...prev,
            tripsToday,
            tripsThisMonth,
          }));

          // Filter upcoming trips for display
          const upcoming = schedule
              .filter((t) => {
                // Filter for today's trips only
                const tripDate = new Date(t.startTime || t.start_time);
                const isToday = (
                  tripDate.getDate() === today.getDate() &&
                  tripDate.getMonth() === today.getMonth() &&
                  tripDate.getFullYear() === today.getFullYear()
                );
                // Bao gồm cả SCHEDULED và ASSIGNED (đã phân xe)
                const validStatus = t.status === "SCHEDULED" || t.status === "ASSIGNED";
                return isToday && validStatus;
              })
              .slice(0, 10) // Show max 10 today's trips
              .map((t) => ({
                tripId: t.tripId || t.trip_id,
                pickupAddress: t.startLocation || t.start_location || "—",
                dropoffAddress: t.endLocation || t.end_location || "—",
                pickupTime: t.startTime || t.start_time,
                customerName: t.customerName || t.customer_name,
                status: t.status || "SCHEDULED",
              }));
          setUpcomingTrips(upcoming);
        } else {
          setUpcomingTrips([]);
        }
      } catch (err) {
        console.error("Error loading schedule:", err);
        setUpcomingTrips([]);
      }

    } catch (err) {
      setTrip(null);
      setError(
        err?.data?.message || err?.message || "Không tải được chuyến hiện tại."
      );
    } finally {
      setTripLoading(false);
    }
  }, []);

  // load driver + first dashboard
  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const uid = getCookie("userId");
        if (!uid) {
          if (mounted) {
            setError("Không tìm thấy thông tin đăng nhập.");
          }
          return;
        }
        const profile = await getDriverProfileByUser(uid);
        if (!mounted) return;
        setDriver(profile);
        await fetchDashboard(profile.driverId);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.data?.message ||
          err?.message ||
          "Không tải được dữ liệu tài xế."
        );
      } finally {
        if (mounted) setPageLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [fetchDashboard]);

  // Load days off for current month
  React.useEffect(() => {
    if (!driver?.driverId) return;

    async function loadDaysOff() {
      try {
        const dayOffList = await getDayOffHistory(driver.driverId);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter approved day-offs in current month
        const approvedDayOffs = Array.isArray(dayOffList)
          ? dayOffList.filter((dayOff) => {
              if (dayOff.status !== "APPROVED") return false;
              
              // Get date from various possible fields
              const leaveDate = dayOff.date || dayOff.leaveDate || dayOff.startDate;
              if (!leaveDate) return false;

              const date = new Date(leaveDate);
              if (isNaN(date.getTime())) return false;

              // Check if in current month
              return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
          : [];

        // Count days (handle range: startDate to endDate)
        let daysOffUsed = 0;
        approvedDayOffs.forEach((dayOff) => {
          const startDate = new Date(dayOff.startDate || dayOff.date || dayOff.leaveDate);
          const endDate = dayOff.endDate ? new Date(dayOff.endDate) : startDate;
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            // Calculate days in range, but only count days in current month
            const monthStart = new Date(currentYear, currentMonth, 1);
            const monthEnd = new Date(currentYear, currentMonth + 1, 0);
            
            // Normalize to start of day for accurate comparison
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            monthStart.setHours(0, 0, 0, 0);
            monthEnd.setHours(23, 59, 59, 999);
            
            const start = new Date(Math.max(startDate.getTime(), monthStart.getTime()));
            const end = new Date(Math.min(endDate.getTime(), monthEnd.getTime()));
            
            if (end >= start) {
              // Calculate inclusive days: (end - start) / ms_per_day + 1
              const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              daysOffUsed += diffDays;
            }
          } else {
            // Single day
            daysOffUsed += 1;
          }
        });

        // Get days off allowed (default to 2, or from profile/config if available)
        const daysOffAllowed = driver?.daysOffAllowed || 2;

        setStats((prev) => ({
          ...prev,
          daysOffUsed,
          daysOffAllowed,
        }));
      } catch (err) {
        // Keep default values on error
      }
    }

    loadDaysOff();
  }, [driver?.driverId]);

  // sync phase theo backend status
  React.useEffect(() => {
    if (!trip) {
      setPhase("IDLE");
      return;
    }
    switch (trip.status) {
      case "SCHEDULED":
        setPhase("READY");
        break;
      case "ONGOING":
        setPhase("ON_ROUTE");
        break;
      case "COMPLETED":
        setPhase("DONE");
        break;
      default:
        setPhase("READY");
    }
  }, [trip?.status]);

  const handleStart = async () => {
    if (!driver?.driverId || !trip?.tripId) return;
    try {
      setTripLoading(true);
      await apiStartTrip(driver.driverId, trip.tripId);
      push("Đã chuyển chuyến sang trạng thái Đang thực hiện.", "success");
      await fetchDashboard(driver.driverId);
    } catch (err) {
      push(
        err?.data?.message || err?.message || "Không thể bắt đầu chuyến.",
        "error"
      );
    } finally {
      setTripLoading(false);
    }
  };

  const handlePicked = () => {
    // bước trung gian client-side, không gọi API
    if (phase === "ON_ROUTE") {
      setPhase("PICKED");
      push("Đã xác nhận đón khách (client-side).", "info");
    }
  };

  const handleComplete = async () => {
    if (!driver?.driverId || !trip?.tripId) return;
    try {
      setTripLoading(true);
      await apiCompleteTrip(driver.driverId, trip.tripId);
      push("Đã đánh dấu chuyến hoàn thành.", "success");
      await fetchDashboard(driver.driverId);
    } catch (err) {
      push(
        err?.data?.message || err?.message || "Không thể hoàn thành chuyến.",
        "error"
      );
    } finally {
      setTripLoading(false);
    }
  };

  const driverName = driver?.fullName || "Tài xế";
  const branchName = driver?.branchName || "—";

  const activeTrip = trip
    ? {
      trip_id: trip.tripId,
      pickup_time: trip.pickupTime,
      pickup_address: trip.pickupAddress,
      dropoff_address: trip.dropoffAddress,
      customer_name: trip.customerName,
      customer_phone: trip.customerPhone,
      distance: trip.distance,
      driver_name: trip.driverName,
      driver_phone: trip.driverPhone,
      vehicle_plate: trip.vehiclePlate,
      vehicle_model: trip.vehicleModel,
      total_cost: trip.totalCost,
      paid_amount: trip.paidAmount,
      remaining_amount: trip.remainingAmount,
      note: null,
    }
    : null;

  // Check if trip is today
  const isTripToday = React.useMemo(() => {
    if (!trip?.pickupTime) return false;
    const tripDate = new Date(trip.pickupTime);
    const today = new Date();
    return (
      tripDate.getDate() === today.getDate() &&
      tripDate.getMonth() === today.getMonth() &&
      tripDate.getFullYear() === today.getFullYear()
    );
  }, [trip?.pickupTime]);

  // Format WebSocket notifications for display
  const notifications = React.useMemo(() => {
    const formatted = (wsNotifications || []).slice(0, 5).map(n => ({
      id: n.id,
      type: n.type === "SUCCESS" ? "success" : n.type === "ERROR" ? "error" : "info",
      text: n.message || n.title || "Thông báo mới",
    }));
    
    // If no notifications, show default message
    if (formatted.length === 0) {
      return [{
        id: "default",
        type: "info",
        text: "Điều phối sẽ thông báo cho bạn khi có chuyến mới.",
      }];
    }
    return formatted;
  }, [wsNotifications]);

  // Get current month name
  const currentMonthName = new Date().toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <Toasts toasts={toasts} />

      {/* HEADER */}
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-[200px]">
          <DriverAvatar name={driverName} />

          <div className="flex flex-col leading-tight">
            <div className="text-sm text-slate-600">
              Xin chào,
              <span className="text-slate-900 font-semibold ml-1">
                {driverName}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed">
              {branchName}
            </div>

            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-info-300 bg-info-50 px-2 py-1 text-[11px] text-info-700 font-medium shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-info-500 animate-pulse" />
              Sẵn sàng nhận chuyến
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {(pageLoading || tripLoading) && (
        <div className="mb-4 text-sm text-slate-500">
          Đang tải dữ liệu bảng điều khiển...
        </div>
      )}

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={Clock}
          label="Số chuyến hôm nay"
          value={stats.tripsToday}
        />
        <StatsCard
          icon={Calendar}
          label="Số chuyến trong tháng"
          value={stats.tripsThisMonth}
          sublabel={currentMonthName}
        />
        <StatsCard
          icon={Calendar}
          label="Số buổi nghỉ trong tháng"
          value={`${stats.daysOffUsed}/${stats.daysOffAllowed}`}
          sublabel="Đã nghỉ / Cho phép"
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-6">
        <TripCard
          activeTrip={activeTrip}
          isCurrent={!!activeTrip}
          phase={phase}
          onStart={handleStart}
          onPicked={handlePicked}
          onFinish={handleComplete}
          loading={tripLoading}
          backendStatus={trip?.status}
          isTripToday={isTripToday}
        />

        <div className="flex flex-col gap-6">
          <NotificationsCard notifications={notifications} />
        </div>
      </div>

      {/* UPCOMING TRIPS */}
      {upcomingTrips.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-sm text-slate-800 font-medium bg-slate-50/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100 shadow-sm">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1">Chuyến hôm nay</div>
            <div className="text-[11px] text-slate-500">{upcomingTrips.length} chuyến</div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingTrips.map((upTrip) => (
              <div
                key={upTrip.tripId}
                onClick={() => navigate(`/driver/trips/${upTrip.tripId}`)}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-[#0079BC]/50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 leading-tight truncate">
                      {upTrip.pickupAddress} → {upTrip.dropoffAddress}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{fmtHM(upTrip.pickupTime)} · {fmtDM(upTrip.pickupTime)}</span>
                </div>

                {upTrip.customerName && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{upTrip.customerName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
