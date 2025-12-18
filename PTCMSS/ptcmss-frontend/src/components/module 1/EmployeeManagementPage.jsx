import React from "react";
import { useNavigate } from "react-router-dom";
import {
    listEmployees,
    updateEmployee,
    listEmployeesByBranch,
    getEmployeeByUserId,
} from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import {
    Users,
    Plus,
    Search,
    Building2,
    UserCog,
    Edit,
    Ban,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function EmployeeManagementPage() {
    const navigate = useNavigate();

    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const currentUserId = React.useMemo(() => getStoredUserId(), []);

    const isAdmin = currentRole === ROLES.ADMIN;
    const isManager = currentRole === ROLES.MANAGER;
    const isAccountant = currentRole === ROLES.ACCOUNTANT;

    const [allEmployees, setAllEmployees] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const [managerBranchId, setManagerBranchId] = React.useState(null);
    const [managerBranchName, setManagerBranchName] = React.useState("");

    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterBranch, setFilterBranch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState("");

    const [currentPage, setCurrentPage] = React.useState(1);
    const pageSize = 10;

    /* =========================
       LOAD DATA
    ========================= */

    React.useEffect(() => {
        if (!isManager && !isAccountant) {
            loadDataWithBranch(null);
            return;
        }

        if (!currentUserId) return;

        (async () => {
            try {
                const resp = await getEmployeeByUserId(currentUserId);
                const emp = resp?.data || resp;

                if (emp?.branchId) {
                    setManagerBranchId(emp.branchId);
                    setManagerBranchName(emp.branchName ?? `Chi nhánh #${emp.branchId}`);
                    setFilterBranch(String(emp.branchId));
                    await loadDataWithBranch(emp.branchId);
                }
            } catch (err) {
                console.error("Load branch error:", err);
            }
        })();
    }, [isManager, isAccountant, currentUserId]);

    const loadDataWithBranch = React.useCallback(async (branchId) => {
        setLoading(true);
        try {
            const empPromise = branchId
                ? listEmployeesByBranch(branchId)
                : listEmployees();

            const [empData, branchData, roleData] = await Promise.all([
                empPromise,
                listBranches({ size: 100 }),
                listRoles(),
            ]);

            const employees = Array.isArray(empData?.data)
                ? empData.data
                : Array.isArray(empData)
                    ? empData
                    : [];

            setAllEmployees(employees);

            const branchList =
                branchData?.items ||
                branchData?.data?.items ||
                branchData?.data?.content ||
                branchData?.content ||
                branchData?.data ||
                branchData ||
                [];

            setBranches(Array.isArray(branchList) ? branchList : []);

            const rolesList = Array.isArray(roleData?.data)
                ? roleData.data
                : Array.isArray(roleData)
                    ? roleData
                    : [];

            setRoles(rolesList);
        } catch (e) {
            console.error("Load data error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleToggleStatus = async (emp) => {
        const newStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const action = newStatus === "ACTIVE" ? "kích hoạt" : "vô hiệu hóa";

        if (!window.confirm(`Bạn có chắc muốn ${action} nhân viên "${emp.userFullName}"?`)) return;

        try {
            await updateEmployee(emp.id, {
                branchId: emp.branchId,
                roleId: emp.roleId,
                status: newStatus,
            });
            await loadDataWithBranch(managerBranchId);
        } catch (err) {
            alert("Thao tác thất bại");
        }
    };

    /* =========================
       FILTER + PAGINATION
    ========================= */

    const filteredEmployees = React.useMemo(() => {
        return allEmployees.filter((emp) => {
            if (emp.roleName?.toLowerCase() === "admin") return false;

            if ((isManager || isAccountant) && managerBranchId && emp.branchId !== managerBranchId)
                return false;

            const search = searchTerm.toLowerCase();
            const matchSearch =
                !search ||
                emp.userFullName?.toLowerCase().includes(search) ||
                emp.userEmail?.toLowerCase().includes(search);

            const matchBranch = !filterBranch || emp.branchId === Number(filterBranch);
            const matchRole = !filterRole || emp.roleId === Number(filterRole);

            return matchSearch && matchBranch && matchRole;
        });
    }, [allEmployees, searchTerm, filterBranch, filterRole, isManager, isAccountant, managerBranchId]);

    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));

    const paginatedEmployees = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, currentPage]);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterBranch, filterRole]);

    /* =========================
       RENDER
    ========================= */

    return (
        <div className="min-h-screen bg-slate-50 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Users size={28} className="text-sky-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Quản lý nhân viên
                        </h1>
                        {(isManager || isAccountant) && managerBranchName && (
                            <p className="text-sm text-slate-500">
                                Chi nhánh: {managerBranchName}
                            </p>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => navigate("/admin/users/new")}
                        className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700"
                    >
                        <Plus size={16} />
                        Thêm nhân viên
                    </button>
                )}
            </div>

            {/* Filters */}
            <div
                className={`bg-white rounded-xl shadow-sm p-4 mb-4 grid gap-4 ${
                    isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
                }`}
            >
                <div>
                    <label className="text-xs text-slate-600 block mb-1">
                        <Search size={14} className="inline mr-1" />
                        Tìm kiếm
                    </label>
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="Tên hoặc email..."
                    />
                </div>

                {isAdmin && (
                    <div>
                        <label className="text-xs text-slate-600 block mb-1">
                            <Building2 size={14} className="inline mr-1" />
                            Chi nhánh
                        </label>
                        <select
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Tất cả</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="text-xs text-slate-600 block mb-1">
                        <UserCog size={14} className="inline mr-1" />
                        Vai trò
                    </label>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                        <option value="">Tất cả</option>
                        {roles
                            .filter((r) => r.roleName?.toLowerCase() !== "admin")
                            .map((r) => (
                                <option key={r.id} value={r.id}>
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
                ) : paginatedEmployees.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        Không có nhân viên
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-100 border-b text-xs text-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">Họ tên</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Vai trò</th>
                                <th className="px-4 py-3 text-left">Chi nhánh</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-center">Thao tác</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {paginatedEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">{emp.id}</td>
                                    <td className="px-4 py-3 font-medium">
                                        {emp.userFullName}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {emp.userEmail}
                                    </td>
                                    <td className="px-4 py-3">{emp.roleName}</td>
                                    <td className="px-4 py-3">{emp.branchName}</td>
                                    <td className="px-4 py-3">
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${
                                                    emp.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {emp.status}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            {!isAccountant && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            navigate(`/admin/users/${emp.userId}`)
                                                        }
                                                        className="text-blue-600"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(emp)}
                                                        className={
                                                            emp.status === "ACTIVE"
                                                                ? "text-orange-600"
                                                                : "text-green-600"
                                                        }
                                                    >
                                                        {emp.status === "ACTIVE" ? (
                                                            <Ban size={16} />
                                                        ) : (
                                                            <CheckCircle size={16} />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                            <span>
                                Trang {currentPage} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
