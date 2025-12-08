import React from "react";
import { useNavigate } from "react-router-dom";
import {
    CalendarDays,
    Search,
    UserRound,
    Clock,
    MoveRight,
    Download,
    ListChecks,
    Building2,
    Loader2,
    AlertCircle,
    RefreshCw,
    ClipboardList,
    CheckCircle2,
    XCircle,
    PlayCircle,
    TrendingUp,
} from "lucide-react";
import { getDispatchDashboard, assignTrips } from "../../api/dispatch";
import { listBranches, getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { listDriversByBranch } from "../../api/drivers";
import { listVehiclesByBranch } from "../../api/vehicles";
import AnimatedDialog from "../common/AnimatedDialog";

/**
 * CoordinatorTimelinePro – Bảng điều phối (LIGHT THEME, styled giống AdminBranchListPage)
 *
 * Khung 1 (Bên trái):
 *   - Hiển thị các chuyến chưa được gắn lịch (PENDING)
 *   - Tìm kiếm
 *   - Click vào chuyến để hiện popup gắn lịch kèm gợi ý
 *
 * Khung 2 (Bên phải):
 *   - Danh sách sự cố chuyến đi (nếu có)
 *   - Click vào để xem chi tiết sự cố
 *
 * API dự kiến:
 *   GET  /api/v1/coordinator/dashboard?date=YYYY-MM-DD
 *   POST /api/v1/dispatch/assign { orderId, driverId, vehicleId }
 */

// ===== Helpers thời gian =====
const pad2 = (n) => String(n).padStart(2, "0");

const fmtHM = (d) => {
    const t = d instanceof Date ? d : new Date(d);
    const hh = pad2(t.getHours());
    const mm = pad2(t.getMinutes());
    return `${hh}:${mm}`;
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



// ===== Panel chuyến chưa gắn lịch (Bên trái) =====
function UnassignedTripsPanel({ orders, onAssign, query, onQuery, loading }) {
    const sorted = [...orders].sort(
        (a, b) => new Date(a.pickupTime) - new Date(b.pickupTime)
    );

    const q = (query || "").toLowerCase();
    const filtered = sorted.filter(
        (o) =>
            (o.code || "").toLowerCase().includes(q) ||
            (o.route || "").toLowerCase().includes(q) ||
            (o.customerName || "").toLowerCase().includes(q)
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
                    Chuyến chưa được gắn lịch
                </div>
                <div className="text-[12px] text-slate-500">
                    {loading ? "Đang tải..." : `${filtered.length} chuyến`}
                </div>
            </div>

            {/* search box */}
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 grow">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => onQuery?.(e.target.value)}
                        placeholder="Tìm theo mã / tuyến đường / khách hàng..."
                        className="bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400 w-full"
                    />
                </div>
            </div>

            {/* list */}
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="text-[13px] text-slate-500 px-3 py-6 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách chuyến...
                    </div>
                ) : (
                    <>
                        {filtered.map((o) => (
                            <button
                                key={o.id}
                                onClick={() => onAssign?.(o)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition p-3 flex items-center gap-3 text-left cursor-pointer"
                            >
                                <div className="flex flex-col min-w-0 grow">
                                    <div className="flex items-center gap-2 min-w-0 mb-1">
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
                                    <div className="text-[12px] text-slate-600 mb-0.5">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {fmtHM(o.pickupTime)}
                                    </div>
                                    <div className="text-[12px] text-slate-600 mb-0.5">
                                        <MoveRight className="h-3 w-3 inline mr-1" />
                                        {o.route || "—"}
                                    </div>
                                    {o.customerName && (
                                        <div className="text-[11px] text-slate-500">
                                            <UserRound className="h-3 w-3 inline mr-1" />
                                            {o.customerName}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 text-emerald-600">
                                    <MoveRight className="h-5 w-5" />
                                </div>
                            </button>
                        ))}

                        {filtered.length === 0 && (
                            <div className="text-[13px] text-slate-500 px-3 py-12 text-center">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                <div>Không có chuyến chưa gắn lịch</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ===== Panel sự cố chuyến đi (Bên phải) =====
function IncidentsPanel({ incidents = [], onViewDetail, loading }) {
    const [query, setQuery] = React.useState("");

    const q = query.toLowerCase();
    const filtered = incidents.filter(
        (inc) =>
            (inc.tripCode || "").toLowerCase().includes(q) ||
            (inc.description || "").toLowerCase().includes(q) ||
            (inc.driverName || "").toLowerCase().includes(q)
    );

    const severityCls = (severity) => {
        switch (severity?.toUpperCase()) {
            case "HIGH":
            case "CRITICAL":
                return "bg-rose-50 text-rose-700 border-rose-300";
            case "MEDIUM":
                return "bg-amber-50 text-amber-700 border-amber-300";
            case "LOW":
                return "bg-sky-50 text-sky-700 border-sky-300";
            default:
                return "bg-slate-50 text-slate-700 border-slate-300";
        }
    };

    const severityIcon = (severity) => {
        switch (severity?.toUpperCase()) {
            case "HIGH":
            case "CRITICAL":
                return <XCircle className="h-4 w-4 text-rose-600" />;
            case "MEDIUM":
                return <AlertCircle className="h-4 w-4 text-amber-600" />;
            default:
                return <AlertCircle className="h-4 w-4 text-sky-600" />;
        }
    };

    return (
        <div className="h-full rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {/* header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
                <div className="font-semibold text-slate-900 text-sm">
                    Sự cố chuyến đi
                </div>
                <div className="text-[12px] text-slate-500">
                    {loading ? "Đang tải..." : `${filtered.length} sự cố`}
                </div>
            </div>

            {/* search box */}
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 grow">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm theo mã chuyến / mô tả..."
                        className="bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400 w-full"
                    />
                </div>
            </div>

            {/* list */}
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2 space-y-2">
                {loading ? (
                    <div className="text-[13px] text-slate-500 px-3 py-6 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách sự cố...
                    </div>
                ) : (
                    <>
                        {filtered.map((inc) => (
                            <button
                                key={inc.id}
                                onClick={() => onViewDetail?.(inc)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 transition p-3 flex items-start gap-3 text-left cursor-pointer"
                            >
                                <div className="shrink-0 mt-0.5">
                                    {severityIcon(inc.severity)}
                                </div>
                                <div className="flex flex-col min-w-0 grow">
                                    <div className="flex items-center gap-2 min-w-0 mb-1">
                                        <span className="text-[13px] font-semibold text-slate-900 truncate">
                                            {inc.tripCode || "—"}
                                        </span>
                                        <span
                                            className={`text-[11px] border rounded px-1.5 py-0.5 font-medium ${severityCls(
                                                inc.severity
                                            )}`}
                                        >
                                            {inc.severity || "LOW"}
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-slate-700 mb-1 line-clamp-2">
                                        {inc.description || "Không có mô tả"}
                                    </div>
                                    {inc.driverName && (
                                        <div className="text-[11px] text-slate-500">
                                            <UserRound className="h-3 w-3 inline mr-1" />
                                            {inc.driverName}
                                        </div>
                                    )}
                                    {inc.reportedAt && (
                                        <div className="text-[11px] text-slate-500">
                                            <Clock className="h-3 w-3 inline mr-1" />
                                            {fmtHM(inc.reportedAt)}
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 text-slate-400">
                                    <MoveRight className="h-4 w-4" />
                                </div>
                            </button>
                        ))}

                        {filtered.length === 0 && (
                            <div className="text-[13px] text-slate-500 px-3 py-12 text-center">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-300" />
                                <div>Không có sự cố nào</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ===== Modal chi tiết sự cố =====
function IncidentDetailModal({ open, onClose, incident }) {
    if (!incident) return null;

    const severityCls = (severity) => {
        switch (severity?.toUpperCase()) {
            case "HIGH":
            case "CRITICAL":
                return "bg-rose-50 text-rose-700 border-rose-300";
            case "MEDIUM":
                return "bg-amber-50 text-amber-700 border-amber-300";
            case "LOW":
                return "bg-sky-50 text-sky-700 border-sky-300";
            default:
                return "bg-slate-50 text-slate-700 border-slate-300";
        }
    };

    return (
        <AnimatedDialog
            open={open}
            onClose={onClose}
            size="lg"
            showCloseButton={true}
        >
            <div className="p-5 text-slate-900">
                <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                    <div className="text-base font-semibold text-slate-900">
                        Chi tiết sự cố
                    </div>
                </div>
                <div className="text-[13px] text-slate-500 mb-4">
                    Thông tin chi tiết về sự cố chuyến đi
                </div>

                <div className="space-y-3 text-[13px]">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-slate-600">Mã chuyến</span>
                        <span className="font-semibold text-slate-900">
                            {incident.tripCode || "—"}
                        </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="text-slate-600">Mức độ</span>
                        <span
                            className={`text-[11px] border rounded px-2 py-1 font-medium ${severityCls(
                                incident.severity
                            )}`}
                        >
                            {incident.severity || "LOW"}
                        </span>
                    </div>

                    {incident.driverName && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">Tài xế</span>
                            <span className="text-slate-900">{incident.driverName}</span>
                        </div>
                    )}

                    {incident.vehiclePlate && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">Biển số xe</span>
                            <span className="text-slate-900 font-mono">{incident.vehiclePlate}</span>
                        </div>
                    )}

                    {incident.reportedAt && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">Thời gian báo cáo</span>
                            <span className="text-slate-900 tabular-nums">
                                {new Date(incident.reportedAt).toLocaleString("vi-VN")}
                            </span>
                        </div>
                    )}

                    <div className="pt-2">
                        <div className="text-slate-600 mb-2 font-medium">Mô tả sự cố</div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">
                            {incident.description || "Không có mô tả chi tiết"}
                        </div>
                    </div>

                    {incident.resolution && (
                        <div className="pt-2">
                            <div className="text-slate-600 mb-2 font-medium">Giải pháp xử lý</div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700">
                                {incident.resolution}
                            </div>
                        </div>
                    )}

                    {incident.status && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">Trạng thái</span>
                            <span className="text-slate-900">{incident.status}</span>
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
                        Xử lý sự cố
                    </button>
                </div>
            </div>
        </AnimatedDialog>
    );
}

// Các hàm helper không còn cần thiết cho Gantt chart đã được loại bỏ

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
    const navigate = useNavigate();
    // Removed date state - load all future trips
    const [queueQuery, setQueueQuery] = React.useState("");
    const role = React.useMemo(() => getCurrentRole(), []);
    const userId = React.useMemo(() => getStoredUserId(), []);
    const isBranchScoped =
        role === ROLES.MANAGER || role === ROLES.COORDINATOR;

    const [pending, setPending] = React.useState([]);
    const [incidents, setIncidents] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [branchId, setBranchId] = React.useState("");
    const [branchLoading, setBranchLoading] = React.useState(true);
    const [branchError, setBranchError] = React.useState("");

    // Thống kê dashboard
    const [stats, setStats] = React.useState({
        pendingCount: 0,
        assignedCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        incidentsCount: 0,
    });

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [selectedIncident, setSelectedIncident] = React.useState(null);

    const [assignOrder, setAssignOrder] = React.useState(null);
    const [assignSuggest, setAssignSuggest] = React.useState({
        drivers: [],
        vehicles: [],
    });
    const [assignOptionsLoading, setAssignOptionsLoading] = React.useState(false);
    const [assignOptionsError, setAssignOptionsError] = React.useState("");
    const [assigning, setAssigning] = React.useState(false);
    const [assignErrorMsg, setAssignErrorMsg] = React.useState("");

    // Removed Gantt-related states

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



    // Load data
    const fetchData = React.useCallback(
        async (branch) => {
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
                console.log("[CoordinatorTimelinePro] Fetching dashboard for branch:", branchNumeric);
                // Don't pass date - load all future trips
                const payload = await getDispatchDashboard({
                    branchId: branchNumeric,
                });
                console.log("[CoordinatorTimelinePro] Dashboard payload:", payload);

                const pendingRows =
                    payload?.pendingTrips ??
                    payload?.pending_trips ??
                    payload?.pending_orders ??
                    [];
                const incidentRows =
                    payload?.incidents ??
                    payload?.tripIncidents ??
                    [];
                setPending(normalizePendingTrips(pendingRows));
                setIncidents(incidentRows);

                // Cập nhật thống kê
                setStats({
                    pendingCount: payload?.pendingCount ?? pendingRows.length ?? 0,
                    assignedCount: payload?.assignedCount ?? 0,
                    cancelledCount: payload?.cancelledCount ?? 0,
                    completedCount: payload?.completedCount ?? 0,
                    inProgressCount: payload?.inProgressCount ?? 0,
                    incidentsCount: incidentRows.length ?? 0,
                });
            } catch (err) {
                console.error("[CoordinatorTimelinePro] Failed to load dashboard:", err);

                // Clear data on error
                setPending([]);
                setIncidents([]);

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
        fetchData(branchId);
    }, [branchId, branchLoading, fetchData]);

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

    const dataLoading = loading || branchLoading;
    const unassignedTrips = branchId ? pending : [];

    const openAssign = (order) => {
        // Navigate to order detail page instead of opening assignment dialog
        const orderId = order.bookingId || order.id;
        if (orderId) {
            navigate(`/orders/${orderId}`);
        }
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
                                Bảng điều phối
                            </h1>

                            <p className="text-slate-500 text-[13px]">
                                Chuyến chưa gắn lịch · Sự cố chuyến đi · Gán lịch nhanh
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

                        {/* refresh */}
                        <button
                            onClick={() => {
                                if (branchId) {
                                    fetchData(branchId);
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



                {/* THỐNG KÊ DASHBOARD */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Chờ gắn lịch */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-amber-700">{stats.pendingCount}</div>
                            <div className="text-[11px] text-amber-600 font-medium">Chờ gắn lịch</div>
                        </div>
                    </div>

                    {/* Đã gắn lịch */}
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-sky-700">{stats.assignedCount}</div>
                            <div className="text-[11px] text-sky-600 font-medium">Đã gắn lịch</div>
                        </div>
                    </div>

                    {/* Đang thực hiện */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <PlayCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-700">{stats.inProgressCount}</div>
                            <div className="text-[11px] text-emerald-600 font-medium">Đang thực hiện</div>
                        </div>
                    </div>

                    {/* Hoàn thành */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-700">{stats.completedCount}</div>
                            <div className="text-[11px] text-slate-600 font-medium">Hoàn thành</div>
                        </div>
                    </div>

                    {/* Đã hủy */}
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-rose-700">{stats.cancelledCount}</div>
                            <div className="text-[11px] text-rose-600 font-medium">Đã hủy</div>
                        </div>
                    </div>

                    {/* Sự cố */}
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-rose-700">{stats.incidentsCount}</div>
                            <div className="text-[11px] text-rose-600 font-medium">Sự cố</div>
                        </div>
                    </div>
                </div>

                {/* MAIN LAYOUT: Chuyến chưa gắn lịch (left) + Sự cố (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Bên trái: Chuyến chưa gắn lịch */}
                    <UnassignedTripsPanel
                        orders={unassignedTrips}
                        onAssign={openAssign}
                        query={queueQuery}
                        onQuery={setQueueQuery}
                        loading={dataLoading}
                    />

                    {/* Bên phải: Sự cố chuyến đi */}
                    <IncidentsPanel
                        incidents={incidents}
                        onViewDetail={setSelectedIncident}
                        loading={dataLoading}
                    />
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

            {/* Modal chi tiết sự cố */}
            <IncidentDetailModal
                open={!!selectedIncident}
                onClose={() => setSelectedIncident(null)}
                incident={selectedIncident}
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
