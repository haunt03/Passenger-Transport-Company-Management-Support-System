// src/components/driver/DriverSchedulePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CarFront,
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  getDriverSchedule,
  getDayOffHistory,
} from "../../api/drivers";

/**
 * DriverSchedulePage (LIGHT THEME + BRAND #0079BC)
 *
 * - Lịch theo Tháng / Tuần
 * - Ngày có chuyến: pill xanh brand (#0079BC)
 * - Ngày nghỉ: pill xám (chưa nối API day-off, để TODO)
 * - Click 1 ngày -> panel bên phải show chi tiết
 *
 * API hiện tại:
 *  - GET /api/drivers/by-user/{userId}/profile
 *  - GET /api/drivers/{driverId}/schedule
 *
 * Khi backend hỗ trợ month/year + dayoff có thể đổi sang:
 *  GET /api/driver/schedule?month=10&year=2025
 */

// ===== Helpers =====
const cls = (...a) => a.filter(Boolean).join(" ");

// format date helpers
function splitYMD(str) {
  const [yyyy, mm, dd] = String(str).split("-");
  return { yyyy, mm, dd };
}
function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toDMY(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Build ma trận 6 tuần (Mon → Sun) cho 1 tháng
function buildMonthMatrix(year, monthIdx /*0-11*/) {
  const first = new Date(year, monthIdx, 1);
  const dowMon = (first.getDay() + 6) % 7; // Mon=0
  const startDate = new Date(year, monthIdx, 1 - dowMon);

  const matrix = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const curr = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + w * 7 + d
      );
      week.push(curr);
    }
    matrix.push(week);
  }
  return matrix;
}

// Build tuần (Mon→Sun) từ 1 ngày bất kỳ
function buildWeekArray(dateObj) {
  const dowMon = (dateObj.getDay() + 6) % 7; // Mon=0
  const monday = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate() - dowMon
  );
  const arr = [];
  for (let i = 0; i < 7; i++) {
    arr.push(
        new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate() + i
        )
    );
  }
  // để dùng chung logic render như month matrix
  return [arr];
}

const fmtTime = (t) => t || "—";

/* =========================================================
   Subcomponents
========================================================= */

// Thẻ trong panel bên phải cho từng chuyến / nghỉ
function DayTripCard({ record, onClick }) {
  const isTrip = record.type === "TRIP";

  return (
      <div
          onClick={isTrip ? onClick : undefined}
          className={cls(
              "rounded-xl border p-3 text-[13px] shadow-sm flex flex-col gap-2 transition-all",
              isTrip
                  ? "border-[#0079BC] bg-white cursor-pointer hover:shadow-md hover:border-[#0079BC]/70" // chuyến: viền brand
                  : "border-slate-200 bg-slate-50" // nghỉ: tone xám
          )}
      >
        <div className="flex items-start gap-3">
          {/* icon box */}
          <div
              className={cls(
                  "h-8 w-8 rounded-md flex items-center justify-center shrink-0 border text-[11px] font-medium shadow-sm",
                  isTrip
                      ? "bg-[#E6F4FF] text-[#0079BC] border-[#0079BC]"
                      : "bg-slate-100 text-slate-600 border-slate-200"
              )}
          >
            {isTrip ? (
                <CarFront className="h-4 w-4 text-[#0079BC]" />
            ) : (
                <CalendarDays className="h-4 w-4 text-slate-600" />
            )}
          </div>

          {/* main text */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold leading-tight text-slate-900 truncate">
              {record.title || "—"}
            </div>

            {isTrip ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 leading-relaxed mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="tabular-nums font-medium text-slate-700">
                  {fmtTime(record.time)}
                </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#0079BC]" />
                    <span className="text-slate-700">
                  {record.pickup || "—"}
                </span>
                  </div>
                </div>
            ) : (
                <div className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  {record.reason ? record.reason : "Nghỉ được duyệt / không phân công chuyến."}
                </div>
            )}
          </div>

          {/* ID trip */}
          {isTrip ? (
              <div className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                ID {record.trip_id}
              </div>
          ) : (
              <div className="text-[11px] text-slate-400 font-medium shrink-0 whitespace-nowrap">
                OFF
              </div>
          )}
        </div>
      </div>
  );
}

// Chip "Chuyến kế tiếp" trong header
function NextTripPill({ schedule, selectedDate }) {
  const ym = toYMD(selectedDate);
  const todaysTrips = schedule.filter(
      (r) => r.date === ym && r.type === "TRIP"
  );

  if (!todaysTrips.length) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-600 px-3 py-2 flex flex-wrap items-center gap-2 leading-relaxed shadow-sm">
        <span className="font-medium text-slate-700">
          Không có chuyến trong ngày
        </span>
        </div>
    );
  }

  // có thể sort theo thời gian nếu backend trả nhiều
  const trip = todaysTrips[0];

  return (
      <div className="rounded-lg border border-[#0079BC] bg-[#E6F4FF] text-[12px] text-[#0079BC] px-3 py-2 flex flex-wrap items-center gap-2 leading-relaxed shadow-sm">
      <span className="inline-flex items-center gap-1 font-semibold text-[#0079BC]">
        <CheckCircle2 className="h-4 w-4 text-[#0079BC]" />
        Chuyến kế tiếp
      </span>

        <div className="hidden sm:block text-slate-400">•</div>

        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span className="tabular-nums font-medium text-slate-900">
          {fmtTime(trip.time)}
        </span>
        </div>

        <div className="hidden sm:block text-slate-400">•</div>

        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-[#0079BC]" />
          <span className="font-medium text-slate-900">
          {trip.pickup || "—"}
        </span>
        </div>

        <div className="hidden sm:block text-slate-400">•</div>

        <span className="font-medium text-slate-900">
        {trip.title || "—"}
      </span>
      </div>
  );
}

// Header tài xế + KPI + toggle Tháng/Tuần
function DriverHeader({
                        driver,
                        currentMonth,
                        currentYear,
                        selectedDate,
                        monthlyTripCount,
                        monthlyLeaveDays,
                        viewMode,
                        setViewMode,
                        schedule,
                      }) {
  const monthLabel = `${String(currentMonth + 1).padStart(2, "0")}/${currentYear}`;

  return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* left side */}
          <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
            <div className="flex items-start gap-3">
              {/* avatar với brand #0079BC */}
              <div
                  className="relative h-10 w-10 rounded-md text-white text-[12px] font-semibold flex items-center justify-center shadow-[0_12px_30px_rgba(0,121,188,.4)]"
                  style={{ backgroundColor: "#0079BC" }}
              >
                {driver?.name
                    ?.split(" ")
                    .slice(-2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("") || "TX"}

                {/* online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#0079BC] ring-2 ring-white" />
              </div>

              <div className="flex flex-col leading-tight">
                <div className="text-[15px] font-semibold text-slate-900 leading-tight">
                  {driver?.name || "—"}
                </div>
                <div className="text-[12px] text-slate-600 leading-snug">
                  {driver?.role || "Tài xế"} · {driver?.branch || "—"}
                </div>
                <div className="text-[11px] text-slate-500 leading-snug mt-1">
                  Tháng {monthLabel} · Ngày chọn {toDMY(selectedDate)}
                </div>
              </div>
            </div>

            {/* chuyến kế tiếp */}
            <NextTripPill schedule={schedule} selectedDate={selectedDate} />
          </div>

          {/* right side stats */}
          <div className="flex flex-wrap items-start gap-3 ml-auto">
            {/* Chế độ xem Tháng / Tuần */}
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-sm flex flex-col gap-2">
              <div className="text-[11px] text-slate-500 leading-none">
                Chế độ xem
              </div>
              <div className="flex items-center gap-1">
                <button
                    onClick={() => setViewMode("month")}
                    className={cls(
                        "rounded-md px-2 py-1 text-[12px] font-medium leading-none border shadow-sm",
                        viewMode === "month"
                            ? "bg-[#0079BC] border-[#0079BC] text-white"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                >
                  Tháng
                </button>
                <button
                    onClick={() => setViewMode("week")}
                    className={cls(
                        "rounded-md px-2 py-1 text-[12px] font-medium leading-none border shadow-sm",
                        viewMode === "week"
                            ? "bg-[#0079BC] border-[#0079BC] text-white"
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                >
                  Tuần
                </button>
              </div>
              <div className="text-[11px] text-slate-500 leading-none">
                {monthLabel} / {toDMY(selectedDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

/* =========================================================
   Calendar Grid
========================================================= */
function CalendarGrid({
                        year,
                        monthIdx,
                        scheduleMap,
                        selectedDate,
                        setSelectedDate,
                        viewMode,
                        goPrev,
                        goNext,
                      }) {
  const matrix =
      viewMode === "month"
          ? buildMonthMatrix(year, monthIdx)
          : buildWeekArray(selectedDate);

  const monthLabel = `Tháng ${String(monthIdx + 1).padStart(
      2,
      "0"
  )}/${year}`;

  // const apiHint = `GET /api/drivers/{driverId}/schedule?month=${String(
  //     monthIdx + 1
  // )}&year=${year}`;

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        {/* header lịch */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 border-b border-slate-200 p-4">
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 leading-tight">
              <CalendarDays className="h-4 w-4 text-[#0079BC]" />
              <span>{monthLabel}</span>
            </div>

            {/* <div className="text-[11px] text-slate-500 leading-relaxed">
              {apiHint}
            </div> */}
          </div>

          {/* điều hướng tháng / tuần */}
          <div className="flex items-center gap-2 ml-auto">
            <button
                onClick={goPrev}
                className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 p-2 text-[12px] shadow-sm"
                title="Trước"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <button
                onClick={goNext}
                className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 p-2 text-[12px] shadow-sm"
                title="Sau"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* tên thứ */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
          {weekdays.map((w) => (
              <div
                  key={w}
                  className="px-2 py-2 border-r last:border-r-0 border-slate-200 text-center uppercase tracking-wide"
              >
                {w}
              </div>
          ))}
        </div>

        {/* body calendar */}
        <div
            className={cls(
                "grid text-[11px] text-slate-700",
                viewMode === "month" ? "grid-rows-6" : "grid-rows-1",
                "grid-cols-7"
            )}
        >
          {matrix.map((week, wi) =>
              week.map((d, di) => {
                const ymd = toYMD(d);
                const recs = scheduleMap[ymd] || [];
                const isTripDay = recs.some((r) => r.type === "TRIP");
                const isLeaveDay = recs.some((r) => r.type === "LEAVE");

                const isCurrentMonth =
                    d.getMonth() === monthIdx && d.getFullYear() === year;

                const isSelected = toYMD(d) === toYMD(selectedDate);

                const cellBase =
                    "relative border border-slate-200 p-2 min-h-[92px] flex flex-col text-left cursor-pointer overflow-hidden";

                // highlight ô đang chọn = màu brand
                const cellSelected =
                    "ring-2 ring-[#0079BC] border-[#0079BC] bg-[#E6F4FF]";

                const cellOtherMonth = "bg-slate-50 text-slate-400";

                const cellNormal = "bg-white hover:bg-slate-50";

                return (
                    <div
                        key={wi + "-" + di}
                        className={cls(
                            cellBase,
                            isSelected
                                ? cellSelected
                                : isCurrentMonth
                                    ? cellNormal
                                    : cellOtherMonth
                        )}
                        onClick={() => setSelectedDate(d)}
                    >
                      {/* top row: số ngày + pill trạng thái */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-medium text-slate-900 tabular-nums leading-none">
                          {d.getDate()}
                        </div>

                        {isTripDay ? (
                            <span className="rounded-md border border-[#0079BC] bg-[#E6F4FF] text-[#0079BC] text-[10px] font-medium px-1.5 py-[2px] leading-none whitespace-nowrap">
                      Có chuyến
                    </span>
                        ) : isLeaveDay ? (
                            (() => {
                              const leaveRec = recs.find((r) => r.type === "LEAVE");
                              const isApproved = leaveRec?.status === "APPROVED";
                              return (
                                  <span className={cls(
                                      "rounded-md border text-[10px] font-medium px-1.5 py-[2px] leading-none whitespace-nowrap",
                                      isApproved
                                          ? "border-amber-300 bg-amber-50 text-amber-700"
                                          : "border-slate-300 bg-slate-100 text-slate-600"
                                  )}>
                          {isApproved ? "Nghỉ" : "Chờ duyệt"}
                        </span>
                              );
                            })()
                        ) : null}
                      </div>

                      {/* nội dung list rút gọn trong ô */}
                      <div className="mt-2 flex-1 space-y-1 leading-snug">
                        {recs.slice(0, 2).map((r, idx) => {
                          if (r.type === "TRIP") {
                            return (
                                <div
                                    className="text-[11px] text-slate-700"
                                    key={idx}
                                >
                          <span className="tabular-nums font-medium text-slate-900">
                            {fmtTime(r.time)}
                          </span>{" "}
                                  -{" "}
                                  <span className="font-medium text-slate-900">
                            {r.title}
                          </span>
                                </div>
                            );
                          } else {
                            return (
                                <div
                                    className="text-[11px] text-slate-600"
                                    key={idx}
                                >
                                  {r.title || "Nghỉ"}
                                </div>
                            );
                          }
                        })}
                        {recs.length > 2 ? (
                            <div className="text-[10px] text-slate-500">
                              +{recs.length - 2} mục
                            </div>
                        ) : null}
                      </div>
                    </div>
                );
              })
          )}
        </div>
      </div>
  );
}

/* =========================================================
   Day Detail Panel
========================================================= */
function DayDetailPanel({ dateObj, scheduleMap, onTripClick }) {
  const ymd = toYMD(dateObj);
  const recs = scheduleMap[ymd] || [];

  return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 leading-tight">
            <CalendarDays className="h-4 w-4 text-[#0079BC]" />
            <span>{toDMY(dateObj)}</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-none">
            {recs.length} mục trong ngày
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3 text-slate-700 text-[13px] overflow-y-auto max-h-[420px]">
          {recs.length === 0 ? (
              <div className="text-[13px] text-slate-500 leading-relaxed">
                Không có chuyến hoặc lịch nghỉ trong ngày này.
              </div>
          ) : (
              recs.map((r, i) => (
                  <DayTripCard
                      record={r}
                      key={i}
                      onClick={r.type === "TRIP" && r.trip_id ? () => onTripClick(r.trip_id) : undefined}
                  />
              ))
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 leading-relaxed">
          Dữ liệu hiển thị theo ngày đang chọn. Click vào chuyến để xem chi tiết.
        </div>
      </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */
export default function DriverSchedulePage() {
  const navigate = useNavigate();
  const today = React.useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [viewMode, setViewMode] = React.useState("month"); // "month" | "week"

  const [driver, setDriver] = React.useState(null);
  const [schedule, setSchedule] = React.useState([]); // [{date, type, title, time, pickup, trip_id}]
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const handleTripClick = (tripId) => {
    navigate(`/driver/trips/${tripId}`);
  };

  // gom data theo ngày
  const scheduleMap = React.useMemo(() => {
    const map = {};
    for (const rec of schedule) {
      if (!rec.date) continue;
      if (!map[rec.date]) map[rec.date] = [];
      map[rec.date].push(rec);
    }
    return map;
  }, [schedule]);

  // thống kê trong tháng
  const { monthlyTripCount, monthlyLeaveDays } = React.useMemo(() => {
    let trips = 0;
    const leaveDateSet = new Set();

    for (const rec of schedule) {
      if (!rec.date) continue;
      const { yyyy, mm } = splitYMD(rec.date);
      const rYear = Number(yyyy);
      const rMonthIdx = Number(mm) - 1;

      if (rYear === currentYear && rMonthIdx === currentMonth) {
        if (rec.type === "TRIP") trips += 1;
        if (rec.type === "LEAVE") {
          leaveDateSet.add(rec.date);
        }
      }
    }

    return {
      monthlyTripCount: trips,
      monthlyLeaveDays: leaveDateSet.size,
    };
  }, [schedule, currentYear, currentMonth]);

  // load driver + schedule từ backend
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const uid = getCookie("userId");
        if (!uid) {
          throw new Error("Không xác định được tài khoản tài xế.");
        }

        const profile = await getDriverProfileByUser(uid);
        if (cancelled) return;

        setDriver({
          name: profile.fullName,
          role: "Tài xế",
          branch: profile.branchName,
        });

        // Load trips
        const list = await getDriverSchedule(profile.driverId);
        if (cancelled) return;

        // map dữ liệu backend -> format cho calendar
        // Backend hiện trả: tripId, startTime, endTime, startLocation, endLocation, status, hireType, hireTypeName, ...
        const tripRecords = [];
        if (Array.isArray(list)) {
          for (const trip of list) {
            const start = trip.startTime || trip.start_time || "";
            const end = trip.endTime || trip.end_time || "";
            const startDateStr = start ? String(start).slice(0, 10) : null;
            const endDateStr = end ? String(end).slice(0, 10) : null;
            const hireType = trip.hireType || "";
            const hireTypeName = trip.hireTypeName || "";

            const routeLabel =
                (trip.startLocation || trip.start_location || "—") +
                " → " +
                (trip.endLocation || trip.end_location || "—");

            // Kiểm tra nếu là chuyến 2 chiều và ngày đi khác ngày về
            const isRoundTrip = hireType === "ROUND_TRIP";
            const isDailyOrMultiDay = hireType === "DAILY" || hireType === "MULTI_DAY";
            const differentDays = startDateStr && endDateStr && startDateStr !== endDateStr;

            if (isRoundTrip && differentDays) {
              // Chuyến 2 chiều: Tạo 2 records: 1 cho ngày đi, 1 cho ngày về
              // Record cho ngày đi
              tripRecords.push({
                date: startDateStr,
                type: "TRIP",
                title: `Đi: ${routeLabel}`,
                time: start ? String(start).slice(11, 16) : "",
                pickup: trip.startLocation || trip.start_location || "",
                trip_id: trip.tripId || trip.trip_id,
                hireType: hireType,
                hireTypeName: hireTypeName,
              });

              // Record cho ngày về
              tripRecords.push({
                date: endDateStr,
                type: "TRIP",
                title: `Về: ${routeLabel}`,
                time: end ? String(end).slice(11, 16) : "",
                pickup: trip.endLocation || trip.end_location || "",
                trip_id: trip.tripId || trip.trip_id,
                hireType: hireType,
                hireTypeName: hireTypeName,
              });
            } else if (isDailyOrMultiDay && differentDays) {
              // Chuyến theo ngày: Tạo records cho tất cả các ngày từ ngày bắt đầu đến ngày kết thúc
              const startDate = new Date(startDateStr);
              const endDate = new Date(endDateStr);

              // Tạo record cho từng ngày
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const currentDateStr = toYMD(d);
                const isFirstDay = currentDateStr === startDateStr;
                const isLastDay = currentDateStr === endDateStr;

                // Title khác nhau cho ngày đầu, ngày cuối, và các ngày giữa
                let title = routeLabel;
                if (isFirstDay && isLastDay) {
                  // Chỉ 1 ngày
                  title = routeLabel;
                } else if (isFirstDay) {
                  title = `Bắt đầu: ${routeLabel}`;
                } else if (isLastDay) {
                  title = `Kết thúc: ${routeLabel}`;
                } else {
                  title = `Tiếp tục: ${routeLabel}`;
                }

                tripRecords.push({
                  date: currentDateStr,
                  type: "TRIP",
                  title: title,
                  time: isFirstDay ? (start ? String(start).slice(11, 16) : "") : "",
                  pickup: trip.startLocation || trip.start_location || "",
                  trip_id: trip.tripId || trip.trip_id,
                  hireType: hireType,
                  hireTypeName: hireTypeName,
                });
              }
            } else {
              // Chuyến 1 chiều hoặc cùng ngày: chỉ tạo 1 record
              if (startDateStr) {
                tripRecords.push({
                  date: startDateStr,
                  type: "TRIP",
                  title: routeLabel,
                  time: start ? String(start).slice(11, 16) : "",
                  pickup: trip.startLocation || trip.start_location || "",
                  trip_id: trip.tripId || trip.trip_id,
                  hireType: hireType,
                  hireTypeName: hireTypeName,
                });
              }
            }
          }
        }

        // Load day-off history
        let leaveRecords = [];
        try {
          const dayOffList = await getDayOffHistory(profile.driverId);
          if (cancelled) return;

          if (Array.isArray(dayOffList)) {
            leaveRecords = dayOffList
                .filter((d) => d.status === "APPROVED" || d.status === "PENDING")
                .map((dayOff) => {
                  // dayOff có thể có: id, driverId, date/leaveDate, reason, status
                  const leaveDate = dayOff.date || dayOff.leaveDate || dayOff.startDate || "";
                  const dateStr = leaveDate ? String(leaveDate).slice(0, 10) : null;
                  const statusLabel = dayOff.status === "APPROVED" ? "Đã duyệt" : "Chờ duyệt";

                  return {
                    date: dateStr,
                    type: "LEAVE",
                    title: `Nghỉ phép (${statusLabel})`,
                    reason: dayOff.reason || "",
                    status: dayOff.status,
                  };
                }).filter((r) => r.date);
          }
        } catch (err) {
          console.warn("Could not load day-off history:", err);
        }

        // Merge trips + leaves
        setSchedule([...tripRecords, ...leaveRecords]);
      } catch (err) {
        if (!cancelled) {
          setError(
              err?.data?.message ||
              err?.message ||
              "Không tải được lịch làm việc."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // điều hướng lịch
  const goPrev = () => {
    if (viewMode === "month") {
      const prevMonth = currentMonth - 1;
      if (prevMonth < 0) {
        const newYear = currentYear - 1;
        setCurrentMonth(11);
        setCurrentYear(newYear);
        setSelectedDate(new Date(newYear, 11, 1));
      } else {
        setCurrentMonth(prevMonth);
        setSelectedDate(new Date(currentYear, prevMonth, 1));
      }
    } else {
      // week mode: lùi 7 ngày
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  };

  const goNext = () => {
    if (viewMode === "month") {
      const nextMonth = currentMonth + 1;
      if (nextMonth > 11) {
        const newYear = currentYear + 1;
        setCurrentMonth(0);
        setCurrentYear(newYear);
        setSelectedDate(new Date(newYear, 0, 1));
      } else {
        setCurrentMonth(nextMonth);
        setSelectedDate(new Date(currentYear, nextMonth, 1));
      }
    } else {
      // week mode: tiến 7 ngày
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  };

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col gap-3 p-6">
        {/* trạng thái load / lỗi */}
        {loading && (
            <div className="text-[13px] text-slate-500">
              Đang tải lịch làm việc...
            </div>
        )}
        {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] text-rose-700">
              {error}
            </div>
        )}

        {/* Header tài xế + KPI */}
        <DriverHeader
            driver={driver}
            currentMonth={currentMonth}
            currentYear={currentYear}
            selectedDate={selectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            schedule={schedule}
        />

        {/* Lưới: Lịch + Panel bên phải */}
        <div className="grid xl:grid-cols-[1fr_320px] gap-5">
          <CalendarGrid
              year={currentYear}
              monthIdx={currentMonth}
              scheduleMap={scheduleMap}
              selectedDate={selectedDate}
              setSelectedDate={(d) => {
                setSelectedDate(d);
                // bấm sang tháng khác -> sync tháng/năm
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
              }}
              viewMode={viewMode}
              goPrev={goPrev}
              goNext={goNext}
          />

          <DayDetailPanel dateObj={selectedDate} scheduleMap={scheduleMap} onTripClick={handleTripClick} />
        </div>


      </div>
  );
}
