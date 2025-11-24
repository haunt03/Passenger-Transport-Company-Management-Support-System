import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createEmployee } from "../../api/employees";
import { listBranches } from "../../api/branches";
import { listRoles } from "../../api/users";
import { Save, ArrowLeft, CheckCircle, XCircle, UserPlus, User, Building2, Shield, Info, Lightbulb, AlertCircle } from "lucide-react";

export default function CreateEmployeePage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Nhận userId từ state (khi chuyển từ trang tạo user)
    const prefilledUserId = location.state?.userId;
    const prefilledUserName = location.state?.userName;

    const [form, setForm] = React.useState({
        userId: prefilledUserId || "",
        branchId: "",
        roleId: "",
        status: prefilledUserId ? "INACTIVE" : "ACTIVE",
    });

    const [errors, setErrors] = React.useState({});
    const [generalError, setGeneralError] = React.useState("");
    const [branches, setBranches] = React.useState([]);
    const [roles, setRoles] = React.useState([]);
    const [saving, setSaving] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);

    // Load branches và roles
    React.useEffect(() => {
        (async () => {
            try {
                const [branchData, roleData] = await Promise.all([
                    listBranches({ size: 100 }),
                    listRoles(),
                ]);

                console.log("Branch data:", branchData);
                console.log("Role data:", roleData);

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
            }
        })();
    }, []);

    const validate = () => {
        const newErrors = {};
        const parsedUserId = Number(form.userId);
        const parsedBranchId = Number(form.branchId);
        const parsedRoleId = Number(form.roleId);

        if (!form.userId) {
            newErrors.userId = "Vui lòng chọn user";
        } else if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
            newErrors.userId = "User ID không hợp lệ";
        }

        if (!form.branchId) {
            newErrors.branchId = "Vui lòng chọn chi nhánh";
        } else if (!Number.isInteger(parsedBranchId) || parsedBranchId <= 0) {
            newErrors.branchId = "Chi nhánh không hợp lệ";
        }

        if (!form.roleId) {
            newErrors.roleId = "Vui lòng chọn vai trò";
        } else if (!Number.isInteger(parsedRoleId) || parsedRoleId <= 0) {
            newErrors.roleId = "Vai trò không hợp lệ";
        }

        setErrors(newErrors);
        return {
            valid: Object.keys(newErrors).length === 0,
            parsed: { userId: parsedUserId, branchId: parsedBranchId, roleId: parsedRoleId },
        };
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setGeneralError("");
    };

    const onSave = async () => {
        const { valid, parsed } = validate();
        if (!valid) return;

        setSaving(true);
        setGeneralError("");
        setShowSuccess(false);

        try {
            const requestData = {
                userId: parsed.userId,
                branchId: parsed.branchId,
                roleId: parsed.roleId,
                status: form.status,
            };
            console.log("Creating employee with data:", requestData);

            const response = await createEmployee(requestData);
            console.log("Create employee response:", response);

            setShowSuccess(true);
            setTimeout(() => navigate("/admin/employees"), 1300);
        } catch (error) {
            console.error("Create employee error:", error);
            const msg = error?.data?.message || error?.response?.data?.message || error?.message || "Tạo nhân viên thất bại";
            setGeneralError(msg);
        } finally {
            setSaving(false);
        }
    };

    const BRAND_COLOR = "#0079BC";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
            {/* SUCCESS TOAST */}
            {showSuccess && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-xl rounded-xl p-4 flex gap-3 items-center min-w-[320px]">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="text-green-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-green-800 text-sm">Thành công!</div>
                            <div className="text-xs text-green-700">Tạo nhân viên thành công</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-5">
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
                            <p className="text-xs text-slate-500 mt-0.5">Thêm nhân viên mới vào hệ thống</p>
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

                {/* FORM */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-6">
                    {/* Info banner for prefilled user */}
                    {prefilledUserName && (
                        <div className="bg-gradient-to-r from-[#0079BC]/10 to-sky-50 border border-[#0079BC]/20 rounded-xl p-4 flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[#0079BC]/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4" style={{ color: BRAND_COLOR }} />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-slate-900 text-sm mb-1">Đang tạo nhân viên cho</div>
                                <div className="text-sm text-slate-700">
                                    <span className="font-bold" style={{ color: BRAND_COLOR }}>{prefilledUserName}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User ID - Ẩn khi đã có prefilled */}
                    {!prefilledUserId && (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>User ID</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                                    errors.userId
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                        : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                                }`}
                                value={form.userId}
                                onChange={(e) => updateField("userId", e.target.value)}
                                placeholder="Nhập ID của user đã tạo"
                            />
                            {errors.userId && (
                                <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{errors.userId}</span>
                                </div>
                            )}
                        </div>
                    )}

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
                            {roles.map((r) => (
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

                    {/* Trạng thái - Chỉ hiển thị khi không có prefilled */}
                    {!prefilledUserId && (
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
                    )}

                    {/* Info message for prefilled status */}
                    {prefilledUserId && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Info className="h-4 w-4 text-amber-700" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-amber-800 text-sm mb-1">Lưu ý về trạng thái</div>
                                <div className="text-sm text-amber-700">
                                    Trạng thái sẽ được gán cứng là <span className="font-bold">INACTIVE</span> cho nhân viên mới
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Help text */}
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="h-4 w-4 text-sky-700" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-sm mb-1">Thông tin</div>
                            <div className="text-sm text-slate-700">
                                Nhân viên sẽ được gán vào chi nhánh và vai trò đã chọn. Sau khi tạo, nhân viên có thể đăng nhập và sử dụng hệ thống.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
