import React from "react";
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
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  getDriverDashboard,
  startTrip as apiStartTrip,
  completeTrip as apiCompleteTrip,
} from "../../api/drivers";

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
              "bg-emerald-50 border-emerald-200 text-emerald-700",
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
      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white ring-1 ring-white shadow-sm">
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
    READY: "bg-amber-50 text-amber-700 border-amber-300",
    ON_ROUTE: "bg-sky-50 text-sky-700 border-sky-300",
    PICKED: "bg-emerald-50 text-emerald-700 border-emerald-300",
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
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
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
                  ? "border-amber-200 bg-amber-50 text-amber-800"
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

/* ---------------- Quick actions ---------------- */
function QuickActions({ onLeave, onVehicleCheck }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="px-4 py-3 border-b border-slate-200 text-sm text-slate-800 font-medium flex items-center gap-2 bg-slate-50/80">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100 shadow-sm">
          <AlertCircle className="h-4 w-4" />
        </div>
        Hành động nhanh
      </div>

      <div className="p-4 flex flex-col gap-3 text-sm">
        <button
          onClick={onLeave}
          className="group w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-left px-4 py-3 flex flex-col gap-1 shadow-sm transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 border border-amber-300 text-amber-700 text-[10px] font-semibold shadow-sm">
              !
            </span>
            Đăng ký nghỉ ca
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            Gửi yêu cầu phê duyệt cho Điều phối
          </div>
        </button>

        <button
          onClick={onVehicleCheck}
          className="group w-full rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-left px-4 py-3 flex flex-col gap-1 shadow-sm transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 border border-emerald-300 text-emerald-700 text-[10px] font-semibold shadow-sm">
              ✓
            </span>
            Báo cáo tình trạng xe
          </div>
          <div className="text-[11px] text-slate-500 leading-snug">
            Check list trước ca lái
          </div>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50/60">
        Một số yêu cầu có thể cần duyệt.
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
            <span className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-0.5 shadow-sm">
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
            <div className="text-xs text-amber-700 flex items-start gap-1 mt-2 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 text-sm text-slate-700">
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
          <User className="h-4 w-4 text-emerald-600 shrink-0" />
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
          <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <div className="text-slate-400 text-[11px] mb-1 uppercase tracking-wide">
              Liên hệ
            </div>
            <div className="text-slate-900 leading-snug">
              {t.customer_phone || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* actions */}
      {isCurrent ? (
        <div className="flex flex-wrap gap-3 pt-5 border-t border-slate-200">
          <ActionButton
            active={phase === "READY"}
            color="start"
            icon={<PlayCircle className="h-4 w-4 shrink-0 text-sky-700" />}
            label="Bắt đầu chuyến"
            onClick={onStart}
            loading={loading}
          />
          <ActionButton
            active={phase === "ON_ROUTE"}
            color="picked"
            icon={
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            }
            label="Đã đón khách"
            onClick={onPicked}
            loading={false}
          />
          <ActionButton
            active={phase === "PICKED"}
            color="finish"
            icon={<Flag className="h-4 w-4 shrink-0 text-amber-700" />}
            label="Hoàn thành chuyến"
            onClick={onFinish}
            loading={loading}
          />

          <div className="text-[11px] text-slate-500 font-mono ml-auto self-center">
            ID: <span className="text-slate-700">{t.trip_id}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-5 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
          Chuyến này chưa bắt đầu · Bạn sẽ được nhắc khi đến giờ đón.
        </div>
      )}
    </div>
  );
}

/* ---------------- Main page ---------------- */
export default function DriverDashboard() {
  const { toasts, push } = useToasts();

  const [driver, setDriver] = React.useState(null);
  const [trip, setTrip] = React.useState(null);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [tripLoading, setTripLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [phase, setPhase] = React.useState("IDLE");

  const fetchDashboard = React.useCallback(async (driverId) => {
    if (!driverId) return;
    setTripLoading(true);
    setError("");
    try {
      const dash = await getDriverDashboard(driverId);
      const mapped =
        dash && dash.tripId
          ? {
              tripId: dash.tripId,
              pickupAddress: dash.startLocation,
              dropoffAddress: dash.endLocation ?? dash.EndLocation,
              pickupTime: dash.startTime,
              endTime: dash.endTime,
              status: dash.status || "SCHEDULED",
            }
          : null;
      setTrip(mapped);
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

  const requestLeave = () => {
    push("Mở form xin nghỉ (M2.S4) - TODO nối DriverLeaveRequestPage.", "info");
  };

  const vehicleCheck = () => {
    push("Đã gửi báo cáo tình trạng xe (demo).", "info");
  };

  const driverName = driver?.fullName || "Tài xế";
  const branchName = driver?.branchName || "—";

  const activeTrip = trip
    ? {
        trip_id: trip.tripId,
        pickup_time: trip.pickupTime,
        pickup_address: trip.pickupAddress,
        dropoff_address: trip.dropoffAddress,
        customer_name: null,
        customer_phone: null,
        note: null,
      }
    : null;

  // demo notifications – sau này có thể lấy từ API khác
  const notifications = [
    {
      id: 1,
      type: "info",
      text: "Điều phối sẽ thông báo cho bạn khi có chuyến mới.",
    },
  ];

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

            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 font-medium shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sẵn sàng nhận chuyến
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm">
            <div className="uppercase tracking-wide text-[10px] text-slate-400">
              Trạng thái chuyến (UI)
            </div>
            <div className="font-mono text-slate-900 text-xs mt-0.5">
              {phase}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm">
            <div className="uppercase tracking-wide text-[10px] text-slate-400">
              Trạng thái backend
            </div>
            <div className="font-mono text-slate-900 text-xs mt-0.5">
              {trip?.status || "—"}
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

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <TripCard
          activeTrip={activeTrip}
          isCurrent={!!activeTrip}
          phase={phase}
          onStart={handleStart}
          onPicked={handlePicked}
          onFinish={handleComplete}
          loading={tripLoading}
          backendStatus={trip?.status}
        />

        <div className="flex flex-col gap-6">
          <NotificationsCard notifications={notifications} />
          <QuickActions onLeave={requestLeave} onVehicleCheck={vehicleCheck} />
        </div>
      </div>
    </div>
  );
}
