import React from "react";
import {
    Calendar,
    MapPin,
    User,
    Phone,
    Building2,
    Clock,
    Sparkles,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getBranchByUserId, listBranches } from "../../api/branches";
import { getPendingTrips } from "../../api/dispatch";
import AssignDriverDialog from "./AssignDriverDialog";

/**
 * PendingTripsPage - Danh sách đơn chưa được gán chuyến
 * 
 * Phân quyền:
 * - ADMIN: Xem tất cả chi nhánh (có dropdown chọn chi nhánh)
 * - MANAGER: Chỉ xem chi nhánh mình quản lý
 * - COORDINATOR: Chỉ xem chi nhánh mình thuộc về
 */
export default function PendingTripsPage() {
    console.log("=== PendingTripsPage MOUNTED ===");

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [pendingTrips, setPendingTrips] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [selectedBranchId, setSelectedBranchId] = React.useState(null);
    const [userBranchId, setUserBranchId] = React.useState(null);

    // Assign dialog
    const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
    const [selectedTrip, setSelectedTrip] = React.useState(null);

    const role = getCurrentRole();
    const userId = getStoredUserId();

    console.log("User info:", { role, userId });

    const isAdmin = role === ROLES.ADMIN;
    const isManager = role === ROLES.MANAGER;
    const isCoordinator = role === ROLES.COORDINATOR;

    console.log("Permissions:", { isAdmin, isManager, isCoordinator });

    // Load user's branch
    React.useEffect(() => {
        if (isAdmin) return; // Admin không cần load branch

        async function loadUserBranch() {
            try {
                console.log("Loading branch for user:", userId);
                const branch = await getBranchByUserId(userId);
                console.log("User branch response:", branch);

                const branchId = branch?.id || branch?.branchId;
                if (!branchId) {
                    setError("Không tìm thấy chi nhánh của bạn. Vui lòng liên hệ admin.");
                    return;
                }

                setUserBranchId(branchId);
                setSelectedBranchId(branchId);
            } catch (err) {
                console.error("Failed to load user branch:", err);
                setError(`Không thể xác định chi nhánh: ${err.message || 'Lỗi không xác định'}`);
            }
        }

        if (userId) {
            loadUserBranch();
        }
    }, [userId, isAdmin]);

    // Load branches for admin
    React.useEffect(() => {
        if (!isAdmin) return;

        async function loadBranches() {
            try {
                console.log("Loading branches for admin");
                const data = await listBranches({ size: 100 });
                console.log("Branches response:", data);

                const branchList = data?.content || data || [];
                setBranches(branchList);

                // Auto-select first branch
                if (branchList.length > 0 && !selectedBranchId) {
                    const firstBranchId = branchList[0].id || branchList[0].branchId;
                    setSelectedBranchId(firstBranchId);
                }
            } catch (err) {
                console.error("Failed to load branches:", err);
                setError(`Không thể tải danh sách chi nhánh: ${err.message || 'Lỗi không xác định'}`);
            }
        }

        loadBranches();
    }, [isAdmin]);

    // Load pending trips
    React.useEffect(() => {
        if (!selectedBranchId) return;

        async function loadPendingTrips() {
            setLoading(true);
            setError("");
            try {
                console.log("Loading pending trips for branch:", selectedBranchId);
                const data = await getPendingTrips(selectedBranchId);
                console.log("Pending trips response:", data);

                // Handle different response structures
                const trips = data?.pendingTrips || data?.data || data || [];
                setPendingTrips(Array.isArray(trips) ? trips : []);
            } catch (err) {
                console.error("Failed to load pending trips:", err);
                setError(`Không thể tải danh sách đơn chưa gán: ${err.message || 'Lỗi không xác định'}`);
                setPendingTrips([]);
            } finally {
                setLoading(false);
            }
        }

        loadPendingTrips();
    }, [selectedBranchId]);

    const handleRefresh = () => {
        if (selectedBranchId) {
            setSelectedBranchId(selectedBranchId); // Trigger reload
        }
    };

    const handleAssignClick = (trip) => {
        // Với các booking có nhiều xe (nhiều trip), PendingTrips API sẽ trả về nhiều dòng cùng bookingId.
        // Khi bấm "Gán chuyến" trên một dòng, ta gom tất cả trip chưa gán của booking đó
        // để có thể gán cùng tài xế/xe cho toàn bộ (giống OrderDetailPage).
        const sameBookingTrips = pendingTrips.filter(
            (t) => t.bookingId === trip.bookingId
        );
        const tripIds = sameBookingTrips
            .map((t) => t.tripId)
            .filter((id) => id != null);

        setSelectedTrip({
            ...trip,
            tripIds,
            vehicleCount: tripIds.length || 1,
        });
        setAssignDialogOpen(true);
    };

    const handleAssigned = (result) => {
        console.log("Assigned:", result);
        // Reload pending trips
        handleRefresh();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">
                                Đơn chưa gán chuyến (Pending)
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Danh sách các chuyến đang chờ gán tài xế và xe
                            </p>
                        </div>

                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </button>
                    </div>

                    {/* Branch selector for Admin */}
                    {isAdmin && branches.length > 0 && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Chọn chi nhánh
                            </label>
                            <select
                                value={selectedBranchId || ""}
                                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                                className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="">-- Chọn chi nhánh --</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.branchName || branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Branch info for Manager/Coordinator */}
                    {!isAdmin && userBranchId && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="h-4 w-4" />
                            <span>
                                Chi nhánh của bạn: <strong>ID {userBranchId}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">{error}</div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        <span className="ml-3 text-slate-600">Đang tải...</span>
                    </div>
                ) : pendingTrips.length === 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                            <Calendar className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                            Không có đơn chưa gán
                        </h3>
                        <p className="text-sm text-slate-500">
                            Tất cả các chuyến đã được gán tài xế và xe
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {pendingTrips.map((trip) => (
                            <TripCard
                                key={trip.tripId}
                                trip={trip}
                                onAssignClick={handleAssignClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Dialog */}
            {selectedTrip && (
                <AssignDriverDialog
                    open={assignDialogOpen}
                    order={{
                        tripId: selectedTrip.tripId,
                        tripIds: selectedTrip.tripIds && selectedTrip.tripIds.length > 0 ? selectedTrip.tripIds : undefined,
                        bookingId: selectedTrip.bookingId,
                        pickup_time: selectedTrip.startTime,
                        branch_name: selectedTrip.branchName,
                        vehicle_count: selectedTrip.vehicleCount || (selectedTrip.tripIds ? selectedTrip.tripIds.length : 1),
                        route: `${selectedTrip.startLocation || '?'} → ${selectedTrip.endLocation || '?'}`,
                    }}
                    onClose={() => setAssignDialogOpen(false)}
                    onAssigned={handleAssigned}
                />
            )}
        </div>
    );
}

function TripCard({ trip, onAssignClick }) {
    const formatDateTime = (isoString) => {
        if (!isoString) return "—";
        const date = new Date(isoString);
        return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">
                                Trip #{trip.tripId}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">
                                Booking #{trip.bookingId}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">
                                {trip.branchName}
                            </span>
                        </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-info-100 text-info-800">
                        {trip.bookingStatus || "PENDING"}
                    </span>
                </div>

                {/* Customer info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700">{trip.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700">{trip.customerPhone}</span>
                    </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-2 mb-3 text-sm">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                        <div className="text-slate-700">
                            <strong>Bắt đầu:</strong> {formatDateTime(trip.startTime)}
                        </div>
                        {trip.endTime && (
                            <div className="text-slate-500 text-xs mt-0.5">
                                Kết thúc: {formatDateTime(trip.endTime)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Route */}
                <div className="flex items-start gap-2 mb-4 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-slate-700">
                            <strong>Từ:</strong> {trip.startLocation || "—"}
                        </div>
                        <div className="text-slate-700 mt-1">
                            <strong>Đến:</strong> {trip.endLocation || "—"}
                        </div>
                    </div>
                </div>

                {/* Action button */}
                <button
                    onClick={() => onAssignClick(trip)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Sparkles className="h-4 w-4" />
                    Gán tài xế & xe
                </button>
            </div>
        </div>
    );
}
