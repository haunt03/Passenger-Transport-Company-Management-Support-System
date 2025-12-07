import React from "react";
import { useNavigate } from "react-router-dom";
import { createEmployeeWithUser, getEmployeeByUserId } from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { Save, ArrowLeft, CheckCircle, XCircle, UserPlus, User, Mail, Phone, MapPin, Building2, Shield, Lock, AlertCircle, Info } from "lucide-react";

export default function CreateEmployeeWithUserPage() {
    const navigate = useNavigate();

    const [form, setForm] = React.useState({
        // User info
        username: "",
        fullName: "",
        email: "",
        phone: "",
        address: "",
        // Employee info
        branchId: "",
        roleId: "",
        status: "ACTIVE",
        // Driver specific
        licenseNumber: "", // Số bằng lái (bắt buộc cho tài xế)
    });

    const [errors, setErrors] = React.useState({});
    const [generalError, setGeneralError] = React.useState("");
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);
    const [isCurrentUserAdmin, setIsCurrentUserAdmin] = React.useState(false);
    const [isCurrentUserManager, setIsCurrentUserManager] = React.useState(false);
    const [managerBranchId, setManagerBranchId] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);

    // Load branches và roles + thông tin current user
    React.useEffect(() => {
        (async () => {
            try {
                // Lấy role + branch của current user từ localStorage + API
                const storedUserId = localStorage.getItem("userId");
                const currentRole = (localStorage.getItem("roleName") || "").toUpperCase();
                const isAdminLocal = currentRole === "ADMIN";
                const isManagerLocal = currentRole === "MANAGER";
                setIsCurrentUserAdmin(isAdminLocal);
                setIsCurrentUserManager(isManagerLocal);

                let detectedManagerBranchId = null;
                if (isManagerLocal && storedUserId) {
                    try {
                        const empResp = await getEmployeeByUserId(Number(storedUserId));
                        const emp = empResp?.data || empResp;
                        if (emp?.branchId) {
                            detectedManagerBranchId = Number(emp.branchId);
                            setManagerBranchId(detectedManagerBranchId);
                            // Gán sẵn chi nhánh cho form
                            setForm((prev) => ({
                                ...prev,
                                branchId: String(detectedManagerBranchId),
                            }));
                        }
                    } catch (e) {
                        console.error("Không lấy được chi nhánh của Manager hiện tại:", e);
                    }
                }

                const [branchData, roleData] = await Promise.all([
                    listBranches({ size: 100 }),
                    listRoles(),
                ]);

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
                // Nếu là Manager, chỉ hiển thị chi nhánh mình quản lý
                if (isManagerLocal && detectedManagerBranchId) {
                    branchesList = branchesList.filter(
                        (b) => String(b.id) === String(detectedManagerBranchId)
                    );
                }
                setBranches(branchesList);

                // Xử lý roles data
                const rolesList = Array.isArray(roleData?.data)
                    ? roleData.data
                    : Array.isArray(roleData)
                        ? roleData
                        : [];
                setRoles(rolesList);
            } catch (error) {
                console.error("Load data error:", error);
            }
        })();
    }, []);

    const validate = () => {
        const newErrors = {};

        // User validation
        if (!form.username || form.username.trim().length < 3) {
            newErrors.username = "Username phải có ít nhất 3 ký tự";
        }

        if (!form.fullName || form.fullName.trim().length === 0) {
            newErrors.fullName = "Họ tên không được để trống";
        }

        if (!form.email || form.email.trim().length === 0) {
            newErrors.email = "Email là bắt buộc để gửi link xác thực";
        }

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Email không hợp lệ";
        }

        if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.replace(/\s/g, ""))) {
            newErrors.phone = "Số điện thoại không hợp lệ (10-11 số)";
        }

        // Employee validation
        if (!form.branchId) {
            newErrors.branchId = "Vui lòng chọn chi nhánh";
        }

        if (!form.roleId) {
            newErrors.roleId = "Vui lòng chọn vai trò";
        }

        // Driver validation: yêu cầu số bằng lái
        const selectedRole = roles.find(r => String(r.id) === String(form.roleId));
        const isDriverRole = selectedRole?.roleName?.toUpperCase().includes("DRIVER") ||
            selectedRole?.roleName?.toLowerCase().includes("tài xế") ||
            selectedRole?.description?.toLowerCase().includes("tài xế");

        if (isDriverRole && (!form.licenseNumber || form.licenseNumber.trim().length === 0)) {
            newErrors.licenseNumber = "Số bằng lái là bắt buộc đối với tài xế";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Helper function to generate username from full name
    const generateUsername = (fullName) => {
        if (!fullName) return "";

        // Remove Vietnamese accents
        const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
        const to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

        let result = fullName.toLowerCase().trim();
        for (let i = 0; i < from.length; i++) {
            result = result.replace(new RegExp(from[i], "g"), to[i]);
        }

        // Replace spaces with dots and remove special characters
        result = result.replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");

        return result;
    };

    const updateField = (field, value) => {
        // Auto-suggest username when fullName changes (only if username is empty)
        if (field === "fullName" && value) {
            setForm((prev) => {
                const newForm = { ...prev, [field]: value };
                // Only auto-suggest if username is empty or was auto-generated
                if (!prev.username || prev.username === generateUsername(prev.fullName)) {
                    newForm.username = generateUsername(value);
                }
                return newForm;
            });
        } else {
            setForm((prev) => ({ ...prev, [field]: value }));
        }

        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setGeneralError("");
    };

    const onSave = async () => {
        if (!validate()) return;

        setSaving(true);
        setGeneralError("");
        setShowSuccess(false);

        try {
            const requestData = {
                username: form.username.trim(),
                fullName: form.fullName.trim(),
                email: form.email.trim(), // Email bắt buộc
                phone: form.phone?.trim() || null,
                address: form.address?.trim() || null,
                branchId: Number(form.branchId),
                roleId: Number(form.roleId),
                status: form.status,
            };

            // Thêm licenseNumber nếu là Driver
            const selectedRole = roles.find(r => String(r.id) === String(form.roleId));
            const isDriverRole = selectedRole?.roleName?.toUpperCase().includes("DRIVER") ||
                selectedRole?.roleName?.toLowerCase().includes("tài xế") ||
                selectedRole?.description?.toLowerCase().includes("tài xế");

            if (isDriverRole) {
                requestData.licenseNumber = form.licenseNumber?.trim() || "";
            }

            console.log("Creating employee with user:", requestData);
            console.log("Selected role:", selectedRole);
            console.log("Is driver role:", isDriverRole);

            const response = await createEmployeeWithUser(requestData);
            console.log("Create response:", response);

            setShowSuccess(true);
            setTimeout(() => navigate("/admin/employees"), 1500);
        } catch (error) {
            console.error("Create error:", error);

            // Parse error message từ nhiều nguồn khác nhau
            let errorMessage = "Tạo nhân viên thất bại";

            if (error?.data) {
                // Error từ apiFetch (http.js)
                if (error.data.message) {
                    errorMessage = error.data.message;
                } else if (error.data.error) {
                    errorMessage = error.data.error;
                } else if (typeof error.data === 'string') {
                    errorMessage = error.data;
                }
            } else if (error?.response?.data) {
                // Error từ axios response
                if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Cải thiện message cho user-friendly hơn
            if (errorMessage.includes("Access is denied") || errorMessage.includes("Access denied") || errorMessage.includes("Forbidden")) {
                errorMessage = "Bạn không có quyền tạo tài khoản. Chỉ Admin và Manager mới có thể tạo tài khoản mới. Vui lòng liên hệ quản trị viên nếu bạn cần quyền này.";
            } else if (errorMessage.includes("username") && errorMessage.includes("exists")) {
                errorMessage = "Tên đăng nhập đã tồn tại. Vui lòng chọn tên đăng nhập khác.";
            } else if (errorMessage.includes("email") && errorMessage.includes("exists")) {
                errorMessage = "Email đã được sử dụng. Vui lòng sử dụng email khác.";
            } else if (errorMessage.includes("phone") && errorMessage.includes("exists")) {
                errorMessage = "Số điện thoại đã được sử dụng. Vui lòng sử dụng số điện thoại khác.";
            }

            setGeneralError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const BRAND_COLOR = "#0079BC";

    // Filter roles dựa trên quyền của current user (Manager không chọn được Admin/Manager)
    const filteredRoles = React.useMemo(() => {
        if (!roles.length) return [];

        return roles.filter((r) => {
            const roleName = (r.roleName || r.name || "").toUpperCase();

            // Manager không được chọn Admin hoặc Manager
            if (!isCurrentUserAdmin) {
                if (roleName === "ADMIN" || roleName === "MANAGER" || roleName === "QUẢN LÝ") {
                    return false;
                }
            }

            return true;
        });
    }, [roles, isCurrentUserAdmin]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
            {/* SUCCESS TOAST */}
            {showSuccess && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-gradient-to-r from-green-50 to-amber-50 border border-green-200 shadow-xl rounded-xl p-4 flex gap-3 items-center min-w-[320px]">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="text-green-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-green-800 text-sm">Thành công!</div>
                            <div className="text-xs text-green-700">Tạo nhân viên và tài khoản thành công</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98]"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </button>

                    <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Tạo nhân viên mới</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Tạo tài khoản và thông tin nhân viên</p>
                        </div>
                    </div>

                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                        style={{ backgroundColor: BRAND_COLOR }}
                    >
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Đang lưu..." : "Lưu"}</span>
                    </button>
                </div>

                {/* General error */}
                {generalError && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 flex gap-3 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <XCircle className="text-red-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-red-800 text-sm mb-1">Lỗi</div>
                            <div className="text-sm text-red-700">{generalError}</div>
                        </div>
                    </div>
                )}

                {/* FORM - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* LEFT: Thông tin tài khoản */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                            <User className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                            <h2 className="text-base font-bold text-slate-900">Thông tin tài khoản</h2>
                        </div>

                        {/* Full Name - Moved to top */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>Họ và tên</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.fullName
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.fullName}
                                onChange={(e) => updateField("fullName", e.target.value)}
                                placeholder="Ví dụ: Nguyễn Văn A"
                            />
                            {errors.fullName && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.fullName}</span>
                                </div>
                            )}
                        </div>

                        {/* Username - Auto-suggested from full name */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>Tên đăng nhập</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.username
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.username}
                                onChange={(e) => updateField("username", e.target.value)}
                                placeholder="Tự động gợi ý từ họ tên"
                            />
                            {errors.username && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.username}</span>
                                </div>
                            )}
                            {form.username && !errors.username && (
                                <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5" />
                                    <span>Username được gợi ý từ họ tên (có thể chỉnh sửa)</span>
                                </div>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span>Email</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.email
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.email}
                                onChange={(e) => updateField("email", e.target.value)}
                                placeholder="example@company.com"
                            />
                            {errors.email && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.email}</span>
                                </div>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span>Số điện thoại</span>
                            </label>
                            <input
                                type="tel"
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.phone
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.phone}
                                onChange={(e) => updateField("phone", e.target.value)}
                                placeholder="0900000000"
                            />
                            {errors.phone && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.phone}</span>
                                </div>
                            )}
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span>Địa chỉ</span>
                            </label>
                            <textarea
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20 resize-none"
                                value={form.address}
                                onChange={(e) => updateField("address", e.target.value)}
                                placeholder="Địa chỉ nhà"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Thông tin công việc */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                            <Building2 className="h-5 w-5" style={{ color: BRAND_COLOR }} />
                            <h2 className="text-base font-bold text-slate-900">Thông tin công việc</h2>
                        </div>

                        {/* Chi nhánh */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span>Chi nhánh</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.branchId
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.branchId}
                                onChange={(e) => updateField("branchId", e.target.value)}
                                disabled={isCurrentUserManager}
                            >
                                <option value="">-- Chọn chi nhánh --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
                            {errors.branchId && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.branchId}</span>
                                </div>
                            )}
                        </div>

                        {/* Vai trò */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Shield className="h-4 w-4 text-slate-400" />
                                <span>Vai trò</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.roleId
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.roleId}
                                onChange={(e) => updateField("roleId", e.target.value)}
                            >
                                <option value="">-- Chọn vai trò --</option>
                                {filteredRoles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.roleName}
                                    </option>
                                ))}
                            </select>
                            {errors.roleId && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.roleId}</span>
                                </div>
                            )}
                        </div>

                        {/* Số bằng lái - Hiển thị khi chọn vai trò Tài xế */}
                        {(() => {
                            const selectedRole = roles.find(r => String(r.id) === String(form.roleId));
                            const isDriverRole = selectedRole?.roleName?.toUpperCase().includes("DRIVER") ||
                                selectedRole?.roleName?.toLowerCase().includes("tài xế") ||
                                selectedRole?.description?.toLowerCase().includes("tài xế");

                            if (!isDriverRole) return null;

                            return (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <Shield className="h-4 w-4 text-slate-400" />
                                        <span>Số bằng lái xe</span>
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                            errors.licenseNumber
                                                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                                : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                        }`}
                                        value={form.licenseNumber}
                                        onChange={(e) => updateField("licenseNumber", e.target.value)}
                                        placeholder="Ví dụ: 012345678"
                                    />
                                    {errors.licenseNumber && (
                                        <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            <span>{errors.licenseNumber}</span>
                                        </div>
                                    )}
                                    <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5" />
                                        <span>Số bằng lái là bắt buộc đối với tài xế</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Trạng thái */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Info className="h-4 w-4 text-slate-400" />
                                <span>Trạng thái</span>
                            </label>
                            <select
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                value={form.status}
                                onChange={(e) => updateField("status", e.target.value)}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                        </div>

                        {/* Info box */}
                        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3 mt-6">
                            <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                                <Info className="h-4 w-4 text-sky-700" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-slate-900 text-sm mb-1">Lưu ý</div>
                                <div className="text-sm text-slate-700 space-y-1">
                                    <p>• Tài khoản sẽ được tạo và gửi email xác thực</p>
                                    <p>• Nhân viên cần click link trong email để kích hoạt</p>
                                    <p>• Sau khi xác thực, nhân viên sẽ tạo mật khẩu riêng</p>
                                    <p>• Username và email phải là duy nhất</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}