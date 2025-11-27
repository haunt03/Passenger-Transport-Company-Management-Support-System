import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, Eye, Filter, X } from "lucide-react";
import { pageBookings } from "../../api/bookings";
import Pagination from "../common/Pagination";

export default function CoordinatorOrderListPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, ASSIGNED, UNASSIGNED
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        fetchOrders();
    }, [currentPage, searchQuery, filterStatus]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                size: pageSize,
                keyword: searchQuery,
            };

            // Add filter for assigned/unassigned
            if (filterStatus === "ASSIGNED") {
                params.hasTrip = true;
            } else if (filterStatus === "UNASSIGNED") {
                params.hasTrip = false;
            }

            const response = await pageBookings(params);
            setOrders(response.content || []);
            setTotalPages(response.totalPages || 1);
        } catch (error) {
            console.error("Error fetching orders:", error);
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

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
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

                        {/* Filter buttons */}
                        <div className="flex gap-2">
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
                                                <div className="text-sm font-medium text-slate-900">{order.customerName}</div>
                                                <div className="text-xs text-slate-500">{order.customerPhone}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-700">
                                                    <div className="truncate max-w-xs">{order.pickupLocation}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-xs">→ {order.dropoffLocation}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                {new Date(order.departureDate).toLocaleDateString("vi-VN")}
                                            </td>
                                            <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                                            <td className="px-4 py-3">
                                                {order.tripId ? (
                                                    <button
                                                        onClick={() => handleViewTripDetail(order.id, order.tripId)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        Xem chuyến
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
