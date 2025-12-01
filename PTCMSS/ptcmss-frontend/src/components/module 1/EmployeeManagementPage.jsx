import React from "react";
import { useNavigate } from "react-router-dom";
import { listEmployees, updateEmployee, listEmployeesByBranch, getEmployeeByUserId } from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { Users, Plus, Search, Filter, Building2, UserCog, Edit, Ban, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function EmployeeManagementPage() {
    const navigate = useNavigate();
    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const currentUserId = React.useMemo(() => getStoredUserId(), []);
    const isAdmin = currentRole === ROLES.ADMIN;
    const isManager = currentRole === ROLES.MANAGER;
    const isAccountant = currentRole === ROLES.ACCOUNTANT;

    const [allEmployees, setAllEmployees] = React.useState([]); // Tất cả nhân viên từ API
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Manager's branch info
    const [managerBranchId, setManagerBranchId] = React.useState(null);
    const [managerBranchName, setManagerBranchName] = React.useState("");

    // Filters
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterBranch, setFilterBranch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState("");

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 10;

    // Load Manager/Accountant's branch
    React.useEffect(() => {
        if ((!isManager && !isAccountant) || !currentUserId) return;

        (async () => {
            try {
                const resp = await getEmployeeByUserId(currentUserId);
                const emp = resp?.data || resp;
                if (emp?.branchId) {
                    setManagerBranchId(emp.branchId);
                    setManagerBranchName(emp.branchName || "");
                    setFilterBranch(String(emp.branchId)); // Auto filter by user's branch
                }
            } catch (err) {
                console.error("Error loading user branch:", err);
            }
        })();
    }, [isManager, isAccountant, currentUserId]);

    // Load data
    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [empData, branchData, roleData] = await Promise.all([
                listEmployees(),
                listBranches({ size: 100 }),
                listRoles(),
            ]);

            // Xử lý employees data - ResponseData { status, message, data: [] }
            const employeesList = Array.isArray(empData?.data) ? empData.data : (Array.isArray(empData) ? empData : []);
            setAllEmployees(employeesList);

            // Xử lý branches data - Có thể là { items: [] } hoặc { content: [] }
            let branchesList = [];
            if (branchData?.items && Array.isArray(branchData.items)) {
                branchesList = branchData.items;
            } else if (branchData?.data?.items && Array.isArray(branchData.data.items)) {
                branchesList = branchData.data.items;
            } else if (branchData?.data?.content && Array.isArray(branchData.data.content)) {
                branchesList = branchData.data.content;
            } else if (branchData?.content && Array.isArray(branchData.content)) {
                branchesList = branchData.content;
            } else if (Array.isArray(branchData?.data)) {
                branchesList = branchData.data;
            } else if (Array.isArray(branchData)) {
                branchesList = branchData;
            }
            setBranches(branchesList);

            // Xử lý roles data - ResponseData { status, message, data: [] }
            const rolesList = Array.isArray(roleData?.data) ? roleData.data : (Array.isArray(roleData) ? roleData : []);
            setRoles(rolesList);
        } catch (error) {
            console.error("Load data error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (emp) => {
        const newStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const action = newStatus === "INACTIVE" ? "vô hiệu hóa" : "kích hoạt lại";

        if (!window.confirm(`Bạn có chắc muốn ${action} nhân viên "${emp.userFullName}"?`)) return;

        try {
            await updateEmployee(emp.id, {
                branchId: emp.branchId,
                roleId: emp.roleId,
                status: newStatus,
            });
            loadData();
        } catch (error) {
            alert(`${action.charAt(0).toUpperCase() + action.slice(1)} nhân viên thất bại: ` + (error?.message || ""));
        }
    };

    // Filter logic - Lọc tất cả ở frontend
    // QUAN TRỌNG: Loại bỏ Admin khỏi danh sách vì Admin không phải employee
    const filteredEmployees = React.useMemo(() => {
        return allEmployees.filter((emp) => {
            const userName = emp.userFullName?.toLowerCase() || "";
            const userEmail = emp.userEmail?.toLowerCase() || "";
            const roleName = emp.roleName?.toLowerCase() || "";
            const search = searchTerm.toLowerCase();

            // Loại bỏ Admin
            if (roleName === "admin") return false;

            // Manager và Accountant chỉ xem nhân viên trong chi nhánh của mình
            if ((isManager || isAccountant) && managerBranchId && emp.branchId !== managerBranchId) return false;

            const matchSearch = !searchTerm || userName.includes(search) || userEmail.includes(search);
            const matchBranch = !filterBranch || emp.branchId === Number(filterBranch);
            const matchRole = !filterRole || emp.roleId === Number(filterRole);

            return matchSearch && matchBranch && matchRole;
        });
    }, [allEmployees, searchTerm, filterBranch, filterRole, isManager, isAccountant, managerBranchId]);

    // Pagination
    const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
    const paginatedEmployees = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage, pageSize]);

    // Reset page khi filter thay đổi
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterBranch, filterRole]);

    return (
        <div className="min-h-screen bg-slate-50 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Users className="text-sky-600" size={28} />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Quản lý nhân viên</h1>
                        {(isManager || isAccountant) && managerBranchName && (
                            <p className="text-sm text-slate-500">Chi nhánh: {managerBranchName}</p>
                        )}
                    </div>
                </div>
                {/* Chỉ Admin mới có nút thêm nhân viên */}
                {isAdmin && (
                    <button
                        onClick={() => navigate("/admin/users/new")}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg shadow-sm font-medium transition-all"
                    >
                        <Plus size={18} />
                        Tạo tài khoản mới
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs text-slate-600 mb-1 block">
                        <Search size={14} className="inline mr-1" />
                        Tìm kiếm
                    </label>
                    <input
                        type="text"
                        placeholder="Tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                </div>

                {/* Chi nhánh - Ẩn với Manager và Accountant vì đã lock theo chi nhánh */}
                {!isManager && !isAccountant && (
                    <div>
                        <label className="text-xs text-slate-600 mb-1 block">
                            <Building2 size={14} className="inline mr-1" />
                            Chi nhánh
                        </label>
                        <select
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b, index) => (
                                <option key={b.id || `branch-${index}`} value={b.id}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="text-xs text-slate-600 mb-1 block">
                        <UserCog size={14} className="inline mr-1" />
                        Vai trò
                    </label>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    >
                        <option value="">Tất cả</option>
                        {roles
                            .filter((r) => r.roleName?.toLowerCase() !== "admin")
                            .map((r, index) => (
                                <option key={r.id || `role-${index}`} value={r.id}>
                                    {r.roleName}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Đang tải...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Không có nhân viên nào</div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Họ tên</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Số điện thoại</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Vai trò</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Chi nhánh</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Trạng thái</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700">Thao tác</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {paginatedEmployees.map((emp, index) => (
                                <tr key={emp.id || `emp-${index}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm">{emp.id}</td>
                                    <td className="px-4 py-3 text-sm font-medium">{emp.userFullName || "Không có"}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{emp.userEmail || "Không có"}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{emp.userPhone || "Không có"}</td>
                                    <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                {emp.roleName || "Không có"}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{emp.branchName || "Không có"}</td>
                                    <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${emp.status === "ACTIVE"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {emp.status}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Admin có thể sửa tất cả, Manager có thể sửa nhân viên trong chi nhánh (trừ Manager khác), Accountant chỉ xem */}
                                            {(isAdmin || (isManager && emp.roleName?.toLowerCase() !== "manager")) && (
                                                <button
                                                    onClick={() => navigate(`/admin/employees/edit/${emp.id}`)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            {/* Chỉ Admin mới có thể vô hiệu hóa/kích hoạt */}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleToggleStatus(emp)}
                                                    className={emp.status === "ACTIVE"
                                                        ? "text-orange-600 hover:text-orange-800"
                                                        : "text-green-600 hover:text-green-800"}
                                                    title={emp.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                                                >
                                                    {emp.status === "ACTIVE" ? <Ban size={16} /> : <CheckCircle size={16} />}
                                                </button>
                                            )}
                                            {/* Accountant chỉ xem, không có nút thao tác */}
                                            {isAccountant && !isAdmin && !isManager && (
                                                <span className="text-xs text-slate-400">Chỉ xem</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-sm text-slate-600">
                                Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} / {filteredEmployees.length} nhân viên
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    className="flex items-center gap-1 px-3 py-1 border border-slate-300 rounded-md text-sm bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} /> Trước
                                </button>
                                <span className="text-sm text-slate-600 px-2">
                                    Trang {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="flex items-center gap-1 px-3 py-1 border border-slate-300 rounded-md text-sm bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Sau <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
