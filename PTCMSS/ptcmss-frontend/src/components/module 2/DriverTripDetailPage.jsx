import React from "react";
import { useParams } from "react-router-dom";
import {
  Phone,
  MapPin,
  Navigation,
  Clock,
  CarFront,
  StickyNote,
  BadgeDollarSign,
  CheckCircle2,
  Flag,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Star,
} from "lucide-react";
import TripExpenseModal from "./TripExpenseModal.jsx";
import TripPaymentRequestModal from "./TripPaymentRequestModal.jsx";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  getDriverDashboard,
  startTrip as apiStartTrip,
  completeTrip as apiCompleteTrip,
} from "../../api/drivers";
import { getTripDetail } from "../../api/dispatch";

const cls = (...a) => a.filter(Boolean).join(" ");
const fmtVND = (n) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));
const fmtDateTime = (isoLike) => {
  if (!isoLike) return "--:--";
  const safe = isoLike.replace(" ", "T");
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return isoLike;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ${dd}/${MM}`;
};

const STATUS_FROM_BACKEND = {
  SCHEDULED: "NOT_STARTED",
  ASSIGNED: "NOT_STARTED", // ASSIGNED = đã phân xe/tài xế, nhưng vẫn chưa bắt đầu
  ONGOING: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

function normalizeTripDetail(payload) {
  if (!payload) return null;
  return {
    id: payload.tripId,
    code: `TRIP-${payload.tripId}`,
    status: STATUS_FROM_BACKEND[payload.status] || "NOT_STARTED",
    pickup_location: payload.startLocation || "",
    dropoff_location: payload.endLocation || "",
    pickup_time: payload.startTime || "",
    dropoff_time: payload.endTime || payload.end_time || "",
    customer_name: payload.customerName || "",
    customer_phone: payload.customerPhone || "",
    vehicle_id: payload.vehicleId || null,
    vehicle_plate: payload.vehiclePlate || "Chưa gán xe",
    vehicle_type: payload.vehicleModel || "",
    booking_note: payload.bookingNote || "",
    hire_type: payload.hireType || "", // ONE_WAY, ROUND_TRIP, DAILY, MULTI_DAY
    hire_type_name: payload.hireTypeName || "", // "Một chiều", "Hai chiều", etc.
    total_cost: payload.totalCost || 0,
    deposit_amount: payload.depositAmount || 0,
    remaining_amount: payload.remainingAmount || 0,
    booking_id: payload.bookingId || null,
    rating: payload.rating ? Number(payload.rating) : 0,
    rating_comment: payload.ratingComment || payload.rating_comment || "",
  };
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const pushToast = (msg, kind = "info", ttl = 2200) => {
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
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cls(
            "rounded-lg px-3 py-2 text-sm border shadow bg-white",
            t.kind === "success" && "bg-amber-50 border-amber-200 text-amber-700",
            t.kind === "error" && "bg-rose-50 border-rose-200 text-rose-700",
            t.kind === "info" && "bg-blue-50 border-blue-200 text-blue-700"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 font-semibold text-slate-800 text-sm">{title}</div>
        <div className="px-5 py-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">{message}</div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    NOT_STARTED: {
      label: "Chưa bắt đầu",
      cls: "bg-slate-100 text-slate-700 border-slate-300",
      icon: <Flag className="h-3.5 w-3.5 text-slate-500" />,
    },
    IN_PROGRESS: {
      label: "Đang di chuyển",
      cls: "bg-sky-50 text-sky-700 border-sky-200",
      icon: <Navigation className="h-3.5 w-3.5 text-sky-500" />,
    },
    COMPLETED: {
      label: "Hoàn thành",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />,
    },
  };
  const info = map[status] || map.NOT_STARTED;
  return (
    <span className={cls("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border font-medium", info.cls)}>
      {info.icon}
      <span>{info.label}</span>
    </span>
  );
}

function ProgressSteps({ status }) {
  const steps = [
    { key: "NOT_STARTED", label: "Chưa bắt đầu" },
    { key: "IN_PROGRESS", label: "Đang chạy" },
    { key: "COMPLETED", label: "Hoàn thành" },
  ];
  const idxActive = steps.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {steps.map((st, idx) => {
        const done = idx <= idxActive;
        return (
          <React.Fragment key={st.key}>
            <div className="flex items-center gap-2">
              <div
                className={cls(
                  "h-6 w-6 flex items-center justify-center rounded-full text-[11px] font-semibold border shadow-sm",
                  done ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-300 text-slate-400"
                )}
              >
                {idx + 1}
              </div>
              <div className={cls("text-xs font-medium leading-none", done ? "text-slate-800" : "text-slate-400")}>
                {st.label}
              </div>
            </div>
            {idx < steps.length - 1 ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TripMetaCard({ trip }) {
  const isOneWay = trip.hire_type === "ONE_WAY";
  const isRoundTrip = trip.hire_type === "ROUND_TRIP";
  const isDaily = trip.hire_type === "DAILY" || trip.hire_type === "MULTI_DAY";
  
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-inner">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
        <StickyNote className="h-3.5 w-3.5 text-amber-500" />
        Thông tin chung
      </div>
      <div className="grid gap-3 text-sm text-slate-700">
        <div>
          <div className="text-xs text-slate-500">Mã chuyến</div>
          <div className="font-semibold text-slate-900">{trip.code}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Hình thức thuê</div>
          <div className="flex items-center gap-2">
            {trip.hire_type_name ? (
              <span className={cls(
                "px-2.5 py-1 rounded-full text-xs font-semibold border",
                isOneWay && "bg-blue-50 text-blue-700 border-blue-200",
                isRoundTrip && "bg-emerald-50 text-emerald-700 border-emerald-200",
                isDaily && "bg-purple-50 text-purple-700 border-purple-200"
              )}>
                {trip.hire_type_name}
              </span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
            {isRoundTrip && (
              <span className="text-[11px] text-emerald-600 font-medium">
                (Sẽ quay lại điểm đón)
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Khách hàng</div>
          <div className="font-semibold text-slate-900">{trip.customer_name || "—"}</div>
          {trip.customer_phone && (
            <a href={`tel:${trip.customer_phone}`} className="text-sky-600 text-xs hover:underline flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {trip.customer_phone}
            </a>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500">Thông tin xe</div>
          <div className="font-semibold text-slate-900">
            {trip.vehicle_plate} {trip.vehicle_type ? `· ${trip.vehicle_type}` : ""}
          </div>
        </div>
        {trip.booking_note && (
          <div>
            <div className="text-xs text-slate-500">Ghi chú đơn hàng</div>
            <div className="text-slate-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[13px] leading-relaxed">
              {trip.booking_note}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ pickupLocation, dropoffLocation, pickupTime, dropoffTime, hireType, hireTypeName }) {
  const isOneWay = hireType === "ONE_WAY";
  const isRoundTrip = hireType === "ROUND_TRIP";
  const isDaily = hireType === "DAILY" || hireType === "MULTI_DAY";
  
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium uppercase tracking-wide">
          <Navigation className="h-4 w-4 text-sky-600" />
          Lộ trình
        </div>
        {/* Badge hiển thị loại chuyến */}
        {hireTypeName && (
          <div className={cls(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold border",
            isOneWay && "bg-blue-50 text-blue-700 border-blue-200",
            isRoundTrip && "bg-emerald-50 text-emerald-700 border-emerald-200",
            isDaily && "bg-purple-50 text-purple-700 border-purple-200"
          )}>
            {hireTypeName}
          </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1 flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <div className="flex-1 w-px bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-rose-500" />
          </div>
          <div className="space-y-6 text-sm text-slate-700">
            <div>
              <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                Điểm đón
              </div>
              <div className="font-semibold text-slate-900">{pickupLocation || "—"}</div>
              <div className="text-xs text-slate-500">Thời gian: {fmtDateTime(pickupTime)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                {isOneWay ? "Điểm đến" : isRoundTrip ? "Điểm đến (sẽ quay lại)" : "Điểm đến"}
              </div>
              <div className="font-semibold text-slate-900">{dropoffLocation || "—"}</div>
              <div className="text-xs text-slate-500">
                {isOneWay 
                  ? `Kết thúc: ${dropoffTime ? fmtDateTime(dropoffTime) : "Sau khi đón khách"}`
                  : isRoundTrip
                  ? `Về lại: ${dropoffTime ? fmtDateTime(dropoffTime) : "Sau khi đến điểm đến"}`
                  : `Kết thúc: ${dropoffTime ? fmtDateTime(dropoffTime) : "Sau khi đón khách"}`
                }
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium mb-1">
              {isOneWay 
                ? "Chuyến một chiều"
                : isRoundTrip
                ? "Chuyến hai chiều - sẽ quay lại điểm đón"
                : "Chuyến theo ngày"
              }
            </div>
            <span>Đến điểm đón đúng giờ và gọi khách trước ~10 phút.</span>
            {isRoundTrip && (
              <div className="mt-1 text-[11px] text-amber-700">
                ⚠️ Sau khi đến điểm đến, quay lại điểm đón ban đầu.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getNextStepInfo(status) {
  if (status === "NOT_STARTED") {
    return { btnText: "Bắt đầu chuyến", to: "IN_PROGRESS", desc: "Xác nhận bắt đầu di chuyển đến điểm đón." };
  }
  if (status === "IN_PROGRESS") {
    return { btnText: "Hoàn thành chuyến", to: "COMPLETED", desc: "Xác nhận đã đưa khách đến điểm đến." };
  }
  return null;
}

export default function DriverTripDetailPage() {
  const { tripId: routeTripId } = useParams();
  const [driver, setDriver] = React.useState(null);
  const [trip, setTrip] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [nextStatus, setNextStatus] = React.useState("");
  const [nextLabel, setNextLabel] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const { toasts, pushToast } = useToasts();

  const loadTripDetail = React.useCallback(async (targetTripId, { silent } = {}) => {
    if (!targetTripId) return;
    if (silent) setDetailLoading(true);
    else setLoading(true);
    try {
      const detail = await getTripDetail(targetTripId);
      setTrip(normalizeTripDetail(detail));
      setError("");
    } catch (err) {
      setTrip(null);
      setError(err?.data?.message || err?.message || "Không tải được chi tiết chuyến.");
    } finally {
      if (silent) setDetailLoading(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const uid = getCookie("userId");
        if (!uid) throw new Error("Không xác định tài khoản.");
        const profile = await getDriverProfileByUser(uid);
        if (cancelled) return;
        setDriver(profile);

        let explicitTripId = Number(routeTripId);
        if (!Number.isFinite(explicitTripId) || explicitTripId <= 0) explicitTripId = null;
        let targetTripId = explicitTripId;
        if (!targetTripId) {
          const dash = await getDriverDashboard(profile.driverId);
          if (cancelled) return;
          targetTripId = dash?.tripId || null;
        }
        if (!targetTripId) {
          setTrip(null);
          setError("Bạn hiện chưa có chuyến nào được giao.");
          setLoading(false);
          return;
        }
        await loadTripDetail(targetTripId);
      } catch (err) {
        if (!cancelled) {
          setTrip(null);
          setError(err?.data?.message || err?.message || "Không tải được chi tiết chuyến.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [routeTripId, loadTripDetail]);

  const stepInfo = trip ? getNextStepInfo(trip.status) : null;

  // Check if trip is today
  const isTripToday = React.useMemo(() => {
    if (!trip?.pickup_time) return false;
    const tripDate = new Date(trip.pickup_time);
    const today = new Date();
    return (
      tripDate.getDate() === today.getDate() &&
      tripDate.getMonth() === today.getMonth() &&
      tripDate.getFullYear() === today.getFullYear()
    );
  }, [trip?.pickup_time]);

  // Check if trip is in the future
  const isTripFuture = React.useMemo(() => {
    if (!trip?.pickup_time) return false;
    const tripDate = new Date(trip.pickup_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    tripDate.setHours(0, 0, 0, 0);
    return tripDate > today;
  }, [trip?.pickup_time]);

  // Chỉ được cập nhật nếu: 
  // 1. Chuyến đang diễn ra (IN_PROGRESS) - cho phép hoàn thành bất kể ngày bắt đầu
  // 2. HOẶC chuyến HÔM NAY + chưa hoàn thành (cho phép bắt đầu)
  const isCompleted = trip?.status === "COMPLETED";
  const isInProgress = trip?.status === "IN_PROGRESS";
  // Cho phép cập nhật nếu: (đang diễn ra) HOẶC (hôm nay + chưa hoàn thành + không phải tương lai)
  const canUpdateStatus = (isInProgress || (isTripToday && !isTripFuture)) && !isCompleted;

  // Cho phép báo cáo chi phí: chuyến đã bắt đầu (IN_PROGRESS hoặc COMPLETED) và trong vòng 7 ngày gần đây
  const canReportExpense = React.useMemo(() => {
    if (!trip?.pickup_time) return false;
    const tripDate = new Date(trip.pickup_time);
    const today = new Date();
    const daysDiff = Math.floor((today - tripDate) / (1000 * 60 * 60 * 24));
    
    // Cho phép báo cáo chi phí nếu:
    // 1. Chuyến đang IN_PROGRESS hoặc COMPLETED
    // 2. Chuyến trong vòng 7 ngày gần đây (bao gồm cả tương lai)
    return (trip.status === "IN_PROGRESS" || trip.status === "COMPLETED") && daysDiff >= -1 && daysDiff <= 7;
  }, [trip?.pickup_time, trip?.status]);

  const requestStatusChange = () => {
    if (!stepInfo || actionLoading || detailLoading || !canUpdateStatus) return;
    setNextStatus(stepInfo.to);
    setNextLabel(stepInfo.btnText);
    setConfirmOpen(true);
  };

  const doChangeStatus = async () => {
    if (!trip || !driver || !nextStatus) return;
    setConfirmOpen(false);
    setActionLoading(true);
    try {
      if (nextStatus === "IN_PROGRESS") await apiStartTrip(driver.driverId, trip.id);
      else if (nextStatus === "COMPLETED") await apiCompleteTrip(driver.driverId, trip.id);
      pushToast("Đã cập nhật trạng thái chuyến.", "success");
      await loadTripDetail(trip.id, { silent: true });
      
      // Sau khi hoàn thành chuyến, nếu còn tiền chưa thanh toán → tự động mở modal tạo payment request
      if (nextStatus === "COMPLETED" && trip.remaining_amount > 0) {
        setTimeout(() => {
          setPaymentOpen(true);
          pushToast("Vui lòng tạo yêu cầu thanh toán cho số tiền còn lại.", "info");
        }, 500);
      }
    } catch (err) {
      pushToast(err?.data?.message || err?.message || "Không thể cập nhật trạng thái chuyến.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const tripRouteLabel = trip ? `${trip.pickup_location} -> ${trip.dropoff_location}` : "";

  const handleExpenseSubmitted = ({ amount }) => {
    pushToast(`Đã gửi báo cáo chi phí +${Number(amount || 0).toLocaleString("vi-VN")}đ`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <Toasts toasts={toasts} />
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-3 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          <span>Đang tải chi tiết chuyến...</span>
        </div>
      ) : trip ? (
        <>
          {detailLoading && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              <span>Đang cập nhật dữ liệu...</span>
            </div>
          )}
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-5">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-wrap items-start gap-3">
                <div className="text-2xl font-semibold text-slate-900 flex items-center gap-2 leading-tight">
                  <Flag className="h-6 w-6 text-amber-600" />
                  <span>Chi tiết chuyến</span>
                </div>
                <StatusChip status={trip.status} />
              </div>
              <div className="text-[12px] text-slate-600 flex flex-wrap items-center gap-3 leading-relaxed">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Đón lúc{" "}
                    <span className="text-slate-800 font-semibold">
                      {fmtDateTime(trip.pickup_time)}
                    </span>
                  </span>
                </div>
                <div className="hidden sm:block text-slate-300">·</div>
                <div className="flex items-center gap-1">
                  <CarFront className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-slate-700">
                    {trip.vehicle_plate} {trip.vehicle_type ? `· ${trip.vehicle_type}` : ""}
                  </span>
                </div>
                <div className="hidden sm:block text-slate-300">·</div>
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-sky-600" />
                  <a href={`tel:${trip.customer_phone}`} className="text-sky-600 hover:underline font-medium">
                    {trip.customer_phone}
                  </a>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              {/* Chuyến chưa tới ngày */}
              {isTripFuture && (
                <div className="rounded-xl border border-slate-300 bg-slate-50 text-slate-600 text-xs font-medium px-4 py-2 flex items-center gap-2 justify-center shadow-sm">
                  <AlertTriangle className="h-4 w-4 text-slate-500" />
                  Chuyến chưa tới ngày
                </div>
              )}

              {/* Đã hoàn thành - chỉ hiển thị badge */}
              {isCompleted && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium px-4 py-2 flex items-center gap-2 justify-center shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  Đã hoàn thành chuyến
                </div>
              )}

              {/* Nút cập nhật trạng thái - chỉ hiển thị khi HÔM NAY + chưa hoàn thành */}
              {stepInfo && canUpdateStatus && (
                <button
                  onClick={requestStatusChange}
                  disabled={actionLoading || detailLoading}
                  className={cls(
                    "rounded-xl text-white font-semibold text-sm px-4 py-2 shadow-[0_12px_24px_rgba(16,185,129,0.35)] transition-colors bg-gradient-to-r from-sky-600 to-blue-500 hover:from-blue-500 hover:to-emerald-400",
                    actionLoading || detailLoading ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {actionLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </span>
                  ) : (
                    stepInfo.btnText
                  )}
                </button>
              )}

              {/* Nút Yêu cầu thanh toán - hiển thị khi:
                  1. IN_PROGRESS (trước khi hoàn thành)
                  2. COMPLETED nhưng còn tiền chưa thanh toán */}
              {(canUpdateStatus && trip?.status === "IN_PROGRESS") || 
               (trip?.status === "COMPLETED" && trip?.remaining_amount > 0) ? (
                <button
                  onClick={() => setPaymentOpen(true)}
                  className="rounded-xl border border-[#0079BC] bg-[#0079BC] hover:bg-[#0079BC]/90 text-white text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-sm"
                >
                  <BadgeDollarSign className="h-4 w-4" />
                  <span>Yêu cầu thanh toán</span>
                </button>
              ) : null}

              {/* Nút Báo cáo chi phí - cho phép khi chuyến đã bắt đầu (IN_PROGRESS hoặc COMPLETED) trong vòng 7 ngày */}
              {canReportExpense && (
                <button
                  onClick={() => setExpenseOpen(true)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm text-slate-700 px-4 py-2 flex items-center justify-center gap-2 shadow-sm"
                >
                  <BadgeDollarSign className="h-4 w-4 text-amber-600" />
                  <span>Báo cáo chi phí</span>
                </button>
              )}
            </div>
          </div>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-sky-600" />
              Tiến trình chuyến đi
            </div>
            <ProgressSteps status={trip.status} />
          </div>
          <div className="grid xl:grid-cols-2 gap-5">
            <TripMetaCard trip={trip} />
            <RouteCard 
              pickupLocation={trip.pickup_location} 
              dropoffLocation={trip.dropoff_location} 
              pickupTime={trip.pickup_time}
              dropoffTime={trip.dropoff_time}
              hireType={trip.hire_type}
              hireTypeName={trip.hire_type_name}
            />
          </div>

          {/* Card thông tin thanh toán */}
          {(trip.total_cost > 0 || trip.deposit_amount > 0) && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium mb-3">
                <BadgeDollarSign className="h-3.5 w-3.5 text-sky-500" />
                Thông tin thanh toán
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-[11px] text-slate-500 mb-1">Tổng tiền</div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums">{fmtVND(trip.total_cost)} đ</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <div className="text-[11px] text-emerald-600 mb-1">Đã cọc</div>
                  <div className="text-lg font-bold text-emerald-700 tabular-nums">{fmtVND(trip.deposit_amount)} đ</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                  <div className="text-[11px] text-amber-600 mb-1">Còn lại</div>
                  <div className="text-lg font-bold text-amber-700 tabular-nums">{fmtVND(trip.remaining_amount)} đ</div>
                </div>
              </div>
            </div>
          )}

          {/* Card đánh giá - chỉ hiển thị khi chuyến đã hoàn thành và có rating */}
          {trip.status === "COMPLETED" && trip.rating > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-inner">
              <div className="text-[11px] uppercase tracking-wide text-amber-700 flex items-center gap-2 font-medium mb-3">
                <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
                Đánh giá từ khách hàng
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cls(
                          "h-5 w-5",
                          star <= Math.round(trip.rating)
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-amber-700">{trip.rating.toFixed(1)}</span>
                </div>
                {trip.rating_comment && (
                  <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-700 leading-relaxed">
                    <div className="text-xs text-slate-500 mb-1 font-medium">Nhận xét:</div>
                    <div>{trip.rating_comment}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <ConfirmModal
            open={confirmOpen}
            title="Xác nhận cập nhật trạng thái"
            message={`Bạn muốn đánh dấu trạng thái:\n${nextLabel}\n\nThao tác này sẽ báo về điều phối.`}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={doChangeStatus}
          />
          <TripExpenseModal
            open={expenseOpen}
            tripId={trip?.id}
            tripLabel={tripRouteLabel}
            vehicleId={trip?.vehicle_id}
            onClose={() => setExpenseOpen(false)}
            onSubmitted={handleExpenseSubmitted}
          />
          <TripPaymentRequestModal
            open={paymentOpen}
            tripId={trip?.id}
            bookingId={trip?.booking_id}
            totalCost={trip?.total_cost}
            depositAmount={trip?.deposit_amount}
            remainingAmount={trip?.remaining_amount}
            customerName={trip?.customer_name}
            onClose={() => setPaymentOpen(false)}
            onSubmitted={async ({ amount, paymentMethod }) => {
              pushToast(`Đã gửi yêu cầu thanh toán ${fmtVND(amount)}đ (${paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"})`, "success");
              // Reload trip detail để cập nhật remaining amount
              if (trip?.id) {
                await loadTripDetail(trip.id, { silent: true });
              }
            }}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          {error || "Bạn hiện chưa có chuyến nào được giao."}
        </div>
      )}
    </div>
  );
}
