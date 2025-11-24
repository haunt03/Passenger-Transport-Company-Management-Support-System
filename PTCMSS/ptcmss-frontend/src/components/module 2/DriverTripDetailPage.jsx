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
} from "lucide-react";
import TripExpenseModal from "./TripExpenseModal.jsx";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  getDriverDashboard,
  startTrip as apiStartTrip,
  completeTrip as apiCompleteTrip,
} from "../../api/drivers";
import { getTripDetail } from "../../api/dispatch";

const cls = (...a) => a.filter(Boolean).join(" ");
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
    customer_name: payload.customerName || "",
    customer_phone: payload.customerPhone || "",
    vehicle_plate: payload.vehiclePlate || "Chua gan xe",
    vehicle_type: payload.vehicleModel || "",
    note: "",
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
            t.kind === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
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
            Huy
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
          >
            Xac nhan
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    NOT_STARTED: {
      label: "Chua bat dau",
      cls: "bg-slate-100 text-slate-700 border-slate-300",
      icon: <Flag className="h-3.5 w-3.5 text-slate-500" />,
    },
    IN_PROGRESS: {
      label: "Dang di chuyen",
      cls: "bg-sky-50 text-sky-700 border-sky-200",
      icon: <Navigation className="h-3.5 w-3.5 text-sky-500" />,
    },
    COMPLETED: {
      label: "Hoan thanh",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
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
    { key: "NOT_STARTED", label: "Chua bat dau" },
    { key: "IN_PROGRESS", label: "Dang chay" },
    { key: "COMPLETED", label: "Hoan thanh" },
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
                  done ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-300 text-slate-400"
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-inner">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-2 font-medium">
        <StickyNote className="h-3.5 w-3.5 text-amber-500" />
        Thong tin chung
      </div>
      <div className="grid gap-3 text-sm text-slate-700">
        <div>
          <div className="text-xs text-slate-500">Ma chuyen</div>
          <div className="font-semibold text-slate-900">{trip.code}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Khach hang</div>
          <div className="font-semibold text-slate-900">{trip.customer_name || "—"}</div>
          {trip.customer_phone && (
            <a href={`tel:${trip.customer_phone}`} className="text-sky-600 text-xs hover:underline">
              {trip.customer_phone}
            </a>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500">Thong tin xe</div>
          <div className="font-semibold text-slate-900">
            {trip.vehicle_plate} {trip.vehicle_type ? `· ${trip.vehicle_type}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteCard({ pickupLocation, dropoffLocation, pickupTime }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-4 shadow-inner">
      <div className="flex items-center gap-2 text-slate-600 text-xs font-medium uppercase tracking-wide">
        <Navigation className="h-4 w-4 text-sky-600" />
        Lo trinh
      </div>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1 flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <div className="flex-1 w-px bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-rose-500" />
          </div>
          <div className="space-y-6 text-sm text-slate-700">
            <div>
              <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Diem don
              </div>
              <div className="font-semibold text-slate-900">{pickupLocation || "—"}</div>
              <div className="text-xs text-slate-500">Thoi gian: {fmtDateTime(pickupTime)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                Diem tra
              </div>
              <div className="font-semibold text-slate-900">{dropoffLocation || "—"}</div>
              <div className="text-xs text-slate-500">Ket thuc: Sau khi don khach</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-3 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Den diem don dung gio va goi khach truoc ~10 phut.</span>
        </div>
      </div>
    </div>
  );
}

function getNextStepInfo(status) {
  if (status === "NOT_STARTED") {
    return { btnText: "Bat dau chuyen", to: "IN_PROGRESS", desc: "Xac nhan bat dau di chuyen den diem don." };
  }
  if (status === "IN_PROGRESS") {
    return { btnText: "Hoan thanh chuyen", to: "COMPLETED", desc: "Xac nhan da dua khach den diem den." };
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
      setError(err?.data?.message || err?.message || "Khong tai duoc chi tiet chuyen.");
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
        if (!uid) throw new Error("Khong xac dinh tai khoan.");
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
          setError("Ban hien chua co chuyen nao duoc giao.");
          setLoading(false);
          return;
        }
        await loadTripDetail(targetTripId);
      } catch (err) {
        if (!cancelled) {
          setTrip(null);
          setError(err?.data?.message || err?.message || "Khong tai duoc chi tiet chuyen.");
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

  const requestStatusChange = () => {
    if (!stepInfo || actionLoading || detailLoading) return;
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
      pushToast("Da cap nhat trang thai chuyen.", "success");
      await loadTripDetail(trip.id, { silent: true });
    } catch (err) {
      pushToast(err?.data?.message || err?.message || "Khong the cap nhat trang thai chuyen.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const tripRouteLabel = trip ? `${trip.pickup_location} -> ${trip.dropoff_location}` : "";

  const handleExpenseSubmitted = ({ amount }) => {
    pushToast(`Da gui bao cao chi phi +${Number(amount || 0).toLocaleString("vi-VN")}đ`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <Toasts toasts={toasts} />
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-3 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          <span>Dang tai chi tiet chuyen...</span>
        </div>
      ) : trip ? (
        <>
          {detailLoading && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              <span>Dang cap nhat du lieu...</span>
            </div>
          )}
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-5">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-wrap items-start gap-3">
                <div className="text-2xl font-semibold text-slate-900 flex items-center gap-2 leading-tight">
                  <Flag className="h-6 w-6 text-emerald-600" />
                  <span>Chi tiet chuyen</span>
                </div>
                <StatusChip status={trip.status} />
              </div>
              <div className="text-[12px] text-slate-600 flex flex-wrap items-center gap-3 leading-relaxed">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Don luc{" "}
                    <span className="text-slate-800 font-semibold">
                      {fmtDateTime(trip.pickup_time)}
                    </span>
                  </span>
                </div>
                <div className="hidden sm:block text-slate-300">·</div>
                <div className="flex items-center gap-1">
                  <CarFront className="h-3.5 w-3.5 text-emerald-600" />
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
              {stepInfo ? (
                <button
                  onClick={requestStatusChange}
                  disabled={actionLoading || detailLoading}
                  className={cls(
                    "rounded-xl text-white font-semibold text-sm px-4 py-2 shadow-[0_12px_24px_rgba(16,185,129,0.35)] transition-colors bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400",
                    actionLoading || detailLoading ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {actionLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dang cap nhat...
                    </span>
                  ) : (
                    stepInfo.btnText
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-medium px-4 py-2 flex items-center gap-2 justify-center shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Da hoan thanh chuyen
                </div>
              )}
              <button
                onClick={() => setExpenseOpen(true)}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm text-slate-700 px-4 py-2 flex items-center justify-center gap-2 shadow-sm"
              >
                <BadgeDollarSign className="h-4 w-4 text-emerald-600" />
                <span>Bao cao chi phi</span>
              </button>
            </div>
          </div>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-sky-600" />
              Tien trinh chuyen di
            </div>
            <ProgressSteps status={trip.status} />
          </div>
          <div className="grid xl:grid-cols-2 gap-5">
            <TripMetaCard trip={trip} />
            <RouteCard pickupLocation={trip.pickup_location} dropoffLocation={trip.dropoff_location} pickupTime={trip.pickup_time} />
          </div>
          <ConfirmModal
            open={confirmOpen}
            title="Xac nhan cap nhat trang thai"
            message={`Ban muon danh dau trang thai:\n${nextLabel}\n\nThao tac nay se bao ve dieu phoi.`}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={doChangeStatus}
          />
          <TripExpenseModal
            open={expenseOpen}
            tripId={trip?.id}
            tripLabel={tripRouteLabel}
            onClose={() => setExpenseOpen(false)}
            onSubmitted={handleExpenseSubmitted}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
          {error || "Ban hien chua co chuyen nao duoc giao."}
        </div>
      )}
    </div>
  );
}
