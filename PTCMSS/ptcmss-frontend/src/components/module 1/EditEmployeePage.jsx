import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmployee, updateEmployee } from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { UserCog, ArrowLeft, Save } from "lucide-react";

export default function EditEmployeePage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = React.useState(true);
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);

    const [formData, setFormData] = React.useState({
        branchId: "",
        roleId: "",
        status: "ACTIVE",
    });

    const [employeeInfo, setEmployeeInfo] = React.useState(null);

    React.useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log("Loading employee data for ID:", id);

            const [empData, branchData, roleData] = await Promise.all([
                getEmployee(id),
                listBranches({ size: 100 }),
                listRoles(),
            ]);

            console.log("Employee data received:", empData);
            console.log("Branch data received:", branchData);
            console.log("Role data received:", roleData);

            // Xử lý employee data
            const employee = empData?.data || empData;
            console.log("Processed employee:", employee);
            setEmployeeInfo(employee);

            // Set form data
            const initialFormData = {
                branchId: employee.branchId || "",
                roleId: employee.roleId || "",
                status: employee.status || "ACTIVE",
            };
            console.log("Setting form data:", initialFormData);
            setFormData(initialFormData);

            // Xử lý branches data
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

            // Xử lý roles data
            const rolesList = Array.isArray(roleData?.data) ? roleData.data : (Array.isArray(roleData) ? roleData : []);
            setRoles(rolesList);
        } catch (error) {
            console.error("Load data error:", error);
            console.error("Error details:", {
                message: error?.message,
                status: error?.status,
                data: error?.data
            });

            const errorMsg = error?.data?.message || error?.message || "Lỗi không xác định";
            alert("Không thể tải thông tin nhân viên: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.branchId || !formData.roleId) {
            alert("Vui lòng điền đầy đủ thông tin!");
            return;
        }

        // Validation: Tài xế đang trong chuyến không được đổi sang INACTIVE
        if (employeeInfo && formData.status === "INACTIVE") {
            const roleName = (roles.find(r => r.id === Number(formData.roleId))?.roleName || "").toLowerCase();
            const isDriver = roleName.includes("driver") || roleName.includes("tài xế");

            if (isDriver) {
                // TODO: Cần check với backend xem tài xế có đang trong chuyến không
                // Tạm thời warning
                const confirmed = window.confirm(
                    "Bạn đang chuyển trạng thái tài xế sang INACTIVE.\n" +
                    "Lưu ý: Tài xế đang trong chuyến sẽ không thể cập nhật trạng thái.\n" +
                    "Bạn có chắc chắn muốn tiếp tục?"
                );
                if (!confirmed) return;
            }
        }

        try {
            const payload = {
                branchId: Number(formData.branchId),
                roleId: Number(formData.roleId),
                status: formData.status,
            };
            console.log("Sending update request:", { id, payload });

            const result = await updateEmployee(id, payload);
            console.log("Update result:", result);

            alert("Cập nhật nhân viên thành công!");
            navigate("/admin/employees");
        } catch (error) {
            console.error("Update error:", error);
            console.error("Error details:", {
                message: error?.message,
                status: error?.status,
                data: error?.data
            });

            const errorMsg = error?.data?.message || error?.message || "Lỗi không xác định";
            alert("Cập nhật nhân viên thất bại: " + errorMsg);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-5 flex items-center justify-center">
                <div className="text-slate-500">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate("/admin/employees")}
                    className="text-slate-600 hover:text-slate-800"
                >
                    <ArrowLeft size={24} />
                </button>
                <UserCog className="text-sky-600" size={28} />
                <h1 className="text-2xl font-bold text-slate-800">Chỉnh sửa nhân viên</h1>
            </div>

            {/* Employee Info */}
            {employeeInfo && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-2">Thông tin nhân viên</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500">Họ tên:</span>
                            <span className="ml-2 font-medium">{employeeInfo.userFullName || "Không có"}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Email:</span>
                            <span className="ml-2 font-medium">{employeeInfo.userEmail || "Không có"}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Số điện thoại:</span>
                            <span className="ml-2 font-medium">{employeeInfo.userPhone || "Không có"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Chi nhánh */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Chi nhánh <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.branchId}
                            onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            required
                        >
                            <option value="">-- Chọn chi nhánh --</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.branchName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vai trò */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Vai trò <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.roleId}
                            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            required
                        >
                            <option value="">-- Chọn vai trò --</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.roleName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Trạng thái */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Trạng thái <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            required
                        >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg shadow-sm font-medium"
                        >
                            <Save size={18} />
                            Lưu thay đổi
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/admin/employees")}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
