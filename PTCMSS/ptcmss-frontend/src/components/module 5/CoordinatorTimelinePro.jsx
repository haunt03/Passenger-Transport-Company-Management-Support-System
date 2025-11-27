import React from "react";
import {
    CalendarDays,
    ZoomIn,
    ZoomOut,
    Search,
    UserRound,
    Car as CarIcon,
    Clock,
    MoveRight,
    Download,
    ListChecks,
    Building2,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { getDispatchDashboard, assignTrips } from "../../api/dispatch";
import { listBranches, getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { listDriversByBranch } from "../../api/drivers";
import { listVehiclesByBranch } from "../../api/vehicles";
import AnimatedDialog from "../common/AnimatedDialog";

/**
 * CoordinatorTimelinePro – Queue + Gantt (LIGHT THEME, styled giống AdminBranchListPage)
 *
 * Khung 1 (Queue):
 *   - Hiển thị các đơn PENDING, ưu tiên gần giờ pickup
 *   - Tìm kiếm
 *   - Nút "Gán chuyến"
 *
 * Khung 2 (Gantt):
 *   - Dải thời gian 06:00–24:00 (tick mỗi 30')
 *   - Line "Now"
 *   - Zoom ngang (0.5x → 2.5x)
 *   - %Utilization/ca
 *   - Cảnh báo Overlap / thiếu nghỉ
 *
 * API dự kiến:
 *   GET  /api/v1/coordinator/dashboard?date=YYYY-MM-DD
 *   POST /api/v1/dispatch/assign { orderId, driverId, vehicleId }
 */

// ===== CẤU HÌNH THỜI GIAN =====
const DAY_START = 6; // 06:00
const DAY_END = 24; // 24:00
const HOUR_WIDTH = 90; // px / giờ ở zoom=1
const TICK_MINUTES = 30; // vạch lưới mỗi 30 phút

// ===== MÀU / THEME =====
const COLORS = {
    GRID: "border-slate-200",
    FREE_BG: "bg-white",
    SHIFT: "bg-cyan-200/50",
    BUSY: "bg-rose-500",
    MAINT: "bg-amber-400",
    OVERLAP: "ring-2 ring-fuchsia-500",
    REST: "ring-2 ring-amber-400",
};

// ===== Helpers thời gian =====
const toDate = (v) => (v instanceof Date ? v : new Date(v));
const pad2 = (n) => String(n).padStart(2, "0");
const startOfDay = (dateStr) => new Date(`${dateStr}T${pad2(DAY_START)}:00:00`);
const msBetween = (a, b) => toDate(b) - toDate(a);
const minutesBetween = (a, b) => msBetween(a, b) / 60000;
const hoursBetween = (a, b) => msBetween(a, b) / 36e5; // ms -> hours
const xFrom = (dateStr, when, zoom) =>
    Math.max(0, hoursBetween(startOfDay(dateStr), when) * HOUR_WIDTH * zoom);
const wFrom = (start, end, zoom) =>
    Math.max(0, hoursBetween(start, end) * HOUR_WIDTH * zoom);

const fmtHM = (d) => {
    const t = toDate(d);
    const hh = pad2(t.getHours());
    const mm = pad2(t.getMinutes());
    return `${hh}:${mm}`;
};

const isSameDay = (dateStr, d = new Date()) => {
    const x = new Date(dateStr);
    return (
        x.getFullYear() === d.getFullYear() &&
        x.getMonth() === d.getMonth() &&
        x.getDate() === d.getDate()
    );
};

const fmtRel = (iso) => {
    const now = new Date();
    const t = new Date(iso);
    const diff = Math.round((t - now) / 60000); // phút
    if (diff > 0)
        return diff < 60
            ? `còn ${diff}p`
            : `còn ${Math.floor(diff / 60)}h${pad2(diff % 60)}p`;
    const late = Math.abs(diff);
    return late < 60
        ? `trễ ${late}p`
        : `trễ ${Math.floor(late / 60)}h${pad2(late % 60)}p`;
};

// ===== Demo fallback =====
function demoData(date) {
    const base = `${date}`;
    return {
        pending_orders: [
            {
                id: 501,
                code: "ORD-501",
                pickupTime: `${base}T08:30:00`,
                route: "HN → HD",
            },
            {
                id: 502,
                code: "ORD-502",
                pickupTime: `${base}T07:50:00`,
                route: "HN → NB",
            },
            {
                id: 503,
                code: "ORD-503",
                pickupTime: `${base}T10:15:00`,
                route: "HN → HP",
            },
            {
                id: 504,
                code: "ORD-504",
                pickupTime: `${base}T12:45:00`,
                route: "HN → QN",
            },
        ],
        driver_schedules: [
            {
                id: 1,
                name: "Nguyễn Văn A",
                shift: {
                    start: `${base}T07:00:00`,
                    end: `${base}T19:00:00`,
                },
                items: [
                    {
                        start: `${base}T07:30:00`,
                        end: `${base}T09:00:00`,
                        type: "BUSY",
                        ref: "TRIP-314",
                        note: "HN → HD",
                    },
                    {
                        start: `${base}T11:00:00`,
                        end: `${base}T12:20:00`,
                        type: "BUSY",
                        ref: "TRIP-315",
                        note: "HN → NB",
                    },
                    {
                        start: `${base}T12:00:00`,
                        end: `${base}T12:45:00`,
                        type: "BUSY",
                        ref: "TRIP-316",
                        note: "(xung đột demo)",
                    },
                ],
            },
            {
                id: 2,
                name: "Trần Thị B",
                shift: {
                    start: `${base}T06:00:00`,
                    end: `${base}T15:00:00`,
                },
                items: [
                    {
                        start: `${base}T06:30:00`,
                        end: `${base}T08:00:00`,
                        type: "BUSY",
                        ref: "TRIP-317",
                    },
                ],
            },
            {
                id: 3,
                name: "Phạm Văn C",
                shift: {
                    start: `${base}T12:00:00`,
                    end: `${base}T22:00:00`,
                },
                items: [],
            },
        ],
        vehicle_schedules: [
            {
                id: 11,
                plate: "30G-123.45",
                shift: {
                    start: `${base}T06:00:00`,
                    end: `${base}T18:00:00`,
                },
                items: [
                    {
                        start: `${base}T08:00:00`,
                        end: `${base}T11:30:00`,
                        type: "BUSY",
                        ref: "TRIP-314",
                    },
                ],
            },
            {
                id: 12,
                plate: "30H-678.90",
                shift: {
                    start: `${base}T06:00:00`,
                    end: `${base}T18:00:00`,
                },
                items: [
                    {
                        start: `${base}T13:00:00`,
                        end: `${base}T16:00:00`,
                        type: "MAINT",
                        ref: "GA-45",
                    },
                ],
            },
            {
                id: 13,
                plate: "29A-111.22",
                shift: {
                    start: `${base}T10:00:00`,
                    end: `${base}T23:00:00`,
                },
                items: [],
            },
        ],
    };
}

const formatRouteLabel = (from, to) => {
    const start = (from || "").trim();
    const end = (to || "").trim();
    if (start && end) return `${start} -> ${end}`;
    return start || end || "";
};

const mapBranchRecord = (raw) => {
    if (!raw) return null;
    const id = raw.branchId ?? raw.id ?? null;
    if (!id) return null;
    return {
        id: String(id),
        name: raw.branchName || raw.name || `Chi nhanh #${id}`,
    };
};

const extractBranchItems = (payload) => {
    if (!payload) return [];
    // Try data.items first (current backend format)
    if (payload.data?.items && Array.isArray(payload.data.items)) return payload.data.items;
    // Then try other formats
    if (Array.isArray(payload.items)) return payload.items;
    if (payload.data?.content && Array.isArray(payload.data.content)) return payload.data.content;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
};

const normalizeScheduleWindow = (win) => {
    if (!win || !win.start || !win.end) return null;
    return { start: win.start, end: win.end };
};

const normalizeScheduleItems = (items = []) =>
    items
        .filter((it) => it && it.start && it.end)
        .map((it) => ({
            start: it.start,
            end: it.end,
            type: (it.type || "BUSY").toUpperCase(),
            ref: it.ref || it.reference || "",
            note: it.note || it.message || "",
        }))
        .sort((a, b) => new Date(a.start) - new Date(b.start));

const normalizeDriverSchedules = (rows = []) =>
    rows
        .filter(Boolean)
        .map((d, idx) => ({
            id: d.driverId ?? d.id ?? `driver-${idx}`,
            name: d.driverName || d.name || `Tai xe #${d.driverId ?? idx + 1}`,
            phone: d.driverPhone || d.phone || "",
            shift: normalizeScheduleWindow(d.shift),
            items: normalizeScheduleItems(d.items || []),
            raw: d,
        }));

const normalizeVehicleSchedules = (rows = []) =>
    rows
        .filter(Boolean)
        .map((v, idx) => ({
            id: v.vehicleId ?? v.id ?? `vehicle-${idx}`,
            plate: v.licensePlate || v.plate || v.license_plate || `VEH-${idx + 1}`,
            model: v.model || "",
            shift: normalizeScheduleWindow(v.shift),
            items: normalizeScheduleItems(v.items || []),
            raw: v,
        }));

const normalizePendingTrips = (rows = []) =>
    rows
        .filter(Boolean)
        .map((t, idx) => {
            const tripId = t.tripId ?? t.id ?? null;
            const bookingId = t.bookingId ?? t.orderId ?? null;
            const pickupTime =
                t.pickupTime ||
                t.startTime ||
                t.pickup_time ||
                t.start_time ||
                null;
            if (!pickupTime) return null;
            const code =
                t.code ||
                t.tripCode ||
                t.bookingCode ||
                (tripId ? `TRIP-${tripId}` : bookingId ? `BOOKING-${bookingId}` : `PENDING-${idx + 1}`);
            return {
                id: String(tripId || bookingId || idx),
                tripId,
                bookingId,
                code,
                pickupTime,
                route: t.route || t.routeSummary || formatRouteLabel(t.startLocation, t.endLocation),
                customerName: t.customerName || "",
                customerPhone: t.customerPhone || "",
                raw: t,
            };
        })
        .filter(Boolean);

const unwrapList = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.content)) return payload.content;
    return [];
};

const mapDriverOptions = (payload) =>
    unwrapList(payload).map((d, idx) => ({
        id: d.id ?? d.driverId ?? `driver-${idx}`,
        name: d.fullName || d.name || d.username || `Tài xế #${d.id ?? idx + 1}`,
        licenseClass: d.licenseClass || "",
        status: d.status || "",
    }));

const mapVehicleOptions = (payload) =>
    unwrapList(payload).map((v, idx) => ({
        id: v.id ?? v.vehicleId ?? `vehicle-${idx}`,
        plate: v.licensePlate || v.plate || v.license_plate || `VEH-${idx + 1}`,
        model: v.model || v.brand || "",
        status: v.status || "",
    }));

// ===== Phát hiện xung đột & vi phạm nghỉ =====
function computeOverlapFlags(items) {
    const arr = [...items].sort(
        (a, b) => new Date(a.start) - new Date(b.start)
    );
    const flags = new Map();
    for (let i = 0; i < arr.length - 1; i++) {
        const cur = arr[i],
            next = arr[i + 1];
        if (new Date(next.start) < new Date(cur.end)) {
            flags.set(cur, true);
            flags.set(next, true);
        }
    }
    return items.map((it) => !!flags.get(it));
}

function computeRestFlags(items, minGapMin = 30) {
    const arr = [...items].sort(
        (a, b) => new Date(a.start) - new Date(b.start)
    );
    const flags = new Map();
    for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i],
            b = arr[i + 1];
        const gap = minutesBetween(a.end, b.start);
        if (gap < minGapMin) {
            flags.set(a, true);
            flags.set(b, true);
        }
    }
    return items.map((it) => !!flags.get(it));
}

// ===== % utilization trong ca =====
function utilizationPercent(shift, items, countTypes = ["BUSY"]) {
    if (!shift) return 0;
    const totalMs = Math.max(0, msBetween(shift.start, shift.end));
    if (!totalMs) return 0;
    const busyMs = items
        .filter((it) => countTypes.includes(it.type))
        .reduce(
            (sum, it) =>
                sum + Math.max(0, msBetween(it.start, it.end)),
            0
        );
    return Math.round((busyMs / totalMs) * 100);
}

// ===== Queue Panel (Khung 1) =====
function QueuePanel({ orders, onAssign, query, onQuery, loading }) {
    const sorted = [...orders].sort(
        (a, b) => new Date(a.pickupTime) - new Date(b.pickupTime)
    );

    const q = (query || "").toLowerCase();
    const filtered = sorted.filter(
        (o) =>
            (o.code || "").toLowerCase().includes(q) ||
            (o.route || "").toLowerCase().includes(q)
    );

    const urgencyCls = (iso) => {
        const diff = Math.round(
            (new Date(iso) - new Date()) / 60000
        );
        // trễ hoặc gấp
        if (diff < 0)
            return "bg-rose-50 text-rose-600 border-rose-300";
        if (diff <= 30)
            return "bg-rose-50 text-rose-600 border-rose-300";
        if (diff <= 120)
            return "bg-amber-50 text-amber-700 border-amber-300";
        return "bg-slate-100 text-slate-600 border-slate-300";
    };

    return (
        <div className="h-full rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {/* header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                <div className="font-semibold text-slate-900 text-sm">
                    Khung 1 – Queue (PENDING)
                </div>
                <div className="text-[12px] text-slate-500">
                    {loading ? "Đang tải..." : `${filtered.length} đơn`}
                </div>
            </div>

            {/* search box */}
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 grow">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => onQuery?.(e.target.value)}
                        placeholder="Tìm theo mã / route..."
                        className="bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400 w-full"
                    />
                </div>
            </div>

            {/* list */}
            <div className="max-h-[66vh] overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="text-[13px] text-slate-500 px-3 py-6">
                        Đang tải queue...
                    </div>
                ) : (
                    <>
                        {filtered.map((o) => (
                            <div
                                key={o.id}
                                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition p-3 flex items-center gap-3"
                            >
                                <div className="flex flex-col min-w-0 grow">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[13px] font-semibold text-slate-900 truncate">
                                            {o.code}
                                        </span>
                                        <span
                                            className={`text-[11px] border rounded px-1.5 py-0.5 font-medium tabular-nums ${urgencyCls(
                                                o.pickupTime
                                            )}`}
                                        >
                                            {fmtRel(o.pickupTime)}
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-slate-500">
                                        {fmtHM(o.pickupTime)} · {o.route || "—"}
                                    </div>
                                </div>

                                <button
                                    onClick={() => onAssign?.(o)}
                                    className="shrink-0 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-[13px] font-medium shadow-sm"
                                >
                                    Gán chuyến
                                </button>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="text-[13px] text-slate-500 px-3 py-6">
                                Không có đơn PENDING.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ===== Legend (pastel giống badge trong AdminBranchListPage) =====
function Legend() {
    const Item = ({ boxClass, label }) => (
        <div className="flex items-center gap-2 text-[12px] text-slate-700">
            <span className={`h-3 w-3 rounded border inline-block ${boxClass}`} />
            <span className="text-slate-700">{label}</span>
        </div>
    );

    return (
        <div className="flex flex-wrap gap-4">
            <Item
                boxClass="bg-emerald-50 border-emerald-300"
                label="Rảnh (nền)"
            />
            <Item
                boxClass="bg-rose-50 border-rose-300"
                label="Bận (chuyến)"
            />
            <Item
                boxClass="bg-amber-50 border-amber-300"
                label="Bảo trì"
            />
            <Item
                boxClass="bg-cyan-200 border-cyan-300"
                label="Ca làm"
            />
            <div className="flex items-center gap-2 text-[12px] text-slate-700">
                <span className="h-3 w-3 rounded bg-white ring-2 ring-fuchsia-500 inline-block" />
                <span className="text-slate-700">Xung đột (Overlap)</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-700">
                <span className="h-3 w-3 rounded bg-white ring-2 ring-amber-400 inline-block" />
                <span className="text-slate-700">Thiếu nghỉ giữa chuyến</span>
            </div>
        </div>
    );
}

// ===== TimeHeader =====
function TimeHeader({ zoom }) {
    const totalMinutes = (DAY_END - DAY_START) * 60;
    const ticks = Array.from(
        { length: totalMinutes / TICK_MINUTES + 1 },
        (_, i) => i * TICK_MINUTES
    );
    const width = (DAY_END - DAY_START) * HOUR_WIDTH * zoom;

    return (
        <div className="relative border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 w-80 shrink-0 px-4 py-2 text-[11px] text-slate-500 tracking-wide flex items-center gap-2 bg-slate-50">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="uppercase font-medium">THỜI GIAN</span>
                <span className="text-slate-400">(mỗi {TICK_MINUTES}')</span>
            </div>

            <div className="overflow-hidden">
                <div className="relative" style={{ width }}>
                    {ticks.map((m, idx) => {
                        const left = (m / 60) * HOUR_WIDTH * zoom;
                        const isHour = m % 60 === 0;
                        return (
                            <div
                                key={idx}
                                className={`absolute top-0 bottom-0 ${COLORS.GRID} ${isHour ? "border-l" : ""
                                }`}
                                style={{ left }}
                            >
                                {isHour && (
                                    <div className="text-[10px] text-slate-500 px-2 py-1 font-mono">
                                        {pad2(DAY_START + m / 60)}:00
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Tooltip({ children, text }) {
    return (
        <div className="group relative">
            {children}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-pre rounded-md bg-slate-800 px-2 py-1 text-[11px] leading-4 text-white opacity-0 shadow-md transition group-hover:opacity-100">
                {text}
            </div>
        </div>
    );
}

function UtilBadge({ percent }) {
    return (
        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
            <div className="w-20 h-2 bg-slate-200 rounded overflow-hidden">
                <div
                    className="h-full bg-emerald-500"
                    style={{
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                    }}
                />
            </div>
            <span className="tabular-nums font-medium text-slate-600">
                {String(percent).padStart(2, " ")}%
            </span>
        </div>
    );
}

function Row({
                 kind,
                 label,
                 date,
                 items = [],
                 shift,
                 zoom,
                 onOpen,
                 showLabels,
                 showBusy,
                 showMaint,
                 minRest = 30,
             }) {
    const width = (DAY_END - DAY_START) * HOUR_WIDTH * zoom;

    const overlap = computeOverlapFlags(items);
    const rest = computeRestFlags(items, minRest);
    const util = utilizationPercent(shift, items, ["BUSY"]);

    const filteredItems = items.filter(
        (it) =>
            (it.type === "BUSY" && showBusy) ||
            (it.type === "MAINT" && showMaint)
    );

    return (
        <div className={`flex ${COLORS.GRID} border-b`}>
            {/* left sticky label */}
            <div className="sticky left-0 z-10 w-80 shrink-0 bg-white/95 backdrop-blur px-4 py-2 text-[13px] text-slate-900 flex items-center gap-2 border-r border-slate-200">
                {kind === "driver" ? (
                    <UserRound className="h-4 w-4 text-emerald-600" />
                ) : (
                    <CarIcon className="h-4 w-4 text-sky-600" />
                )}
                <span className="truncate font-medium" title={label}>
                    {label}
                </span>

                <UtilBadge percent={util} />
            </div>

            {/* timeline cells */}
            <div
                className={`relative ${COLORS.FREE_BG}`}
                style={{ width }}
            >
                {/* Lưới 30' */}
                {Array.from(
                    {
                        length:
                            ((DAY_END - DAY_START) * 60) / TICK_MINUTES + 1,
                    },
                    (_, i) => (
                        <div
                            key={i}
                            className={`absolute top-0 bottom-0 ${COLORS.GRID} ${i % 2 === 0 ? "border-l" : ""
                            }`}
                            style={{
                                left:
                                    (i * TICK_MINUTES) / 60 *
                                    HOUR_WIDTH *
                                    zoom,
                            }}
                        />
                    )
                )}

                {/* SHIFT block */}
                {shift && (
                    <div
                        title={`Ca làm ${fmtHM(shift.start)} → ${fmtHM(
                            shift.end
                        )}`}
                        className={`absolute top-2 h-9 rounded-md ${COLORS.SHIFT}`}
                        style={{
                            left: xFrom(date, shift.start, zoom),
                            width: wFrom(shift.start, shift.end, zoom),
                        }}
                    />
                )}

                {/* ITEMS (busy / maint / ...) */}
                {filteredItems.map((it, i) => {
                    const idx = items.indexOf(it);

                    const x = xFrom(date, it.start, zoom);
                    const w = wFrom(it.start, it.end, zoom);
                    const baseColor =
                        it.type === "BUSY" ? COLORS.BUSY : COLORS.MAINT;

                    // tooltip text
                    let tt = it.type === "BUSY" ? "Chuyến" : "Bảo trì";
                    tt += `\n${fmtHM(it.start)} → ${fmtHM(it.end)} (${Math.round(
                        minutesBetween(it.start, it.end)
                    )}p)`;
                    if (it.ref) tt += `\nRef: ${it.ref}`;
                    if (it.note) tt += `\n${it.note}`;

                    const rings = [
                        overlap[idx] ? COLORS.OVERLAP : "",
                        rest[idx] ? COLORS.REST : "",
                    ].join(" ");

                    const textColor =
                        it.type === "BUSY" ? "text-white" : "text-slate-900";

                    return (
                        <div
                            key={i}
                            className="absolute top-1.5"
                            style={{ left: x }}
                        >
                            <Tooltip text={tt}>
                                <button
                                    onClick={() =>
                                        onOpen?.(it, { kind, label })
                                    }
                                    className={`h-7 rounded-lg ${baseColor} shadow-sm hover:brightness-110 active:scale-[.99] transition px-2 ${rings}`}
                                    style={{
                                        width: Math.max(12, w),
                                    }}
                                >
                                    {showLabels && (
                                        <span
                                            className={`pointer-events-none select-none text-[11px] leading-none font-medium truncate block ${textColor}`}
                                        >
                                            {it.ref ||
                                                it.note ||
                                                `${fmtHM(it.start)}-${fmtHM(
                                                    it.end
                                                )}`}
                                        </span>
                                    )}
                                </button>
                            </Tooltip>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===== Modal chi tiết block thời gian =====
function Modal({ open, onClose, item }) {
    return (
        <AnimatedDialog
            open={open}
            onClose={onClose}
            size="md"
            showCloseButton={true}
        >
            <div className="p-5 text-slate-900">
                <div className="text-base font-semibold text-slate-900 mb-1">
                    Chi tiết
                </div>
                <div className="text-[13px] text-slate-500 mb-4">
                    Khối thời gian được chọn.
                </div>

                <div className="space-y-2 text-[13px] text-slate-700">
                    <div className="flex justify-between">
                        <span>Loại</span>
                        <span className="font-mono text-slate-900">
                            {item?.type}
                        </span>
                    </div>

                    {item?.ref && (
                        <div className="flex justify-between">
                            <span>Ref</span>
                            <span className="font-mono text-[12px] text-slate-900">
                                {item.ref}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between">
                        <span>Thời gian</span>
                        <span className="tabular-nums text-slate-900">
                            {fmtHM(item?.start)} → {fmtHM(item?.end)}
                        </span>
                    </div>

                    {item?.note && (
                        <div className="text-slate-600">
                            Ghi chú: {item.note}
                        </div>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-[13px] text-slate-600 font-medium transition-colors"
                    >
                        Đóng
                    </button>
                    <button className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-[13px] text-white font-medium shadow-sm transition-colors">
                        Mở chi tiết
                    </button>
                </div>
            </div>
        </AnimatedDialog>
    );
}

// ===== Dialog gán chuyến (stub M5.S3) =====
function AssignDialog({
                          open,
                          order,
                          suggestions,
                          onClose,
                          onConfirm,
                          submitting = false,
                          error = "",
                          optionsLoading = false,
                          optionsError = "",
                      }) {
    const [driverId, setDriverId] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");

    React.useEffect(() => {
        setDriverId("");
        setVehicleId("");
    }, [order, open]);

    if (!open || !order) return null;

    const ready = driverId && vehicleId;
    const canConfirm = ready && !submitting;
    const disableSelects = optionsLoading || submitting;

    return (
        <AnimatedDialog
            open={open}
            onClose={onClose}
            size="lg"
            showCloseButton={true}
        >
            <div className="p-5 text-slate-900">
                <div className="text-base font-semibold text-slate-900 mb-1">
                    Gán chuyến · {order.code}
                </div>
                <div className="text-[13px] text-slate-500 mb-4">
                    Pickup {fmtHM(order.pickupTime)} · {fmtRel(order.pickupTime)} ·{" "}
                    {order.route || "—"}
                </div>

                {(optionsLoading || optionsError) && (
                    <div className="mb-3">
                        {optionsLoading && (
                            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                <span>Đang tải danh sách theo chi nhánh...</span>
                            </div>
                        )}
                        {optionsError && (
                            <div className="text-[13px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 mt-2">
                                {optionsError}
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                        <div className="mb-1 text-slate-700 font-medium">
                            Chọn Tài xế
                        </div>
                        <select
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            disabled={disableSelects}
                            className="w-full bg-white border border-slate-300 rounded-md px-2 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <option value="">
                                {optionsLoading ? "Đang tải..." : "-- Chọn tài xế --"}
                            </option>
                            {suggestions.drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="mb-1 text-slate-700 font-medium">
                            Chọn Xe
                        </div>
                        <select
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            disabled={disableSelects}
                            className="w-full bg-white border border-slate-300 rounded-md px-2 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <option value="">
                                {optionsLoading ? "Đang tải..." : "-- Chọn xe --"}
                            </option>
                            {suggestions.vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.plate}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 text-[13px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 px-3 py-2 text-[13px] text-slate-600 font-medium"
                    >
                        Huỷ
                    </button>
                    <button
                        disabled={!canConfirm}
                        onClick={() => {
                            if (!ready || submitting) return;
                            onConfirm?.({
                                bookingId: order.bookingId ?? order.raw?.bookingId ?? order.id,
                                tripId: order.tripId ?? order.raw?.tripId ?? order.id,
                                driverId,
                                vehicleId,
                            });
                        }}
                        className={`rounded-md px-3 py-2 text-[13px] font-medium shadow-sm ${canConfirm
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                        {submitting ? "Đang gán..." : "Gán"}
                    </button>
                </div>
            </div>
        </AnimatedDialog>
    );
}

// ===== MAIN PAGE =====
export default function CoordinatorTimelinePro() {
    const [date, setDate] = React.useState(() =>
        new Date().toISOString().slice(0, 10)
    );
    const [zoom, setZoom] = React.useState(1);
    const [query, setQuery] = React.useState("");
    const [queueQuery, setQueueQuery] = React.useState("");
    const role = React.useMemo(() => getCurrentRole(), []);
    const userId = React.useMemo(() => getStoredUserId(), []);
    const isBranchScoped =
        role === ROLES.MANAGER || role === ROLES.COORDINATOR;

    const [drivers, setDrivers] = React.useState([]);
    const [vehicles, setVehicles] = React.useState([]);
    const [pending, setPending] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [branchId, setBranchId] = React.useState("");
    const [branchLoading, setBranchLoading] = React.useState(true);
    const [branchError, setBranchError] = React.useState("");

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [active, setActive] = React.useState(null);

    const [assignOrder, setAssignOrder] = React.useState(null);
    const [assignSuggest, setAssignSuggest] = React.useState({
        drivers: [],
        vehicles: [],
    });
    const [assignOptionsLoading, setAssignOptionsLoading] = React.useState(false);
    const [assignOptionsError, setAssignOptionsError] = React.useState("");
    const [assigning, setAssigning] = React.useState(false);
    const [assignErrorMsg, setAssignErrorMsg] = React.useState("");

    const [showLabels, setShowLabels] = React.useState(true);
    const [showBusy, setShowBusy] = React.useState(true);
    const [showMaint, setShowMaint] = React.useState(true);
    const [minRest, setMinRest] = React.useState(30); // phút

    React.useEffect(() => {
        let cancelled = false;
        async function loadBranches() {
            setBranchLoading(true);
            setBranchError("");
            try {
                if (isBranchScoped) {
                    // Validate userId
                    if (!userId || userId.trim() === "") {
                        throw new Error("Không xác định được user ID. Vui lòng đăng nhập lại.");
                    }
                    const userIdNum = Number(userId);
                    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
                        throw new Error(`User ID không hợp lệ: ${userId}`);
                    }

                    console.log("[CoordinatorTimelinePro] Loading branch for userId:", userIdNum);

                    try {
                        const resp = await getBranchByUserId(userIdNum);
                        if (cancelled) return;

                        console.log("[CoordinatorTimelinePro] Branch response:", resp);
                        const option = mapBranchRecord(resp);
                        if (cancelled) return;

                        setBranches(option ? [option] : []);
                        setBranchId((prev) => prev || (option?.id || ""));
                        if (!option) {
                            setBranchError("Không tìm thấy chi nhánh phụ trách. Vui lòng liên hệ quản trị viên.");
                        }
                    } catch (branchErr) {
                        // If getBranchByUserId fails, try to load all branches as fallback
                        console.warn("[CoordinatorTimelinePro] Failed to get user branch, trying all branches:", branchErr);
                        const res = await listBranches({ page: 0, size: 100 });
                        if (cancelled) return;
                        const options = extractBranchItems(res)
                            .map(mapBranchRecord)
                            .filter(Boolean);
                        setBranches(options);
                        setBranchId((prev) => prev || (options[0]?.id || ""));
                        if (!options.length) {
                            throw new Error("Không tìm thấy chi nhánh nào.");
                        }
                    }
                } else {
                    console.log("[CoordinatorTimelinePro] Loading all branches for Admin...");
                    const res = await listBranches({ page: 0, size: 100 });
                    if (cancelled) return;
                    console.log("[CoordinatorTimelinePro] Branches API response:", res);

                    const rawItems = extractBranchItems(res);
                    console.log("[CoordinatorTimelinePro] Extracted raw items:", rawItems);

                    const options = rawItems
                        .map(mapBranchRecord)
                        .filter(Boolean);
                    console.log("[CoordinatorTimelinePro] Mapped branch options:", options);

                    setBranches(options);
                    setBranchId((prev) => prev || (options[0]?.id || ""));
                    if (!options.length) {
                        setBranchError("Chưa có chi nhánh.");
                    }
                }
            } catch (err) {
                if (cancelled) return;
                console.error("[CoordinatorTimelinePro] Failed to load branches:", err);
                setBranches([]);
                setBranchId("");

                // Extract error message
                let msg = "Không tải được danh sách chi nhánh.";
                if (err?.data?.message) {
                    msg = err.data.message;
                } else if (err?.data?.data?.message) {
                    msg = err.data.data.message;
                } else if (err?.message) {
                    msg = err.message;
                }

                // Handle specific backend errors
                if (err?.status === 404 || msg.includes("không thuộc") || msg.includes("không tìm thấy")) {
                    msg = "Không tìm thấy chi nhánh phụ trách. Vui lòng liên hệ quản trị viên để được gán chi nhánh.";
                } else if (err?.status === 401 || err?.status === 403) {
                    msg = "Không có quyền truy cập. Vui lòng đăng nhập lại.";
                }

                setBranchError(msg);
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        }
        loadBranches();
        return () => {
            cancelled = true;
        };
    }, [isBranchScoped, userId]);

    // Scroll sync
    const headerRef = React.useRef(null);
    const bodyRef = React.useRef(null);
    const syncScroll = () => {
        if (headerRef.current && bodyRef.current) {
            headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
        }
    };

    // Load data
    const fetchData = React.useCallback(
        async (branch, d) => {
            if (!branch) {
                console.warn("[CoordinatorTimelinePro] No branch ID provided");
                return;
            }
            const branchNumeric = Number(branch);
            if (!Number.isFinite(branchNumeric) || branchNumeric <= 0) {
                console.warn("[CoordinatorTimelinePro] Invalid branch ID:", branch);
                return;
            }
            setLoading(true);
            setError("");
            try {
                console.log("[CoordinatorTimelinePro] Fetching dashboard for branch:", branchNumeric, "date:", d);
                const payload = await getDispatchDashboard({
                    branchId: branchNumeric,
                    date: d,
                });
                console.log("[CoordinatorTimelinePro] Dashboard payload:", payload);

                const pendingRows =
                    payload?.pendingTrips ??
                    payload?.pending_trips ??
                    payload?.pending_orders ??
                    [];
                const driverRows =
                    payload?.driverSchedules ??
                    payload?.driver_schedules ??
                    [];
                const vehicleRows =
                    payload?.vehicleSchedules ??
                    payload?.vehicle_schedules ??
                    [];
                setPending(normalizePendingTrips(pendingRows));
                setDrivers(normalizeDriverSchedules(driverRows));
                setVehicles(normalizeVehicleSchedules(vehicleRows));
            } catch (err) {
                console.error("[CoordinatorTimelinePro] Failed to load dashboard:", err);

                // Clear data on error
                setPending([]);
                setDrivers([]);
                setVehicles([]);

                // Extract error message
                let msg = "Không tải được dữ liệu dashboard.";
                if (err?.data?.message) {
                    msg = err.data.message;
                } else if (err?.data?.data?.message) {
                    msg = err.data.data.message;
                } else if (err?.message) {
                    msg = err.message;
                }

                // Handle specific errors
                if (err?.status === 401 || err?.status === 403) {
                    msg = "Không có quyền truy cập dashboard. Vui lòng đăng nhập lại.";
                } else if (err?.status === 404) {
                    msg = "Không tìm thấy dữ liệu cho chi nhánh này.";
                }

                setError(msg);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    React.useEffect(() => {
        if (!branchId || branchLoading) return;
        fetchData(branchId, date);
    }, [branchId, branchLoading, date, fetchData]);

    React.useEffect(() => {
        if (!assignOrder) return;
        const branchNumeric = Number(branchId);
        if (!branchId || !Number.isFinite(branchNumeric)) {
            setAssignOptionsError("Chi nhanh khong hop le.");
            setAssignOptionsLoading(false);
            return;
        }
        let cancelled = false;
        async function loadOptions() {
            setAssignOptionsLoading(true);
            setAssignOptionsError("");
            try {
                const [driverList, vehicleList] = await Promise.all([
                    listDriversByBranch(branchNumeric),
                    listVehiclesByBranch(branchNumeric),
                ]);
                if (cancelled) return;
                setAssignSuggest({
                    drivers: mapDriverOptions(driverList),
                    vehicles: mapVehicleOptions(vehicleList),
                });
            } catch (err) {
                if (cancelled) return;
                setAssignOptionsError(
                    err?.data?.message ||
                    err?.message ||
                    "Khong tai duoc danh sach tai xe/xe theo chi nhanh."
                );
            } finally {
                if (!cancelled) setAssignOptionsLoading(false);
            }
        }
        loadOptions();
        return () => {
            cancelled = true;
        };
    }, [assignOrder, branchId]);

    const width = (DAY_END - DAY_START) * HOUR_WIDTH * zoom;

    const nowX = React.useMemo(() => {
        if (!isSameDay(date)) return null;
        const now = new Date();
        const hhmm = new Date(
            `${date}T${pad2(now.getHours())}:${pad2(
                now.getMinutes()
            )}:00`
        );
        return xFrom(date, hhmm, zoom);
    }, [date, zoom]);

    const filterByQuery = (rows, getLabel) =>
        rows.filter((r) =>
            getLabel(r)
                .toLowerCase()
                .includes(query.trim().toLowerCase())
        );

    const _drivers = filterByQuery(drivers, (d) => d.name || "");
    const _vehicles = filterByQuery(vehicles, (v) => v.plate || "");

    const jumpTo = (hh) => {
        const pos = (hh - DAY_START) * HOUR_WIDTH * zoom;
        if (headerRef.current)
            headerRef.current.scrollLeft = Math.max(0, pos - 120);
        if (bodyRef.current)
            bodyRef.current.scrollLeft = Math.max(0, pos - 120);
    };
    const dataLoading = loading || branchLoading;
    const queueOrders = branchId ? pending : [];


    // gợi ý assign
    const isWithin = (when, start, end) =>
        new Date(start) <= new Date(when) &&
        new Date(when) <= new Date(end);

    const occupyAt = (
        items,
        when,
        disallowTypes = ["BUSY"]
    ) =>
        items?.some(
            (it) =>
                disallowTypes.includes(it.type) &&
                isWithin(when, it.start, it.end)
        );

    const availableDriversAt = (when) => {
        return drivers
            .filter(
                (d) =>
                    d.shift &&
                    isWithin(when, d.shift.start, d.shift.end) &&
                    !occupyAt(d.items || [], when, ["BUSY"])
            )
            .sort(
                (a, b) =>
                    (a.items?.length || 0) -
                    (b.items?.length || 0)
            )
            .slice(0, 6);
    };

    const availableVehiclesAt = (when) => {
        return vehicles
            .filter(
                (v) =>
                    v.shift &&
                    isWithin(when, v.shift.start, v.shift.end) &&
                    !occupyAt(v.items || [], when, [
                        "BUSY",
                        "MAINT",
                    ])
            )
            .sort(
                (a, b) =>
                    (a.items?.length || 0) -
                    (b.items?.length || 0)
            )
            .slice(0, 6);
    };

    const openAssign = (order) => {
        const driversS = availableDriversAt(order.pickupTime);
        const vehiclesS = availableVehiclesAt(order.pickupTime);
        setAssignOrder(order);
        setAssignSuggest({
            drivers: driversS,
            vehicles: vehiclesS,
        });
        setAssignOptionsError("");
        setAssignOptionsLoading(false);
        setAssignErrorMsg("");
        setAssigning(false);
    };

    const handleConfirmAssign = async ({
                                           bookingId,
                                           tripId,
                                           driverId,
                                           vehicleId,
                                       }) => {
        if (!assignOrder && !bookingId) return;
        const targetBooking = bookingId ?? assignOrder?.bookingId ?? assignOrder?.id;
        if (targetBooking == null) {
            setAssignErrorMsg("Khong xac dinh duoc booking.");
            return;
        }
        const bookingNumeric = Number(targetBooking);
        if (!Number.isFinite(bookingNumeric)) {
            setAssignErrorMsg("Khong xac dinh duoc ma booking.");
            return;
        }
        const targetTrip = tripId ?? assignOrder?.tripId ?? assignOrder?.id;
        const tripNumeric =
            targetTrip != null && targetTrip !== ""
                ? Number(targetTrip)
                : undefined;
        const driver = driverId ? Number(driverId) : undefined;
        const vehicle = vehicleId ? Number(vehicleId) : undefined;
        setAssigning(true);
        setAssignErrorMsg("");
        try {
            await assignTrips({
                bookingId: bookingNumeric,
                tripIds:
                    tripNumeric && Number.isFinite(tripNumeric)
                        ? [tripNumeric]
                        : undefined,
                driverId: driver,
                vehicleId: vehicle,
            });
            setAssignOrder(null);
            setAssignSuggest({ drivers: [], vehicles: [] });
            if (branchId) {
                await fetchData(branchId, date);
            }
        } catch (err) {
            const msg =
                err?.data?.message ||
                err?.message ||
                "Khong the gan chuyen.";
            setAssignErrorMsg(msg);
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
            <div className="mx-auto max-w-[1400px] space-y-5">
                {/* HEADER giống AdminBranchListPage */}
                <div className="flex flex-wrap items-start gap-4 mb-5">
                    {/* left block: icon + title + desc */}
                    <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                        <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
                            <CalendarDays className="h-5 w-5" />
                        </div>

                        <div className="flex flex-col">
                            <div className="text-[11px] text-slate-500 leading-none mb-1">
                                Điều phối đội xe / tài xế
                            </div>

                            <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                                Coordinator (Queue + Schedule)
                            </h1>

                            <p className="text-slate-500 text-[13px]">
                                Queue (PENDING) · Gantt 06:00–24:00 · tick
                                30' · Now · Zoom · %Utilization · Alerts
                            </p>
                        </div>
                    </div>

                    {/* right block: controls */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
                        {/* branch */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 min-w-[220px] relative z-10">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            {branchLoading ? (
                                <div className="flex items-center gap-1 text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Đang tải...</span>
                                </div>
                            ) : branches.length ? (
                                <select
                                    className={`bg-transparent outline-none text-[13px] text-slate-900 min-w-[140px] appearance-none pr-6 focus:ring-2 focus:ring-sky-500 rounded ${isBranchScoped ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                                    }`}
                                    value={branchId}
                                    onChange={(e) => {
                                        const newBranchId = e.target.value;
                                        if (newBranchId) {
                                            setBranchId(newBranchId);
                                        }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    disabled={isBranchScoped}
                                    title={isBranchScoped ? "Manager/Coordinator chỉ xem được chi nhánh của mình" : "Chọn chi nhánh"}
                                    style={{
                                        pointerEvents: isBranchScoped ? 'none' : 'auto'
                                    }}
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-rose-600 text-[12px]">Chưa có chi nhánh</span>
                            )}
                        </div>

                        {/* date */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 relative z-10">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            <input
                                type="date"
                                className="bg-transparent outline-none text-[13px] text-slate-900 cursor-pointer w-full"
                                value={date}
                                onChange={(e) => {
                                    const newDate = e.target.value;
                                    if (newDate) {
                                        setDate(newDate);
                                    }
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                style={{
                                    pointerEvents: 'auto',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'textfield'
                                }}
                            />
                        </div>

                        {/* zoom - */}
                        <button
                            onClick={() =>
                                setZoom((z) => Math.max(0.5, z - 0.25))
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                            <ZoomOut className="h-4 w-4 text-slate-600" />
                            Zoom-
                        </button>

                        {/* zoom + */}
                        <button
                            onClick={() =>
                                setZoom((z) => Math.min(2.5, z + 0.25))
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                            <ZoomIn className="h-4 w-4 text-slate-600" />
                            Zoom+
                        </button>

                        {/* quick jumps */}
                        <button
                            onClick={() => jumpTo(8)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                        >
                            08:00
                        </button>
                        <button
                            onClick={() => jumpTo(12)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                        >
                            12:00
                        </button>
                        <button
                            onClick={() => jumpTo(18)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100"
                        >
                            18:00
                        </button>
                        <button
                            onClick={() =>
                                jumpTo(new Date().getHours())
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                            Now{" "}
                            <MoveRight className="inline h-4 w-4 text-slate-600" />
                        </button>

                        {/* refresh */}
                        <button
                            onClick={() => {
                                if (branchId) {
                                    fetchData(branchId, date);
                                }
                            }}
                            disabled={loading}
                            className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-[13px] text-emerald-700 font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                                <RefreshCw className="h-4 w-4 text-emerald-600" />
                            )}
                            Refresh
                        </button>

                        {/* export */}
                        <button
                            onClick={() => {
                                const blob = new Blob(
                                    [
                                        JSON.stringify(
                                            {
                                                date,
                                                drivers,
                                                vehicles,
                                                pending,
                                            },
                                            null,
                                            2
                                        ),
                                    ],
                                    {
                                        type: "application/json",
                                    }
                                );
                                const url =
                                    URL.createObjectURL(blob);
                                const a =
                                    document.createElement(
                                        "a"
                                    );
                                a.href = url;
                                a.download = `coordinator-${date}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                            <Download className="h-4 w-4 text-slate-600" />
                            Export
                        </button>
                    </div>
                </div>

                {/* FILTER BAR for Gantt */}
                <div className="flex flex-wrap items-center gap-3 text-[13px]">
                    {/* search driver/vehicle */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                        <Search className="h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Tìm tài xế / xe"
                            className="bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400"
                            value={query}
                            onChange={(e) =>
                                setQuery(e.target.value)
                            }
                        />
                    </div>

                    <label className="inline-flex items-center gap-2 text-slate-700 select-none">
                        <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={showLabels}
                            onChange={(e) =>
                                setShowLabels(e.target.checked)
                            }
                        />
                        <span>Nhãn trên thanh</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-slate-700 select-none">
                        <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={showBusy}
                            onChange={(e) =>
                                setShowBusy(e.target.checked)
                            }
                        />
                        <span>BUSY</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-slate-700 select-none">
                        <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={showMaint}
                            onChange={(e) =>
                                setShowMaint(e.target.checked)
                            }
                        />
                        <span>MAINT</span>
                    </label>

                    <div className="flex items-center gap-2 text-slate-700 flex-wrap">
                        <span>Nghỉ tối thiểu:</span>
                        <input
                            type="number"
                            min={0}
                            step={5}
                            value={minRest}
                            onChange={(e) =>
                                setMinRest(
                                    Number(
                                        e.target
                                            .value || 0
                                    )
                                )
                            }
                            className="w-20 bg-white border border-slate-300 rounded-md px-2 py-1 text-[13px] text-slate-900"
                        />
                        <span>phút</span>
                    </div>

                    <Legend />
                </div>

                {/* MAIN LAYOUT: Queue (left) + Gantt (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
                    {/* Khung 1: Queue */}
                    <QueuePanel
                        orders={queueOrders}
                        onAssign={openAssign}
                        query={queueQuery}
                        onQuery={setQueueQuery}
                        loading={dataLoading}
                    />

                    {/* Khung 2: Gantt */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-lg shadow-slate-200/50 bg-white">
                        {/* TIME HEADER (scroll sync container 1) */}
                        <div
                            className="overflow-x-auto"
                            ref={headerRef}
                        >
                            <div style={{ width }}>
                                <TimeHeader zoom={zoom} />
                            </div>
                        </div>

                        {/* BODY (scroll sync container 2) */}
                        <div
                            className="relative overflow-x-auto max-h-[66vh]"
                            ref={bodyRef}
                            onScroll={syncScroll}
                        >
                            {/* Now line (sky brand) */}
                            {nowX !== null && (
                                <div
                                    className="pointer-events-none absolute top-0 bottom-0"
                                    style={{ left: nowX }}
                                >
                                    <div className="h-full w-[2px] bg-sky-500/80 shadow-[0_0_12px_rgba(2,132,199,0.6)]" />
                                </div>
                            )}

                            {/* Content rows */}
                            <div
                                style={{ width }}
                                className="bg-white"
                            >
                                {dataLoading ? (
                                    <div className="p-6 text-slate-500 text-[13px]">
                                        Đang tải dữ liệu...
                                    </div>
                                ) : (
                                    <>
                                        {/* DRIVERS */}
                                        <div>
                                            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-2 text-[11px] text-slate-500 border-b border-slate-200 flex items-center gap-2 uppercase font-medium tracking-wide">
                                                <UserRound className="h-4 w-4 text-emerald-600" />
                                                <span>
                                                    TÀI XẾ ({_drivers.length})
                                                </span>
                                            </div>
                                            {_drivers.map((d) => (
                                                <Row
                                                    key={d.id}
                                                    kind="driver"
                                                    label={d.name}
                                                    date={date}
                                                    items={d.items}
                                                    shift={d.shift}
                                                    zoom={zoom}
                                                    onOpen={setActive}
                                                    showLabels={showLabels}
                                                    showBusy={showBusy}
                                                    showMaint={showMaint}
                                                    minRest={minRest}
                                                />
                                            ))}
                                        </div>

                                        {/* VEHICLES */}
                                        <div>
                                            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-2 text-[11px] text-slate-500 border-b border-slate-200 flex items-center gap-2 uppercase font-medium tracking-wide">
                                                <CarIcon className="h-4 w-4 text-sky-600" />
                                                <span>
                                                    XE ({_vehicles.length})
                                                </span>
                                            </div>
                                            {_vehicles.map((v) => (
                                                <Row
                                                    key={v.id}
                                                    kind="vehicle"
                                                    label={v.plate}
                                                    date={date}
                                                    items={v.items}
                                                    shift={v.shift}
                                                    zoom={zoom}
                                                    onOpen={setActive}
                                                    showLabels={showLabels}
                                                    showBusy={showBusy}
                                                    showMaint={showMaint}
                                                    minRest={minRest}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {(branchError || error) && (
                    <div className="space-y-2">
                        {branchError && (
                            <div className="flex items-center justify-between text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-rose-600" />
                                    <span>{branchError}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setBranchError("");
                                        setBranchLoading(true);
                                        // Trigger reload by updating a dependency
                                        const currentUserId = getStoredUserId();
                                        if (currentUserId && isBranchScoped) {
                                            getBranchByUserId(Number(currentUserId))
                                                .then((resp) => {
                                                    const option = mapBranchRecord(resp);
                                                    setBranches(option ? [option] : []);
                                                    setBranchId((prev) => prev || (option?.id || ""));
                                                    if (!option) {
                                                        setBranchError("Không tìm thấy chi nhánh phụ trách.");
                                                    }
                                                })
                                                .catch((err) => {
                                                    const msg =
                                                        err?.data?.message ||
                                                        err?.message ||
                                                        "Không tải được thông tin chi nhánh.";
                                                    setBranchError(msg);
                                                })
                                                .finally(() => setBranchLoading(false));
                                        }
                                    }}
                                    className="ml-4 rounded-md bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-[12px] font-medium shadow-sm flex items-center gap-1"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Thử lại
                                </button>
                            </div>
                        )}
                        {error && (
                            <div className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chi tiết block thời gian */}
            <Modal
                open={!!active}
                onClose={() => setActive(null)}
                item={active}
            />

            {/* Dialog gán chuyến */}
            <AssignDialog
                open={!!assignOrder}
                order={assignOrder}
                suggestions={assignSuggest}
                onClose={() => {
                    setAssignOrder(null);
                    setAssignErrorMsg("");
                    setAssigning(false);
                }}
                onConfirm={handleConfirmAssign}
                submitting={assigning}
                error={assignErrorMsg}
                optionsLoading={assignOptionsLoading}
                optionsError={assignOptionsError}
            />
        </div>
    );
}

