import React from "react";
import { useNavigate } from "react-router-dom";
import { listEmployees, updateEmployee, listEmployeesByBranch } from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { Users, Plus, Search, Filter, Building2, UserCog, Edit, Ban, CheckCircle } from "lucide-react";

export default function EmployeeManagementPage() {
    const navigate = useNavigate();

    const [employees, setEmployees] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterBranch, setFilterBranch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState("");

    // Load data
    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async (branchId = null) => {
        setLoading(true);
        try {
            // Nếu có branchId thì lọc theo chi nhánh, không thì lấy tất cả
            const empPromise = branchId ? listEmployeesByBranch(branchId) : listEmployees();

            const [empData, branchData, roleData] = await Promise.all([
                empPromise,
                listBranches({ size: 100 }), // Lấy nhiều branches hơn
                listRoles(),
            ]);

            console.log("Employee data:", empData);
            console.log("Branch data:", branchData);
            console.log("Branch data.data:", branchData?.data);
            console.log("Branch data.data.content:", branchData?.data?.content);
            console.log("Role data:", roleData);

            // Xử lý employees data - ResponseData { status, message, data: [] }
            const employeesList = Array.isArray(empData?.data) ? empData.data : (Array.isArray(empData) ? empData : []);
            setEmployees(employeesList);
            console.log("Employees list set:", employeesList.length);

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
            console.log("Branches list set:", branchesList.length, branchesList);
            setBranches(branchesList);

            // Xử lý roles data - ResponseData { status, message, data: [] }
            const rolesList = Array.isArray(roleData?.data) ? roleData.data : (Array.isArray(roleData) ? roleData : []);
            console.log("Roles list set:", rolesList.length);
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

    // Filter logic - Chỉ lọc search và role ở frontend (branch đã lọc ở backend)
    const filteredEmployees = React.useMemo(() => {
        return employees.filter((emp) => {
            const userName = emp.userFullName?.toLowerCase() || "";
            const search = searchTerm.toLowerCase();

            const matchSearch = !searchTerm || userName.includes(search);
            const matchRole = !filterRole || emp.roleId === Number(filterRole);

            return matchSearch && matchRole;
        });
    }, [employees, searchTerm, filterRole]);

    return (
        <div className="min-h-screen bg-slate-50 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Users className="text-sky-600" size={28} />
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý nhân viên</h1>
                </div>
                <button
                    onClick={() => navigate("/admin/employees/create")}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Thêm nhân viên
                </button>
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

                <div>
                    <label className="text-xs text-slate-600 mb-1 block">
                        <Building2 size={14} className="inline mr-1" />
                        Chi nhánh
                    </label>
                    <select
                        value={filterBranch}
                        onChange={(e) => {
                            const branchId = e.target.value;
                            setFilterBranch(branchId);
                            // Gọi API lọc theo chi nhánh
                            loadData(branchId || null);
                        }}
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
                        {roles.map((r, index) => (
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
                        {filteredEmployees.map((emp, index) => (
                            <tr key={emp.id || `emp-${index}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm">{emp.id}</td>
                                <td className="px-4 py-3 text-sm font-medium">{emp.userFullName || "N/A"}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{emp.userEmail || "N/A"}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{emp.userPhone || "N/A"}</td>
                                <td className="px-4 py-3 text-sm">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                            {emp.roleName || "N/A"}
                                        </span>
                                </td>
                                <td className="px-4 py-3 text-sm">{emp.branchName || "N/A"}</td>
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
                                        <button
                                            onClick={() => navigate(`/admin/employees/edit/${emp.id}`)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(emp)}
                                            className={emp.status === "ACTIVE"
                                                ? "text-orange-600 hover:text-orange-800"
                                                : "text-green-600 hover:text-green-800"}
                                            title={emp.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                                        >
                                            {emp.status === "ACTIVE" ? <Ban size={16} /> : <CheckCircle size={16} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}