import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Eye, Filter, X, Calendar, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { pageBookings } from "../../api/bookings";
import { getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import Pagination from "../common/Pagination";

export default function CoordinatorOrderListPage() {
    const navigate = useNavigate();
    const role = useMemo(() => getCurrentRole(), []);
    const userId = useMemo(() => getStoredUserId(), []);
    const isBranchScoped = role === ROLES.MANAGER || role === ROLES.COORDINATOR || role === ROLES.CONSULTANT;

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, ASSIGNED, UNASSIGNED
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    // Branch state
    const [branchId, setBranchId] = useState(null);
    const [branchName, setBranchName] = useState("");
    const [branchLoading, setBranchLoading] = useState(true);
    const [branchError, setBranchError] = useState("");

    // Time filter - Default to last 30 days instead of just today
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const defaultStartDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(defaultStartDate);
    const [endDate, setEndDate] = useState(today);

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
                console.log("[CoordinatorOrderListPage] Loading branch for userId:", userId);
                const resp = await getBranchByUserId(Number(userId));
                console.log("[CoordinatorOrderListPage] Branch response:", resp);
                if (cancelled) return;

                // Try multiple possible response formats
                const id = resp?.branchId ?? resp?.id ?? resp?.data?.branchId ?? resp?.data?.id ?? null;
                const name = resp?.branchName ?? resp?.name ?? resp?.data?.branchName ?? resp?.data?.name ?? "";

                console.log("[CoordinatorOrderListPage] Extracted branchId:", id, "branchName:", name);

                if (id) {
                    setBranchId(id);
                    setBranchName(name);
                } else {
                    console.error("[CoordinatorOrderListPage] Branch ID not found in response:", resp);
                    setBranchError("Không tìm thấy chi nhánh phụ trách");
                }
            } catch (err) {
                if (cancelled) return;
                console.error("[CoordinatorOrderListPage] Error loading branch:", err);
                setBranchError(err?.message || "Không tải được thông tin chi nhánh");
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        }
        loadBranch();
        return () => { cancelled = true; };
    }, [isBranchScoped, userId]);

    useEffect(() => {
        if (branchLoading) return;
        if (isBranchScoped && !branchId) return;
        fetchOrders();
    }, [currentPage, searchQuery, filterStatus, startDate, endDate, branchId, branchLoading]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                size: pageSize,
                keyword: searchQuery || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };

            // Add branchId for scoped users
            // Ensure branchId is a number for proper API filtering
            if (isBranchScoped && branchId) {
                params.branchId = Number(branchId);
                console.log("[CoordinatorOrderListPage] Filtering by branchId:", params.branchId, "(type:", typeof params.branchId, ")");
            } else if (isBranchScoped && !branchId) {
                console.warn("[CoordinatorOrderListPage] Warning: Coordinator should have branchId but it's missing. Fetching without branch filter.");
            }

            // Add filter for assigned/unassigned
            if (filterStatus === "ASSIGNED") {
                params.hasTrip = true;
            } else if (filterStatus === "UNASSIGNED") {
                params.hasTrip = false;
            }

            console.log("[CoordinatorOrderListPage] Fetching orders with params:", params);
            const response = await pageBookings(params);
            console.log("[CoordinatorOrderListPage] Orders response:", response);
            console.log("[CoordinatorOrderListPage] Total orders found:", response?.totalElements ?? response?.content?.length ?? 0);

            // Handle different response formats
            // Backend returns: { success, message, data: { items, totalPages, totalElements } }
            let content = response?.data?.items ?? response?.content ?? response?.items ?? response ?? [];
            const totalElements = response?.data?.totalElements ?? response?.totalElements ?? content.length;
            const totalPagesFromBackend = response?.data?.totalPages ?? response?.totalPages;

            // Debug: Log field names of first order
            if (content.length > 0) {
                console.log("[CoordinatorOrderListPage] Available fields:", Object.keys(content[0]));
                console.log("[CoordinatorOrderListPage] Sample order data:", {
                    id: content[0].id,
                    customerName: content[0].customerName,
                    customerPhone: content[0].customerPhone,
                    pickupLocation: content[0].pickupLocation,
                    dropoffLocation: content[0].dropoffLocation,
                    departureDate: content[0].departureDate,
                    tripId: content[0].tripId,
                    // Try alternative field names
                    pickup_location: content[0].pickup_location,
                    dropoff_location: content[0].dropoff_location,
                    departure_date: content[0].departure_date,
                    startLocation: content[0].startLocation,
                    endLocation: content[0].endLocation,
                    startDate: content[0].startDate,
                });
            }

            // Client-side filter cho trạng thái đã gắn / chưa gắn chuyến
            // Backend đã trả về field boolean isAssigned (tất cả trips đã gắn tài xế + xe)
            if (filterStatus === "ASSIGNED") {
                content = content.filter(order => order.isAssigned === true);
            } else if (filterStatus === "UNASSIGNED") {
                content = content.filter(order => !order.isAssigned);
            }

            // Use backend total pages if no filter, otherwise calculate from filtered content
            const filteredTotal = filterStatus === "ALL"
                ? (totalPagesFromBackend || Math.ceil(totalElements / pageSize) || 1)
                : Math.ceil(content.length / pageSize) || 1;

            setOrders(Array.isArray(content) ? content : []);
            setTotalPages(filteredTotal);

            if (Array.isArray(content) && content.length === 0) {
                console.log("[CoordinatorOrderListPage] No orders found. Check if:");
                console.log("  - BranchId is correct:", branchId);
                console.log("  - Date range is appropriate");
                console.log("  - Filter status is correct:", filterStatus);
            }
        } catch (error) {
            console.error("[CoordinatorOrderListPage] Error fetching orders:", error);
            setOrders([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (orderId) => {
        navigate(`/orders/${orderId}`);
    };

    const handleViewTripDetail = (orderId, tripId) => {
        navigate(`/orders/${orderId}/trip/${tripId}`);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            PENDING: { label: "Chờ xử lý", color: "bg-yellow-50 text-yellow-700" },
            CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-50 text-blue-700" },
            IN_PROGRESS: { label: "Đang thực hiện", color: "bg-purple-50 text-purple-700" },
            COMPLETED: { label: "Hoàn thành", color: "bg-green-50 text-green-700" },
            CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700" },
        };
        const config = statusMap[status] || { label: status, color: "bg-gray-50 text-gray-700" };
        return (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center shadow-lg">
                            <ClipboardList className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Danh sách đơn hàng</h1>
                            <p className="text-sm text-slate-600">Quản lý đơn đã gắn và chưa gắn chuyến</p>
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

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search + Time Filter */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                                <Search className="h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Tìm kiếm đơn hàng..."
                                    className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                />
                            </div>

                            {/* Time Filter */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent outline-none text-sm text-slate-700"
                                    />
                                </div>
                                <span className="text-slate-400">→</span>
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent outline-none text-sm text-slate-700"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setStartDate(today);
                                        setEndDate(today);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                    title="Hôm nay"
                                >
                                    Hôm nay
                                </button>
                                <button
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                    title="Xóa filter thời gian (lấy tất cả đơn)"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setStartDate(defaultStartDate);
                                        setEndDate(today);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    title="Reset về 30 ngày gần đây"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={() => fetchOrders()}
                                disabled={loading || branchLoading}
                                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Refresh
                            </button>
                        </div>

                        {/* Row 2: Filter buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    setFilterStatus("ALL");
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === "ALL"
                                    ? "bg-[#0079BC] text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => {
                                    setFilterStatus("UNASSIGNED");
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === "UNASSIGNED"
                                    ? "bg-orange-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                Chưa gắn chuyến
                            </button>
                            <button
                                onClick={() => {
                                    setFilterStatus("ASSIGNED");
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === "ASSIGNED"
                                    ? "bg-green-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                Đã gắn chuyến
                            </button>

                            {/* Branch info */}
                            {isBranchScoped && branchName && (
                                <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-700 text-sm">
                                    <span className="font-medium">Chi nhánh:</span>
                                    <span>{branchName}</span>
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
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Không tìm thấy đơn hàng nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Mã đơn
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Khách hàng
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Điểm đi - Điểm đến
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Ngày khởi hành
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Chuyến
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-900">#{order.id}</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-slate-900">
                                                {order.customerName || order.customer?.name || "—"}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {order.customerPhone || order.customer?.phone || "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-700">
                                                {order.routeSummary ? (
                                                    <div className="truncate max-w-xs" title={order.routeSummary}>
                                                        {order.routeSummary}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="truncate max-w-xs">
                                                            {order.pickupLocation || order.pickup_location || order.startLocation || order.start_location || "—"}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate max-w-xs">
                                                            → {order.dropoffLocation || order.dropoff_location || order.endLocation || order.end_location || "—"}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700">
                                            {order.startDate || order.departureDate || order.departure_date || order.start_date
                                                ? new Date(order.startDate || order.departureDate || order.departure_date || order.start_date).toLocaleDateString("vi-VN")
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                                        <td className="px-4 py-3">
                                            {order.isAssigned ? (
                                                <button
                                                    onClick={() => handleViewTripDetail(order.id, order.tripId)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Đã gắn
                                                </button>
                                            ) : (
                                                <span className="inline-flex px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-medium">
                                                        Chưa gắn
                                                    </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => handleViewDetail(order.id)}
                                                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
