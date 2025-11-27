import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CarFront, Search, Eye, Edit, Calendar, AlertTriangle } from "lucide-react";
import { listVehiclesByBranch } from "../../api/vehicles";
import { getCookie } from "../../utils/cookies";
import Pagination from "../common/Pagination";

export default function CoordinatorVehicleListPage() {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        fetchVehicles();
    }, [currentPage, searchQuery]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const branchId = getCookie("branchId");
            if (!branchId) {
                console.error("No branchId found");
                setLoading(false);
                return;
            }

            const response = await listVehiclesByBranch(branchId);
            let vehiclesList = Array.isArray(response) ? response : [];

            // Client-side search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                vehiclesList = vehiclesList.filter(v =>
                    (v.licensePlate || "").toLowerCase().includes(query) ||
                    (v.model || "").toLowerCase().includes(query) ||
                    (v.brand || "").toLowerCase().includes(query)
                );
            }

            // Client-side pagination
            const total = Math.ceil(vehiclesList.length / pageSize);
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const paged = vehiclesList.slice(start, end);

            setVehicles(paged);
            setTotalPages(total || 1);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (vehicleId) => {
        navigate(`/coordinator/vehicles/${vehicleId}`);
    };

    const handleEditVehicle = (vehicleId) => {
        navigate(`/coordinator/vehicles/${vehicleId}/edit`);
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

                {/* Search */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <Search className="h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Tìm kiếm xe theo biển số, loại xe..."
                            className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                        />
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
                                        const inspectionStatus = getInspectionStatus(vehicle.inspectionExpiryDate);
                                        const insuranceStatus = getInsuranceStatus(vehicle.insuranceExpiryDate);
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
                                                    {vehicle.vehicleCategory?.name || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    {vehicle.brand || "—"}
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
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${vehicle.status === "AVAILABLE"
                                                            ? "bg-green-50 text-green-700"
                                                            : vehicle.status === "IN_USE"
                                                                ? "bg-blue-50 text-blue-700"
                                                                : vehicle.status === "MAINTENANCE"
                                                                    ? "bg-orange-50 text-orange-700"
                                                                    : "bg-gray-50 text-gray-700"
                                                            }`}
                                                    >
                                                        {vehicle.status === "AVAILABLE"
                                                            ? "Sẵn sàng"
                                                            : vehicle.status === "IN_USE"
                                                                ? "Đang sử dụng"
                                                                : vehicle.status === "MAINTENANCE"
                                                                    ? "Bảo trì"
                                                                    : "Không hoạt động"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetail(vehicle.id)}
                                                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditVehicle(vehicle.id)}
                                                            className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                                            title="Cập nhật hồ sơ"
                                                        >
                                                            <Edit className="h-4 w-4" />
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
