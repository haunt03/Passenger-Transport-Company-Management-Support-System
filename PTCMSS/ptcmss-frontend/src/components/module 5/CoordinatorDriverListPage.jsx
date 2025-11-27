import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Eye, Edit, Calendar, Award, AlertCircle } from "lucide-react";
import { listDriversByBranch } from "../../api/drivers";
import { getCookie } from "../../utils/cookies";
import Pagination from "../common/Pagination";

export default function CoordinatorDriverListPage() {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        fetchDrivers();
    }, [currentPage, searchQuery]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const branchId = getCookie("branchId");
            if (!branchId) {
                console.error("No branchId found");
                setLoading(false);
                return;
            }

            const response = await listDriversByBranch(branchId);
            let driversList = Array.isArray(response) ? response : [];

            // Client-side search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                driversList = driversList.filter(d =>
                    (d.fullName || "").toLowerCase().includes(query) ||
                    (d.phone || "").toLowerCase().includes(query) ||
                    (d.licenseNumber || "").toLowerCase().includes(query)
                );
            }

            // Client-side pagination
            const total = Math.ceil(driversList.length / pageSize);
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const paged = driversList.slice(start, end);

            setDrivers(paged);
            setTotalPages(total || 1);
        } catch (error) {
            console.error("Error fetching drivers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (driverId) => {
        navigate(`/coordinator/drivers/${driverId}`);
    };

    const handleEditDriver = (driverId) => {
        navigate(`/coordinator/drivers/${driverId}/edit`);
    };

    const getLicenseStatus = (expiryDate) => {
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
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Danh sách tài xế</h1>
                            <p className="text-sm text-slate-600">Quản lý hồ sơ tài xế chi nhánh</p>
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
                            placeholder="Tìm kiếm tài xế theo tên, số điện thoại..."
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
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Không tìm thấy tài xế nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Tài xế
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Số điện thoại
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Hạng GPLX
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Hạn GPLX
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Khám sức khỏe
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
                                    {drivers.map((driver) => {
                                        const licenseStatus = getLicenseStatus(driver.licenseExpiryDate);
                                        return (
                                            <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0079BC] to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                                                            {driver.fullName?.charAt(0) || "?"}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-900">{driver.fullName}</div>
                                                            <div className="text-xs text-slate-500">ID: {driver.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{driver.phoneNumber || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                                                        <Award className="h-3 w-3" />
                                                        {driver.licenseClass || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-medium ${licenseStatus.color}`}>
                                                        {licenseStatus.text}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    {driver.lastHealthCheckDate ? (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-slate-400" />
                                                            {new Date(driver.lastHealthCheckDate).toLocaleDateString("vi-VN")}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Chưa cập nhật</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${driver.status === "ACTIVE"
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-gray-50 text-gray-700"
                                                            }`}
                                                    >
                                                        {driver.status === "ACTIVE" ? "Hoạt động" : "Không hoạt động"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetail(driver.id)}
                                                            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditDriver(driver.id)}
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
