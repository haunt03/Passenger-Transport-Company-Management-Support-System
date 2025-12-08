import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UserPlus, User, Mail, Phone, MapPin, Shield, Building2, Info, AlertCircle, Loader2 } from "lucide-react";
import { createUser, listRoles } from "../../api/users";
import { getAllBranchesForSelection } from "../../api/branches";
import { listEmployeesByRole } from "../../api/employees";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

const BRAND_COLOR = "#0079BC";

const ROLE_PRIORITY = {
  [ROLES.ADMIN]: 100,
  [ROLES.MANAGER]: 90,
  [ROLES.CONSULTANT]: 80,
  [ROLES.COORDINATOR]: 70,
  COORDINATOR: 70,
  [ROLES.ACCOUNTANT]: 60,
  [ROLES.DRIVER]: 50,
};

const normalizeRoleName = (name) => String(name || "").trim().toUpperCase();

const generateUsernameFromName = (fullName) => {
  if (!fullName) return "";
  const from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  const to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
  let result = fullName.toLowerCase().trim();
  for (let i = 0; i < from.length; i++) {
    result = result.replace(new RegExp(from[i], "g"), to[i]);
  }
  result = result.replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
  return result;
};

export default function CreateUserPage() {
  const navigate = useNavigate();
  const currentRole = React.useMemo(() => getCurrentRole(), []);
  const currentUserId = React.useMemo(() => getStoredUserId(), []);
  const isManager = currentRole === ROLES.MANAGER;

  const [form, setForm] = React.useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    roleId: "",
    branchId: "",
  });
  const [roles, setRoles] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [generalError, setGeneralError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const [managerBranchInfo, setManagerBranchInfo] = React.useState({ id: null, name: "" });
  const [managerBranchLoading, setManagerBranchLoading] = React.useState(isManager);
  const [managerBranchError, setManagerBranchError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rs = await listRoles();
        const list = Array.isArray(rs?.data)
          ? rs.data
          : Array.isArray(rs?.items)
            ? rs.items
            : Array.isArray(rs?.content)
              ? rs.content
              : Array.isArray(rs)
                ? rs
                : [];
        if (!mounted) return;
        setRoles(list);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load roles", error);
        setRoles([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rs = await getAllBranchesForSelection();
        console.log("Branches API response:", rs);
        const list = Array.isArray(rs?.data)
          ? rs.data
          : Array.isArray(rs)
            ? rs
            : [];
        console.log("Branches list:", list);
        if (mounted) setBranches(list);
      } catch (error) {
        console.error("Failed to load branches", error);
        if (mounted) setBranches([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isManager || !currentUserId) {
      setManagerBranchLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setManagerBranchLoading(true);
      setManagerBranchError("");
      try {
        const managers = await listEmployeesByRole("Manager");
        if (cancelled) return;
        const mine = (managers || []).find((emp) => String(emp.userId) === String(currentUserId));
        if (mine?.branchId) {
          setManagerBranchInfo({ id: mine.branchId, name: mine.branchName || "" });
          setForm((prev) => ({ ...prev, branchId: String(mine.branchId) }));
        } else {
          setManagerBranchInfo({ id: null, name: "" });
          setManagerBranchError("Không xác định được chi nhánh của bạn. Liên hệ Admin để cập nhật thông tin.");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load manager branch", error);
        setManagerBranchInfo({ id: null, name: "" });
        setManagerBranchError("Không tải được thông tin chi nhánh. Thử lại sau.");
      } finally {
        if (!cancelled) setManagerBranchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isManager, currentUserId]);

  const filteredRoles = React.useMemo(() => {
    if (!roles.length) return [];
    if (!isManager) return roles;
    const managerPriority = ROLE_PRIORITY[ROLES.MANAGER] || 90;
    return roles.filter((role) => {
      const normalized = normalizeRoleName(role.roleName || role.name);
      const priority = ROLE_PRIORITY[normalized];
      return priority && priority < managerPriority;
    });
  }, [roles, isManager]);

  const branchOptions = React.useMemo(() => {
    if (isManager) {
      if (!managerBranchInfo.id) return [];
      return [{ id: managerBranchInfo.id, branchName: managerBranchInfo.name || `#${managerBranchInfo.id}` }];
    }
    return branches;
  }, [isManager, managerBranchInfo, branches]);

  const canSubmit = !saving && (!isManager || (managerBranchInfo.id && !managerBranchLoading));

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "fullName") {
        const suggestion = generateUsernameFromName(value);
        const prevSuggestion = generateUsernameFromName(prev.fullName);
        if (!prev.username || prev.username === prevSuggestion) {
          next.username = suggestion;
        }
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError("");
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Họ tên là bắt buộc";
    if (!form.username.trim() || form.username.trim().length < 4) next.username = "Username phải có tối thiểu 4 ký tự";
    if (!form.email.trim()) {
      next.email = "Email là bắt buộc";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Email không hợp lệ";
    }
    const normalizedPhone = form.phone.trim();
    if (!normalizedPhone) {
      next.phone = "Số điện thoại là bắt buộc";
    } else if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      next.phone = "Số điện thoại phải gồm 10 chữ số";
    }
    if (!form.roleId) next.roleId = "Vui lòng chọn vai trò";
    if (!form.branchId) next.branchId = "Vui lòng chọn chi nhánh";
    if (isManager && managerBranchInfo.id && String(form.branchId) !== String(managerBranchInfo.id)) {
      next.branchId = "Manager chỉ được tạo tài khoản trong chi nhánh của mình";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setGeneralError("");
    setSuccess(false);
    try {
      await createUser({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        roleId: Number(form.roleId),
        branchId: Number(form.branchId),
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/users"), 1500);
    } catch (error) {
      const message =
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo tài khoản. Vui lòng thử lại.";
      setGeneralError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-xl rounded-xl p-4 flex gap-3 items-center min-w-[320px]">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <UserPlus className="text-green-600" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-green-800 text-sm">Đã tạo tài khoản!</div>
              <div className="text-xs text-green-700">Hệ thống đã gửi email xác thực cho nhân viên.</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-5">
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
              <h1 className="text-xl font-bold text-slate-900">Tạo tài khoản mới</h1>
              <p className="text-xs text-slate-500 mt-0.5">Sử dụng chung cho Admin và Manager</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? "Đang lưu..." : "Lưu"}</span>
          </button>
        </div>

        {isManager && (
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-sky-700" />
            </div>
            <div className="flex-1 text-sm text-sky-800">
              {managerBranchLoading
                ? "Đang xác định chi nhánh phụ trách..."
                : managerBranchInfo.id
                  ? `Manager chỉ được tạo tài khoản thuộc chi nhánh ${managerBranchInfo.name || "#" + managerBranchInfo.id}.`
                  : managerBranchError || "Không xác định được chi nhánh của bạn. Liên hệ Admin trước khi tạo tài khoản."}
            </div>
          </div>
        )}

        {generalError && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 flex gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-red-800 text-sm mb-1">Không thể tạo</div>
              <div className="text-sm text-red-700">{generalError}</div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5">
            {[
              {
                field: "fullName",
                label: "Họ và tên",
                icon: <User className="h-4 w-4 text-slate-400" />,
                required: true,
                placeholder: "Nguyễn Văn A",
              },
              {
                field: "username",
                label: "Tên đăng nhập",
                icon: <User className="h-4 w-4 text-slate-400" />,
                required: true,
                placeholder: "nguyen.van.a",
              },
              {
                field: "email",
                label: "Email",
                icon: <Mail className="h-4 w-4 text-slate-400" />,
                required: true,
                placeholder: "example@domain.com",
                type: "email",
              },
              {
                field: "phone",
                label: "Số điện thoại",
                icon: <Phone className="h-4 w-4 text-slate-400" />,
                required: true,
                placeholder: "0900000000",
                type: "tel",
              },
            ].map(({ field, label, icon, required, placeholder, type = "text" }) => (
              <div key={field} className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  {icon}
                  <span>{label}</span>
                  {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={placeholder}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${errors[field]
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                    }`}
                />
                {errors[field] && (
                  <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{errors[field]}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Địa chỉ</span>
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                rows={3}
                placeholder="Số nhà, đường, phường/xã..."
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Chi nhánh</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={form.branchId}
                onChange={(e) => updateField("branchId", e.target.value)}
                disabled={isManager}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${errors.branchId
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                  } ${isManager ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchName || branch.name || `Chi nhánh #${branch.id}`}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span>Vai trò</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.roleId}
                  onChange={(e) => updateField("roleId", e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${errors.roleId
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                    }`}
                >
                  <option value="">-- Chọn vai trò --</option>
                  {filteredRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.roleName || role.name}
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

            </div>
          </div>

          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-sky-700" />
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>Sau khi tạo, hệ thống sẽ tự tạo Employee và gửi email để thiết lập mật khẩu lần đầu.</p>
              <p>Thông tin đăng nhập được gửi tới email của nhân viên.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

