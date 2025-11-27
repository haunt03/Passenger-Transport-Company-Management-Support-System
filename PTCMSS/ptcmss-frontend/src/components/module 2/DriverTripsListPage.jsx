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
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import { getDriverProfileByUser, getDriverSchedule } from "../../api/drivers";

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
    const statusMap = {
        SCHEDULED: { label: "Chưa bắt đầu", color: "bg-slate-100 text-slate-700" },
        ONGOING: { label: "Đang chạy", color: "bg-sky-100 text-sky-700" },
        COMPLETED: { label: "Hoàn thành", color: "bg-amber-100 text-amber-700" },
    };
    const status = statusMap[trip.status] || statusMap.SCHEDULED;

    return (
        <div
            onClick={onClick}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#0079BC]/50 transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cls("px-2 py-1 rounded-md text-xs font-medium", status.color)}>
                            {status.label}
                        </span>
                        {trip.status === "COMPLETED" && rating > 0 && (
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                <span className="text-sm font-semibold text-slate-900">{rating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 leading-tight">
                        {trip.startLocation} → {trip.endLocation}
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Bắt đầu: {fmtDateTime(trip.startTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Kết thúc: {fmtDateTime(trip.endTime)}</span>
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
                        endTime: trip.endTime || trip.end_time,
                        status: trip.status || "SCHEDULED",
                        rating: trip.rating || 0,
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

        if (statusFilter !== "ALL") {
            result = result.filter((t) => t.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (t) =>
                    t.startLocation.toLowerCase().includes(q) ||
                    t.endLocation.toLowerCase().includes(q)
            );
        }

        return result.sort((a, b) => {
            const aTime = new Date(a.startTime).getTime();
            const bTime = new Date(b.startTime).getTime();
            return bTime - aTime;
        });
    }, [trips, statusFilter, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-[#0079BC]" />
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Danh sách chuyến
                    </h1>
                </div>
                <p className="text-sm text-slate-600">
                    Xem tất cả các chuyến đi của bạn (quá khứ và tương lai)
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {loading && (
                <div className="text-sm text-slate-500">Đang tải danh sách chuyến...</div>
            )}

            {!loading && (
                <>
                    {/* Filters */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                                placeholder="Tìm theo điểm đi/đến..."
                            />
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent outline-none text-sm text-slate-700"
                            >
                                <option value="ALL">Tất cả</option>
                                <option value="SCHEDULED">Chưa bắt đầu</option>
                                <option value="ONGOING">Đang chạy</option>
                                <option value="COMPLETED">Hoàn thành</option>
                            </select>
                        </div>
                    </div>

                    {/* Trips List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTrips.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                Không tìm thấy chuyến nào
                            </div>
                        ) : (
                            filteredTrips.map((trip) => (
                                <TripCard
                                    key={trip.tripId}
                                    trip={trip}
                                    onClick={() => navigate(`/driver/trips/${trip.tripId}`)}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
