import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CarFront, Search, Eye, AlertCircle, RefreshCw, Loader2, Calendar, CheckCircle2, X, Filter } from "lucide-react";
import { listVehiclesByBranch, getVehicleTrips, listVehicleCategories } from "../../api/vehicles";
import { getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import Pagination from "../common/Pagination";

export default function CoordinatorVehicleListPage() {
    const navigate = useNavigate();
    const role = useMemo(() => getCurrentRole(), []);
    const userId = useMemo(() => getStoredUserId(), []);
    const isBranchScoped = role === ROLES.MANAGER || role === ROLES.COORDINATOR || role === ROLES.CONSULTANT;

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // Filter theo danh mục xe
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState([]);

    // Time filter để kiểm tra xe rảnh
    const [timeFilterStart, setTimeFilterStart] = useState("");
    const [timeFilterEnd, setTimeFilterEnd] = useState("");
    const [vehicleAvailability, setVehicleAvailability] = useState({}); // { vehicleId: { available, reason } }

    // Branch state
    const [branchId, setBranchId] = useState(null);
    const [branchName, setBranchName] = useState("");
    const [branchLoading, setBranchLoading] = useState(true);
    const [branchError, setBranchError] = useState("");

    // Load branch for scoped users
    useEffect(() => {
        if (!isBranchScoped) {
            setBranchLoading(false);
            return;
        }
        if (!userId) {
            setBranchError("Không xác định được user ID");
            setBranchLoading(false);
            return;
        }

        let cancelled = false;
        async function loadBranch() {
            setBranchLoading(true);
            setBranchError("");
            try {
                const resp = await getBranchByUserId(Number(userId));
                if (cancelled) return;
                const id = resp?.branchId ?? resp?.id ?? null;
                const name = resp?.branchName ?? resp?.name ?? "";
                if (id) {
                    setBranchId(id);
                    setBranchName(name);
                } else {
                    setBranchError("Không tìm thấy chi nhánh phụ trách");
                }
            } catch (err) {
                if (cancelled) return;
                setBranchError(err?.message || "Không tải được thông tin chi nhánh");
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        }
        loadBranch();
        return () => { cancelled = true; };
    }, [isBranchScoped, userId]);

    // Load danh mục xe để hiển thị filter loại xe
    useEffect(() => {
        let cancelled = false;
        async function loadCategories() {
            try {
                const resp = await listVehicleCategories();
                if (cancelled) return;
                const list = Array.isArray(resp)
                    ? resp
                    : resp?.data || resp?.items || resp?.content || [];
                const mapped = list.map((c) => ({
                    id: c.id,
                    name: c.categoryName || c.name || "",
                    seats: c.seats,
                }));
                setCategories(mapped);
            } catch (err) {
                console.warn("[CoordinatorVehicleListPage] Failed to load categories:", err);
                if (!cancelled) setCategories([]);
            }
        }
        loadCategories();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (branchLoading) return;
        if (isBranchScoped && !branchId) return;
        fetchVehicles();
    }, [currentPage, searchQuery, categoryFilter, branchId, branchLoading]);

    // Kiểm tra xe rảnh theo khoảng thời gian khi đã chọn filter
    useEffect(() => {
        if (!timeFilterStart || !timeFilterEnd || !vehicles.length) {
            setVehicleAvailability({});
            return;
        }

        const checkAvailability = async () => {
            const startTime = new Date(timeFilterStart + "T00:00:00");
            const endTime = new Date(timeFilterEnd + "T23:59:59");
            const map = {};

            for (const v of vehicles) {
                try {
                    const tripsResponse = await getVehicleTrips(v.id);
                    const trips = tripsResponse?.trips || tripsResponse || [];
                    const hasConflict = trips.some((trip) => {
                        if (!trip.startTime || trip.status === "COMPLETED" || trip.status === "CANCELLED") {
                            return false;
                        }
                        const tripStart = new Date(trip.startTime);
                        const tripEnd = trip.endTime
                            ? new Date(trip.endTime)
                            : new Date(tripStart.getTime() + 8 * 60 * 60 * 1000);
                        return tripStart <= endTime && tripEnd >= startTime;
                    });
                    map[v.id] = {
                        available: !hasConflict,
                        reason: hasConflict ? "Có chuyến trong khoảng thời gian này" : "Rảnh",
                    };
                } catch (err) {
                    console.error(`Error checking availability for vehicle ${v.id}:`, err);
                    map[v.id] = {
                        available: false,
                        reason: "Lỗi kiểm tra",
                    };
                }
            }

            setVehicleAvailability(map);
        };

        checkAvailability();
    }, [timeFilterStart, timeFilterEnd, vehicles]);

    const fetchVehicles = async () => {
        if (!branchId) {
            console.error("[CoordinatorVehicleListPage] No branchId");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("[CoordinatorVehicleListPage] Fetching vehicles for branch:", branchId);
            const response = await listVehiclesByBranch(branchId);
            console.log("[CoordinatorVehicleListPage] Response:", response);
            let vehiclesList = Array.isArray(response) ? response : [];

            // Client-side search filter (chỉ tìm theo biển số & hãng xe)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                vehiclesList = vehiclesList.filter((v) =>
                    (v.licensePlate || "").toLowerCase().includes(query)
                    || (v.brand || "").toLowerCase().includes(query)
                );
            }

            // Filter theo danh mục xe (categoryId)
            if (categoryFilter) {
                vehiclesList = vehiclesList.filter((v) => {
                    const vCategoryId =
                        v.categoryId ??
                        v.category_id ??
                        v.vehicleCategoryId ??
                        v.vehicleCategory?.id;
                    return String(vCategoryId) === String(categoryFilter);
                });
            }

            // Client-side pagination
            const total = Math.ceil(vehiclesList.length / pageSize);
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const paged = vehiclesList.slice(start, end);

            setVehicles(paged);
            setTotalPages(total || 1);
            setTotalItems(vehiclesList.length);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (vehicleId) => {
        // Đi đến VehicleDetailPage để xem đầy đủ thông tin + chi phí
        navigate(`/vehicles/${vehicleId}`);
    };

    const getInspectionStatus = (expiryDate) => {
        if (!expiryDate) return { text: "Chưa cập nhật", color: "text-gray-500" };
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return { text: "Đã hết hạn", color: "text-red-600" };
        if (daysUntilExpiry <= 30) return { text: `Còn ${daysUntilExpiry} ngày`, color: "text-orange-600" };
        return { text: `Còn ${daysUntilExpiry} ngày`, color: "text-green-600" };
    };

    const getInsuranceStatus = (expiryDate) => {
        if (!expiryDate) return { text: "Chưa cập nhật", color: "text-gray-500" };
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return { text: "Đã hết hạn", color: "text-red-600" };
        if (daysUntilExpiry <= 30) return { text: `Còn ${daysUntilExpiry} ngày`, color: "text-orange-600" };
        return { text: `Còn ${daysUntilExpiry} ngày`, color: "text-green-600" };
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center shadow-lg">
                            <CarFront className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Danh sách xe</h1>
                            <p className="text-sm text-slate-600">Quản lý hồ sơ xe chi nhánh</p>
                        </div>
                    </div>
                </div>

                {/* Branch Error */}
                {branchError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span className="text-sm text-rose-700">{branchError}</span>
                    </div>
                )}

                {/* Search + Category filter + Branch Info + Time filter */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search theo biển số / hãng xe */}
                            <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                                <Search className="h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Tìm kiếm xe theo biển số, hãng xe..."
                                    className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Filter theo danh mục xe */}
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-[200px]">
                                <Filter className="h-4 w-4 text-slate-400" />
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="flex-1 bg-transparent outline-none text-slate-700"
                                >
                                    <option value="">Tất cả loại xe</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                            {c.seats ? ` (${c.seats} chỗ)` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={() => fetchVehicles()}
                                disabled={loading || branchLoading}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Refresh
                            </button>

                            {/* Branch info */}
                            {isBranchScoped && branchName && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 text-sm">
                                    <span className="font-medium">Chi nhánh:</span>
                                    <span>{branchName}</span>
                                </div>
                            )}
                        </div>

                        {/* Time filter để kiểm tra xe rảnh */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-200">
                            <span className="text-sm text-slate-600 font-medium">Kiểm tra xe rảnh:</span>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        className="bg-transparent outline-none"
                                        value={timeFilterStart}
                                        onChange={(e) => setTimeFilterStart(e.target.value)}
                                    />
                                </div>
                                <span className="text-slate-400 text-sm">→</span>
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        className="bg-transparent outline-none"
                                        value={timeFilterEnd}
                                        onChange={(e) => setTimeFilterEnd(e.target.value)}
                                    />
                                </div>
                                {(timeFilterStart || timeFilterEnd) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTimeFilterStart("");
                                            setTimeFilterEnd("");
                                        }}
                                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="h-3 w-3" /> Xoá lọc
                                    </button>
                                )}
                            </div>
                            {timeFilterStart && timeFilterEnd && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span>Đang hiển thị trạng thái bận/rảnh theo khoảng thời gian đã chọn.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0079BC]"></div>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <CarFront className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Không tìm thấy xe nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Biển số
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Loại xe
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Số ghế
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Hãng xe
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Hạn đăng kiểm
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Hạn bảo hiểm
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                {vehicles.map((vehicle) => {
                                    const inspectionStatus = getInspectionStatus(vehicle.inspectionExpiry || vehicle.inspectionExpiryDate);
                                    const insuranceStatus = getInsuranceStatus(vehicle.insuranceExpiry || vehicle.insuranceExpiryDate);
                                    return (
                                        <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center text-white">
                                                        <CarFront className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{vehicle.licensePlate}</div>
                                                        <div className="text-xs text-slate-500">ID: {vehicle.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {vehicle.categoryName || vehicle.vehicleCategory?.name || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {vehicle.capacity != null ? vehicle.capacity : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {vehicle.brand || vehicle.model || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                    <span className={`text-sm font-medium ${inspectionStatus.color}`}>
                                                        {inspectionStatus.text}
                                                    </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                    <span className={`text-sm font-medium ${insuranceStatus.color}`}>
                                                        {insuranceStatus.text}
                                                    </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {/* Badge trên: Trạng thái hiện tại của xe (Sẵn sàng/Đang sử dụng/Bảo trì) */}
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === "AVAILABLE"
                                                            ? "bg-green-50 text-green-700"
                                                            : vehicle.status === "INUSE"
                                                                ? "bg-blue-50 text-blue-700"
                                                                : vehicle.status === "MAINTENANCE"
                                                                    ? "bg-orange-50 text-orange-700"
                                                                    : "bg-gray-50 text-gray-700"
                                                        }`}
                                                    >
                                                        {vehicle.status === "AVAILABLE"
                                                            ? "Sẵn sàng"
                                                            : vehicle.status === "INUSE"
                                                                ? "Đang sử dụng"
                                                                : vehicle.status === "MAINTENANCE"
                                                                    ? "Bảo trì"
                                                                    : "Không hoạt động"}
                                                    </span>
                                                    {/* Badge dưới: Rảnh/Bận theo khoảng thời gian đã chọn trong filter
                                                            Chỉ hiển thị khi xe ở trạng thái "Sẵn sàng" và đã chọn filter ngày */}
                                                    {vehicle.status === "AVAILABLE" && timeFilterStart && timeFilterEnd && vehicleAvailability[vehicle.id] && (
                                                        <span
                                                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${vehicleAvailability[vehicle.id].available
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-amber-50 text-amber-700"
                                                            }`}
                                                        >
                                                                {vehicleAvailability[vehicle.id].available ? "Rảnh" : "Bận"}
                                                            </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        onClick={() => handleViewDetail(vehicle.id)}
                                                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Note giải thích về trạng thái */}
                {timeFilterStart && timeFilterEnd && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900 mb-2">Giải thích về trạng thái:</div>
                                <ul className="space-y-1.5 text-slate-600">
                                    <li>
                                        <span className="font-medium text-slate-800">• Trạng thái trên:</span> Trạng thái hiện tại của xe trong hệ thống (Sẵn sàng/Đang sử dụng/Bảo trì)
                                    </li>
                                    <li>
                                        <span className="font-medium text-slate-800">• Trạng thái dưới (Rảnh/Bận):</span> Chỉ hiển thị khi xe ở trạng thái "Sẵn sàng" và cho biết xe có rảnh trong khoảng thời gian đã chọn hay không
                                    </li>
                                    <li className="text-xs text-slate-500 mt-2">
                                        💡 Lưu ý: Xe đang "Đang sử dụng" hoặc "Bảo trì" sẽ không hiển thị badge "Rảnh/Bận" vì đã rõ là không thể sử dụng
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            itemsPerPage={pageSize}
                            totalItems={totalItems}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}