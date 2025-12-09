import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Eye, Calendar, Award, AlertCircle, RefreshCw, Loader2, X, CheckCircle2 } from "lucide-react";
import { listDriversByBranch, getDriverSchedule } from "../../api/drivers";
import { getBranchByUserId } from "../../api/branches";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import Pagination from "../common/Pagination";
import UserAvatar from "../common/UserAvatar";

export default function CoordinatorDriverListPage({ readOnly = false }) {
    const navigate = useNavigate();
    const role = useMemo(() => getCurrentRole(), []);
    const userId = useMemo(() => getStoredUserId(), []);
    const isBranchScoped = role === ROLES.MANAGER || role === ROLES.COORDINATOR || role === ROLES.CONSULTANT;
    const isConsultant = role === ROLES.CONSULTANT;
    // Cả Tư vấn viên và Điều phối viên đều có thể dùng filter kiểm tra tài xế rảnh
    const canUseAvailabilityFilter = isConsultant || role === ROLES.COORDINATOR;

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;
    
    // Time filter để kiểm tra tài xế rảnh (cho Tư vấn viên & Điều phối viên)
    const [timeFilterStart, setTimeFilterStart] = useState("");
    const [timeFilterEnd, setTimeFilterEnd] = useState("");
    const [driverAvailability, setDriverAvailability] = useState({}); // { driverId: { available: boolean, reason: string } }

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

    useEffect(() => {
        if (branchLoading) return;
        if (isBranchScoped && !branchId) return;
        fetchDrivers();
    }, [currentPage, searchQuery, branchId, branchLoading]);
    
    // Check driver availability when time filter is set
    useEffect(() => {
        if (!canUseAvailabilityFilter || !timeFilterStart || !timeFilterEnd || !drivers.length) {
            setDriverAvailability({});
            return;
        }
        
        const checkAvailability = async () => {
            const availabilityMap = {};
            const startTime = new Date(timeFilterStart + "T00:00:00");
            const endTime = new Date(timeFilterEnd + "T23:59:59");
            
            // Check availability for each driver
            for (const driver of drivers) {
                try {
                    const schedule = await getDriverSchedule(driver.id);
                    const trips = schedule?.trips || schedule || [];
                    
                    // Check if driver has any trip overlapping with the time range
                    const hasConflict = trips.some(trip => {
                        if (!trip.startTime || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
                            return false;
                        }
                        const tripStart = new Date(trip.startTime);
                        const tripEnd = trip.endTime ? new Date(trip.endTime) : new Date(tripStart.getTime() + 8 * 60 * 60 * 1000); // Default 8 hours if no endTime
                        
                        // Check overlap
                        return (tripStart <= endTime && tripEnd >= startTime);
                    });
                    
                    availabilityMap[driver.id] = {
                        available: !hasConflict,
                        reason: hasConflict ? "Có chuyến trong khoảng thời gian này" : "Rảnh",
                    };
                } catch (err) {
                    console.error(`Error checking availability for driver ${driver.id}:`, err);
                    availabilityMap[driver.id] = {
                        available: false,
                        reason: "Lỗi kiểm tra",
                    };
                }
            }
            
            setDriverAvailability(availabilityMap);
        };
        
        checkAvailability();
    }, [canUseAvailabilityFilter, timeFilterStart, timeFilterEnd, drivers]);

    const fetchDrivers = async () => {
        if (!branchId) {
            console.error("[CoordinatorDriverListPage] No branchId");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log("[CoordinatorDriverListPage] Fetching drivers for branch:", branchId);
            const response = await listDriversByBranch(branchId);
            console.log("[CoordinatorDriverListPage] Response:", response);
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
            setTotalItems(driversList.length);
        } catch (error) {
            console.error("Error fetching drivers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (driverId) => {
        navigate(`/coordinator/drivers/${driverId}`);
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

    // Helper để format date
    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).toLocaleDateString("vi-VN");
        } catch {
            return dateStr;
        }
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

                {/* Branch Error */}
                {branchError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span className="text-sm text-rose-700">{branchError}</span>
                    </div>
                )}

                {/* Search + Branch Info + Time Filter */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search + Refresh + Branch */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
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

                            {/* Refresh */}
                            <button
                                onClick={() => fetchDrivers()}
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
                        
                        {/* Row 2: Time filter for checking availability */}
                        {canUseAvailabilityFilter && (
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-200">
                                <span className="text-sm text-slate-600 font-medium">Kiểm tra tài xế rảnh:</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input
                                            type="date"
                                            value={timeFilterStart || ""}
                                            onChange={(e) => {
                                                const newStart = e.target.value;
                                                setTimeFilterStart(newStart);
                                                setCurrentPage(1);
                                                // Nếu ngày end < ngày start mới, reset end
                                                if (timeFilterEnd && newStart && timeFilterEnd < newStart) {
                                                    setTimeFilterEnd("");
                                                }
                                            }}
                                            max={timeFilterEnd || undefined}
                                            className="bg-transparent outline-none text-sm text-slate-700 flex-1 cursor-pointer"
                                            title="Từ ngày"
                                        />
                                    </div>
                                    <span className="text-slate-400">→</span>
                                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                        <input
                                            type="date"
                                            value={timeFilterEnd || ""}
                                            onChange={(e) => {
                                                const newEnd = e.target.value;
                                                // Validate: end phải >= start
                                                if (timeFilterStart && newEnd && newEnd < timeFilterStart) {
                                                    // Không cho phép chọn ngày end < start
                                                    return;
                                                }
                                                setTimeFilterEnd(newEnd);
                                                setCurrentPage(1);
                                            }}
                                            min={timeFilterStart || undefined}
                                            className="bg-transparent outline-none text-sm text-slate-700 flex-1 cursor-pointer"
                                            title="Đến ngày"
                                        />
                                    </div>
                                    {(timeFilterStart || timeFilterEnd) && (
                                        <button
                                            onClick={() => {
                                                setTimeFilterStart("");
                                                setTimeFilterEnd("");
                                            }}
                                            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2"
                                            title="Xóa filter thời gian"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
                                        {canUseAvailabilityFilter && timeFilterStart && timeFilterEnd && (
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                Rảnh/Bận
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {drivers.map((driver) => {
                                        const licenseStatus = getLicenseStatus(driver.licenseExpiry);
                                        return (
                                            <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar
                                                            name={driver.fullName}
                                                            avatar={driver.avatar}
                                                            size={40}
                                                        />
                                                        <div>
                                                            <div className="font-medium text-slate-900">{driver.fullName}</div>
                                                            <div className="text-xs text-slate-500">ID: {driver.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{driver.phone || "—"}</td>
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
                                                    {driver.healthCheckDate ? (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-slate-400" />
                                                            {formatDate(driver.healthCheckDate)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Chưa cập nhật</span>
                                                    )}
                                                </td>
                                                {/* Cột Trạng thái: Hiển thị trạng thái hiện tại của tài xế */}
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const statusMap = {
                                                            "AVAILABLE": { label: "Sẵn sàng", color: "bg-green-50 text-green-700" },
                                                            "BUSY": { label: "Đang bận", color: "bg-info-50 text-info-700" },
                                                            "ON_LEAVE": { label: "Nghỉ phép", color: "bg-slate-50 text-slate-700" },
                                                            "INACTIVE": { label: "Không hoạt động", color: "bg-rose-50 text-rose-700" },
                                                            "ACTIVE": { label: "Hoạt động", color: "bg-green-50 text-green-700" },
                                                        };
                                                        const config = statusMap[driver.status] || { label: driver.status || "—", color: "bg-slate-50 text-slate-700" };
                                                        return (
                                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                                                {config.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                {/* Cột Rảnh/Bận: Hiển thị trạng thái rảnh/bận theo khoảng thời gian đã chọn trong filter
                                                    Chỉ hiển thị khi tài xế ở trạng thái sẵn sàng (AVAILABLE/ACTIVE) và đã chọn filter ngày */}
                                                {canUseAvailabilityFilter && timeFilterStart && timeFilterEnd && (driver.status === "AVAILABLE" || driver.status === "ACTIVE") && (
                                                    <td className="px-4 py-3">
                                                        {driverAvailability[driver.id] ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                                                driverAvailability[driver.id].available
                                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                                    : "bg-orange-50 text-orange-700 border border-orange-200"
                                                            }`}>
                                                                {driverAvailability[driver.id].available ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Rảnh
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        Bận
                                                                    </>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Đang kiểm tra...</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center">
                                                        {/* Consultant: Ẩn button Xem chi tiết */}
                                                        {!isConsultant && (
                                                            <button
                                                                onClick={() => handleViewDetail(driver.id)}
                                                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                                title="Xem chi tiết"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {isConsultant && (
                                                            <span className="text-[11px] text-slate-400 italic">Chỉ xem</span>
                                                        )}
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
                {canUseAvailabilityFilter && timeFilterStart && timeFilterEnd && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900 mb-2">Giải thích về trạng thái:</div>
                                <ul className="space-y-1.5 text-slate-600">
                                    <li>
                                        <span className="font-medium text-slate-800">• Cột "Trạng thái":</span> Trạng thái hiện tại của tài xế trong hệ thống (Sẵn sàng/Đang bận/Nghỉ phép/Không hoạt động)
                                    </li>
                                    <li>
                                        <span className="font-medium text-slate-800">• Cột "Rảnh/Bận":</span> Chỉ hiển thị khi tài xế ở trạng thái "Sẵn sàng" hoặc "Hoạt động" và cho biết tài xế có rảnh trong khoảng thời gian đã chọn hay không
                                    </li>
                                    <li className="text-xs text-slate-500 mt-2">
                                        💡 Lưu ý: Tài xế đang "Đang bận", "Nghỉ phép" hoặc "Không hoạt động" sẽ không hiển thị cột "Rảnh/Bận" vì đã rõ là không thể sử dụng
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
