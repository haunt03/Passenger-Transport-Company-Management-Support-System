// CoordinatorDriverTripsPage.jsx - Trang danh sách chuyến của tài xế cho Coordinator
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    CarFront,
    User,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Filter,
    X,
} from "lucide-react";
import { getDriverSchedule, getDriverProfile } from "../../api/drivers";

/* ===========================================
   Helper Functions
=========================================== */
const cls = (...a) => a.filter(Boolean).join(" ");

// Format date: "2025-10-26" -> "26/10/2025"
const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
};

// Format datetime: "2025-10-26T10:30:00Z" -> "10:30 26/10"
const fmtDateTimeShort = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${hh}:${mm} ${dd}/${MM}`;
};

// Format datetime full: "2025-10-26T10:30:00Z" -> "10:30 - 26/10/2025"
const fmtDateTimeFull = (isoLike) => {
    if (!isoLike) return "—";
    const safe = String(isoLike).replace(" ", "T");
    const d = new Date(safe);
    if (isNaN(d.getTime())) return isoLike;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${hh}:${mm} - ${dd}/${MM}/${yyyy}`;
};

/* ===========================================
   Status Badge Component
=========================================== */
const STATUS_LABEL = {
    SCHEDULED: "Đã lên lịch",
    ONGOING: "Đang thực hiện",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    PENDING: "Chờ xử lý",
};

function TripStatusBadge({ status }) {
    let classes = "";
    let IconEl = null;

    if (status === "COMPLETED") {
        classes = "bg-green-50 text-green-700 border-green-200";
        IconEl = <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    } else if (status === "ONGOING") {
        classes = "bg-sky-50 text-sky-700 border-sky-200";
        IconEl = <CarFront className="h-3.5 w-3.5 text-sky-600" />;
    } else if (status === "SCHEDULED" || status === "PENDING") {
        classes = "bg-info-50 text-info-700 border-info-200";
        IconEl = <Clock className="h-3.5 w-3.5 text-primary-600" />;
    } else if (status === "CANCELLED") {
        classes = "bg-gray-50 text-gray-700 border-gray-200";
        IconEl = <X className="h-3.5 w-3.5 text-gray-600" />;
    } else {
        classes = "bg-slate-100 text-slate-600 border-slate-300";
        IconEl = <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />;
    }

    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 rounded-md border px-2 py-[2px] text-[11px] font-medium leading-none",
                classes
            )}
        >
            {IconEl}
            <span>{STATUS_LABEL[status] || status}</span>
        </span>
    );
}

/* ===========================================
   MAIN PAGE COMPONENT
=========================================== */
export default function CoordinatorDriverTripsPage() {
    const { driverId } = useParams();
    const navigate = useNavigate();

    const [driver, setDriver] = React.useState(null);
    const [trips, setTrips] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    // Filter states
    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("ALL");

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 10;

    // Load driver profile and trips
    React.useEffect(() => {
        loadData();
    }, [driverId, startDate, endDate]);

    const loadData = async () => {
        if (!driverId) return;

        setLoading(true);
        setError("");

        try {
            // Load driver profile
            const driverResp = await getDriverProfile(driverId);
            setDriver(driverResp);

            // Load trips with date filter
            let start = null;
            let end = null;

            if (startDate) {
                start = new Date(startDate + "T00:00:00").toISOString();
            }
            if (endDate) {
                end = new Date(endDate + "T23:59:59").toISOString();
            }

            const tripsResp = await getDriverSchedule(driverId, start, end);
            const tripsList = Array.isArray(tripsResp?.data) ? tripsResp.data : (Array.isArray(tripsResp) ? tripsResp : []);

            // Sort by startTime descending (newest first)
            const sortedTrips = tripsList.sort((a, b) => {
                const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
                const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
                return dateB - dateA;
            });

            setTrips(sortedTrips);
        } catch (err) {
            console.error("Error loading driver trips:", err);
            setError(err?.message || "Không tải được danh sách chuyến");
        } finally {
            setLoading(false);
        }
    };

    // Filter trips by status
    const filteredTrips = React.useMemo(() => {
        if (statusFilter === "ALL") return trips;
        return trips.filter((t) => t.status === statusFilter);
    }, [trips, statusFilter]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
    const start = (currentPage - 1) * pageSize;
    const paginatedTrips = filteredTrips.slice(start, start + pageSize);

    // Reset page when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, startDate, endDate]);

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setStatusFilter("ALL");
    };

    const hasActiveFilters = startDate || endDate || statusFilter !== "ALL";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </button>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {driver?.fullName?.charAt(0) || "?"}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Danh sách chuyến - {driver?.fullName || "Tài xế"}
                                </h1>
                                <p className="text-sm text-slate-600">
                                    ID: {driver?.driverId || driverId} · {driver?.branchName || ""}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span className="text-sm text-rose-700">{error}</span>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <span>Lọc chuyến</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Date Start */}
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        setStartDate(newStart);
                                        if (endDate && newStart && endDate < newStart) {
                                            setEndDate("");
                                        }
                                    }}
                                    max={endDate || undefined}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 cursor-pointer"
                                    placeholder="Từ ngày"
                                />
                            </div>

                            {/* Date End */}
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        const newEnd = e.target.value;
                                        if (startDate && newEnd && newEnd < startDate) {
                                            return;
                                        }
                                        setEndDate(newEnd);
                                    }}
                                    min={startDate || undefined}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 cursor-pointer"
                                    placeholder="Đến ngày"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm text-slate-700 cursor-pointer"
                                >
                                    <option value="ALL">Tất cả trạng thái</option>
                                    <option value="SCHEDULED">Đã lên lịch</option>
                                    <option value="ONGOING">Đang thực hiện</option>
                                    <option value="COMPLETED">Hoàn thành</option>
                                    <option value="CANCELLED">Đã hủy</option>
                                </select>
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <div className="flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1">Tổng chuyến</div>
                        <div className="text-2xl font-bold text-slate-900">{trips.length}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1">Hoàn thành</div>
                        <div className="text-2xl font-bold text-green-600">
                            {trips.filter((t) => t.status === "COMPLETED").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1">Đang thực hiện</div>
                        <div className="text-2xl font-bold text-sky-600">
                            {trips.filter((t) => t.status === "ONGOING").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1">Đã lên lịch</div>
                        <div className="text-2xl font-bold text-primary-600">
                            {trips.filter((t) => t.status === "SCHEDULED" || t.status === "PENDING").length}
                        </div>
                    </div>
                </div>

                {/* Trips Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                        </div>
                    ) : paginatedTrips.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <CarFront className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm">Không tìm thấy chuyến nào</p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-2 text-sm text-sky-600 hover:text-sky-700 underline"
                                >
                                    Xóa bộ lọc để xem tất cả
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[13px]">
                                    <thead className="text-[11px] uppercase tracking-wide bg-slate-100/60 border-b border-slate-200 text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Mã chuyến</th>
                                            <th className="px-4 py-3 font-medium">Khách hàng</th>
                                            <th className="px-4 py-3 font-medium">Địa điểm đón</th>
                                            <th className="px-4 py-3 font-medium">Địa điểm đến</th>
                                            <th className="px-4 py-3 font-medium">Thời gian đón</th>
                                            <th className="px-4 py-3 font-medium">Thời gian đến</th>
                                            <th className="px-4 py-3 font-medium text-right">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {paginatedTrips.map((trip) => (
                                            <tr key={trip.tripId || trip.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                                    {trip.tripCode || trip.code || `#${trip.tripId || trip.id}`}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    <div className="font-medium">{trip.customerName || trip.customer_name || "—"}</div>
                                                    {trip.customerPhone && (
                                                        <div className="text-[11px] text-slate-500">{trip.customerPhone || trip.customer_phone}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    <div className="flex items-start gap-1 text-[12px] leading-relaxed max-w-[200px]">
                                                        <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0 mt-0.5" />
                                                        <span className="truncate">{trip.pickupLocation || trip.pickup_location || trip.pickup || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    <div className="flex items-start gap-1 text-[12px] leading-relaxed max-w-[200px]">
                                                        <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                                        <span className="truncate">{trip.dropoffLocation || trip.dropoff_location || trip.dropoff || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                    <div className="flex items-start gap-1 text-[12px] leading-relaxed">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{fmtDateTimeShort(trip.startTime || trip.start_time || trip.pickupTime || trip.pickup_time)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                    <div className="flex items-start gap-1 text-[12px] leading-relaxed">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span>{fmtDateTimeShort(trip.endTime || trip.end_time || trip.dropoffTime || trip.dropoff_time)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <TripStatusBadge status={trip.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-slate-700">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                                        >
                                            <ChevronLeft className="h-4 w-4 text-slate-500" />
                                        </button>

                                        <div className="text-slate-700">
                                            Trang{" "}
                                            <span className="font-medium">{currentPage}</span>/
                                            <span className="font-medium">{totalPages}</span>
                                        </div>

                                        <button
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                                        >
                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                        </button>
                                    </div>

                                    <div className="text-[11px] text-slate-500">
                                        Hiển thị {start + 1}-{Math.min(start + pageSize, filteredTrips.length)} trong tổng {filteredTrips.length} chuyến
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}













