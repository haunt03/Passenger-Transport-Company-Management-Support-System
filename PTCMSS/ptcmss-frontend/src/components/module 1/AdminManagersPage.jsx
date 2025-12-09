import React from "react";
import { useNavigate } from "react-router-dom";
import { createUser, listRoles } from "../../api/users";
import { Save, ArrowLeft, CheckCircle, XCircle, UserPlus, User, Mail, Phone, MapPin, Shield, Lightbulb } from "lucide-react";
import { getCurrentRole, ROLES } from "../../utils/session";

export default function AdminManagersPage() {
  const navigate = useNavigate();

  const [form, setForm] = React.useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    roleId: "",
  });

  const [errors, setErrors] = React.useState({});
  const [generalError, setGeneralError] = React.useState("");

  const [roles, setRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const currentRole = React.useMemo(() => getCurrentRole(), []);

  const filterAssignableRoles = React.useCallback(
    (list) => {
      if (currentRole !== ROLES.MANAGER) return list;
      const deny = new Set(["ADMIN", "MANAGER"]);
      return (list || []).filter((r) => !deny.has((r.roleName || "").toUpperCase()));
    },
    [currentRole]
  );

  React.useEffect(() => {
    (async () => {
      try {
        const rs = await listRoles();
        setRoles(filterAssignableRoles(rs));
      } catch {
        /* ignore */
      }
    })();
  }, [filterAssignableRoles]);

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Vui lòng nhập họ tên";
    if (!form.username.trim()) next.username = "Vui lòng nhập username";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Email không đúng định dạng";
    }
    if (!/^[0-9]{10}$/.test(form.phone || "")) {
      next.phone = "Số điện thoại phải gồm 10 chữ số";
    }
    if (!form.address.trim()) next.address = "Vui lòng nhập địa chỉ";
    if (!form.roleId) next.roleId = "Vui lòng chọn vai trò";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const updateField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
    setGeneralError("");
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setGeneralError("");
    setShowSuccess(false);
    try {
      await createUser({
        fullName: form.fullName,
        username: form.username,
        email: form.email || null,
        phone: form.phone,
        address: form.address,
        roleId: Number(form.roleId),
      });
      setShowSuccess(true);
      setTimeout(() => navigate("/admin/users"), 1300);
    } catch (e) {
      const rawMsg =
        e?.data?.message || e?.response?.data?.message || e?.message || "";
      const msg = rawMsg.toLowerCase();
      if (msg.includes("email") && msg.includes("exist")) {
        setErrors((p) => ({ ...p, email: "Email đã tồn tại" }));
      } else if (msg.includes("phone") && msg.includes("exist")) {
        setErrors((p) => ({ ...p, phone: "Số điện thoại đã tồn tại" }));
      } else if (msg.includes("username") && msg.includes("exist")) {
        setErrors((p) => ({ ...p, username: "Username đã tồn tại" }));
      } else {
        setGeneralError(rawMsg || "Tạo user thất bại");
      }
    } finally {
      setSaving(false);
    }
  };

  const BRAND_COLOR = "#0079BC";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
      {/* SUCCESS TOAST */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-amber-50 to-green-50 border border-info-200 shadow-xl rounded-xl p-4 flex gap-3 items-center min-w-[320px]">
            <div className="h-10 w-10 rounded-full bg-info-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-info-900">Thành công!</div>
              <div className="text-sm text-info-700">Tạo người dùng thành công</div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </button>

          <div className="flex items-start gap-3 flex-1 min-w-[220px]">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <div className="text-xs text-slate-500 leading-none mb-1">
                Quản trị hệ thống
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Tạo tài khoản Manager mới
              </h1>
              <p className="text-xs text-slate-500 mt-1">Thêm Manager mới vào hệ thống</p>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
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
              <div className="font-bold text-red-900 mb-1">Lỗi</div>
              <div className="text-sm text-red-700">{generalError}</div>
            </div>
          </div>
        )}

        {/* FORM */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              <span>Họ tên</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                errors.fullName 
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
              }`}
              value={form.fullName}
              placeholder="Nhập họ tên"
              onChange={(e) => updateField("fullName", e.target.value)}
            />
            {errors.fullName && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>{errors.fullName}</span>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              <span>Tên đăng nhập</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                errors.username 
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
              }`}
              value={form.username}
              placeholder="Nhập tên đăng nhập"
              onChange={(e) => updateField("username", e.target.value)}
            />
            {errors.username && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>{errors.username}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>Email</span>
            </label>
            <input
              type="email"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                errors.email 
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
              }`}
              value={form.email}
              placeholder="Nhập email"
              onChange={(e) => updateField("email", e.target.value)}
            />
            {errors.email && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>Số điện thoại</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-4 py-2.5 text-sm tabular-nums transition-all focus:outline-none focus:ring-2 ${
                errors.phone 
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
              }`}
              value={form.phone}
              placeholder="Nhập số điện thoại (10 chữ số)"
              onChange={(e) => updateField("phone", e.target.value)}
            />
            {errors.phone && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>{errors.phone}</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Địa chỉ</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 resize-none ${
                errors.address 
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200" 
                  : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
              }`}
              value={form.address}
              placeholder="Nhập địa chỉ"
              onChange={(e) => updateField("address", e.target.value)}
            />
            {errors.address && (
              <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                <XCircle size={14} />
                <span>{errors.address}</span>
              </div>
            )}
          </div>

          {/* ROLE */}
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
                <XCircle size={14} />
                <span>{errors.roleId}</span>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900 text-sm mb-1">Thông tin</div>
              <div className="text-xs text-blue-700 leading-relaxed">
                Sau khi tạo, hệ thống sẽ tự động tạo Employee và gửi email xác thực để người dùng thiết lập mật khẩu lần đầu.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
