import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Clock,
    MapPin,
    Star,
    Calendar,
    ChevronRight,
    Filter,
    Search,
    CheckCircle2,
    PlayCircle,
    Navigation,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import { getDriverProfileByUser, getDriverSchedule } from "../../api/drivers";
import Pagination from "../common/Pagination";

const cls = (...a) => a.filter(Boolean).join(" ");

const fmtDateTime = (iso) => {
    if (!iso) return "--:--";
    try {
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const MM = String(d.getMonth() + 1).padStart(2, "0");
        return `${hh}:${mm} ${dd}/${MM}`;
    } catch {
        return "--:--";
    }
};

function TripCard({ trip, onClick }) {
    const rating = trip.rating || 0;
    const isOngoing = trip.status === "ONGOING";
    const statusMap = {
        SCHEDULED: { 
            label: "Chưa bắt đầu", 
            bgColor: "bg-slate-50",
            borderColor: "border-slate-200",
            statusBadge: "bg-slate-100 text-slate-700 border-slate-200",
            accentColor: "text-slate-600",
            icon: <Calendar className="h-3.5 w-3.5" />
        },
        ONGOING: { 
            label: "Đang chạy", 
            bgColor: "bg-gradient-to-br from-sky-50 to-blue-50",
            borderColor: "border-sky-300",
            statusBadge: "bg-sky-600 text-white border-sky-700 shadow-sm",
            accentColor: "text-sky-700",
            icon: <PlayCircle className="h-3.5 w-3.5" />
        },
        COMPLETED: { 
            label: "Hoàn thành", 
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
            statusBadge: "bg-emerald-100 text-emerald-700 border-emerald-200",
            accentColor: "text-emerald-600",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />
        },
    };
    const status = statusMap[trip.status] || statusMap.SCHEDULED;

    // Format location to be shorter
    const formatLocation = (location) => {
        if (!location || location === "—") return "—";
        const parts = location.split(",");
        if (parts.length > 2) {
            return parts[0].trim();
        }
        return location.length > 40 ? location.substring(0, 40) + "..." : location;
    };

    return (
        <div
            onClick={onClick}
            className={cls(
                "group relative rounded-2xl border-2 p-5 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer",
                "hover:scale-[1.02] hover:-translate-y-1",
                status.bgColor,
                status.borderColor,
                isOngoing && "ring-2 ring-sky-200 ring-offset-2"
            )}
        >
            {/* Priority indicator for ongoing trips */}
            {isOngoing && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <Navigation className="h-3.5 w-3.5 text-white" />
                </div>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className={cls(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border",
                    status.statusBadge
                )}>
                    {status.icon}
                    {status.label}
                </span>
                {trip.status === "COMPLETED" && rating > 0 && (
                    <div className="flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg">
                        <Star className="h-4 w-4 text-info-500 fill-amber-500" />
                        <span className="text-sm font-bold text-slate-900">{rating.toFixed(1)}</span>
                    </div>
                )}
            </div>

            {/* Route */}
            <div className="mb-4 space-y-2">
                <div className="flex items-start gap-2">
                    <div className="mt-1.5">
                        <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Điểm đi</div>
                        <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {formatLocation(trip.startLocation)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pl-6">
                    <div className="h-4 w-0.5 bg-slate-300"></div>
                </div>
                <div className="flex items-start gap-2">
                    <div className="mt-1.5">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Điểm đến</div>
                        <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {formatLocation(trip.endLocation)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200/50">
                <div className="flex items-center gap-2">
                    <div className={cls("p-1.5 rounded-lg", isOngoing ? "bg-sky-100" : "bg-slate-100")}>
                        <Clock className={cls("h-3.5 w-3.5", isOngoing ? "text-sky-700" : "text-slate-600")} />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 mb-0.5">Bắt đầu</div>
                        <div className={cls("text-xs font-semibold", status.accentColor)}>
                            {fmtDateTime(trip.startTime)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cls("p-1.5 rounded-lg", isOngoing ? "bg-sky-100" : "bg-slate-100")}>
                        <Clock className={cls("h-3.5 w-3.5", isOngoing ? "text-sky-700" : "text-slate-600")} />
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 mb-0.5">Kết thúc</div>
                        <div className={cls("text-xs font-semibold", status.accentColor)}>
                            {fmtDateTime(trip.endTime)}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Details Arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-1.5 rounded-lg bg-white/80 shadow-sm">
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                </div>
            </div>
        </div>
    );
}

export default function DriverTripsListPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);
    const [trips, setTrips] = React.useState([]);
    const [error, setError] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("ALL");
    const [timeFilter, setTimeFilter] = React.useState("ALL"); // ALL, THIS_WEEK, NEXT_WEEK, THIS_MONTH, LAST_MONTH
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 9; // 3x3 grid

    React.useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const uid = getCookie("userId");
                if (!uid) throw new Error("Không xác định được tài khoản tài xế.");

                const profile = await getDriverProfileByUser(uid);
                if (!mounted) return;

                const list = await getDriverSchedule(profile.driverId);
                if (!mounted) return;

                const mapped = Array.isArray(list)
                    ? list.map((trip) => ({
                        tripId: trip.tripId || trip.trip_id,
                        startLocation: trip.startLocation || trip.start_location || "—",
                        endLocation: trip.endLocation || trip.end_location || "—",
                        startTime: trip.startTime || trip.start_time,
                        endTime: trip.endTime || trip.end_time || null,
                        status: trip.status || "SCHEDULED",
                        rating: trip.rating ? Number(trip.rating) : 0,
                        ratingComment: trip.ratingComment || trip.rating_comment || "",
                    }))
                    : [];

                setTrips(mapped);
            } catch (err) {
                if (!mounted) return;
                setError(
                    err?.data?.message ||
                    err?.message ||
                    "Không tải được danh sách chuyến."
                );
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredTrips = React.useMemo(() => {
        let result = trips;

        // Filter by status
        if (statusFilter !== "ALL") {
            result = result.filter((t) => t.status === statusFilter);
        }

        // Filter by time period
        if (timeFilter !== "ALL") {
            const now = new Date();
            result = result.filter((t) => {
                const tripDate = new Date(t.startTime);
                
                switch (timeFilter) {
                    case "THIS_WEEK":
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        startOfWeek.setHours(0, 0, 0, 0);
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        endOfWeek.setHours(23, 59, 59, 999);
                        return tripDate >= startOfWeek && tripDate <= endOfWeek;
                        
                    case "THIS_MONTH":
                        return tripDate.getMonth() === now.getMonth() && 
                               tripDate.getFullYear() === now.getFullYear();
                               
                    case "NEXT_WEEK":
                        const startOfNextWeek = new Date(now);
                        startOfNextWeek.setDate(now.getDate() + (7 - now.getDay()));
                        startOfNextWeek.setHours(0, 0, 0, 0);
                        const endOfNextWeek = new Date(startOfNextWeek);
                        endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
                        endOfNextWeek.setHours(23, 59, 59, 999);
                        return tripDate >= startOfNextWeek && tripDate <= endOfNextWeek;
                               
                    case "LAST_MONTH":
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                        return tripDate >= lastMonth && tripDate <= lastMonthEnd;
                        
                    default:
                        return true;
                }
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.startLocation.toLowerCase().includes(q) ||
                    t.endLocation.toLowerCase().includes(q)
            );
        }

        // Sort: ONGOING first, then by time (newest first)
        return result.sort((a, b) => {
            // Priority: ONGOING > SCHEDULED > COMPLETED
            const statusPriority = {
                ONGOING: 3,
                SCHEDULED: 2,
                COMPLETED: 1,
            };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Higher priority first
            }
            
            // If same priority, sort by time (newest first)
            const aTime = new Date(a.startTime).getTime();
            const bTime = new Date(b.startTime).getTime();
            return bTime - aTime;
        });
    }, [trips, statusFilter, timeFilter, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredTrips.length / pageSize);
    const paginatedTrips = filteredTrips.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Count trips by status for stats
    const stats = React.useMemo(() => {
        const ongoing = filteredTrips.filter(t => t.status === "ONGOING").length;
        const scheduled = filteredTrips.filter(t => t.status === "SCHEDULED").length;
        const completed = filteredTrips.filter(t => t.status === "COMPLETED").length;
        return { ongoing, scheduled, completed, total: filteredTrips.length };
    }, [filteredTrips]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-slate-900 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0079BC] to-sky-600 shadow-lg">
                        <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Danh sách chuyến
                        </h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Quản lý và theo dõi tất cả các chuyến đi của bạn
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                {!loading && filteredTrips.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                        <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white shadow-lg">
                            <div className="text-xs font-medium opacity-90 mb-1">Đang chạy</div>
                            <div className="text-2xl font-bold">{stats.ongoing}</div>
                        </div>
                        <div className="rounded-xl bg-slate-100 border border-slate-200 p-4">
                            <div className="text-xs font-medium text-slate-600 mb-1">Chưa bắt đầu</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.scheduled}</div>
                        </div>
                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                            <div className="text-xs font-medium text-emerald-700 mb-1">Hoàn thành</div>
                            <div className="text-2xl font-bold text-emerald-900">{stats.completed}</div>
                        </div>
                        <div className="rounded-xl bg-white border-2 border-slate-300 p-4">
                            <div className="text-xs font-medium text-slate-600 mb-1">Tổng cộng</div>
                            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 rounded-xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-3 text-sm text-rose-700 shadow-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 text-[#0079BC] animate-spin mb-3" />
                    <div className="text-sm text-slate-600 font-medium">Đang tải danh sách chuyến...</div>
                </div>
            )}

            {!loading && (
                <>
                    {/* Enhanced Filters */}
                    <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#0079BC] focus-within:bg-white transition-colors">
                                <Search className="h-5 w-5 text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                    placeholder="Tìm theo điểm đi, điểm đến..."
                                />
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#0079BC] focus-within:bg-white transition-colors">
                                <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
                                <select
                                    value={timeFilter}
                                    onChange={(e) => setTimeFilter(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 cursor-pointer"
                                >
                                    <option value="ALL">Tất cả thời gian</option>
                                    <option value="THIS_WEEK">Tuần này</option>
                                    <option value="NEXT_WEEK">Tuần tới</option>
                                    <option value="THIS_MONTH">Tháng này</option>
                                    <option value="LAST_MONTH">Tháng trước</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[#0079BC] focus-within:bg-white transition-colors">
                                <Filter className="h-5 w-5 text-slate-400 shrink-0" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 cursor-pointer"
                                >
                                    <option value="ALL">Tất cả trạng thái</option>
                                    <option value="SCHEDULED">Chưa bắt đầu</option>
                                    <option value="ONGOING">Đang chạy</option>
                                    <option value="COMPLETED">Hoàn thành</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Trips List */}
                    {paginatedTrips.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center">
                            <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <div className="text-lg font-semibold text-slate-700 mb-2">
                                {filteredTrips.length === 0 ? "Không tìm thấy chuyến nào" : "Không có chuyến nào trong trang này"}
                            </div>
                            <div className="text-sm text-slate-500">
                                {filteredTrips.length === 0 
                                    ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                                    : "Chuyển sang trang khác để xem thêm chuyến"}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                            {paginatedTrips.map((trip) => (
                                <TripCard
                                    key={trip.tripId}
                                    trip={trip}
                                    onClick={() => navigate(`/driver/trips/${trip.tripId}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
