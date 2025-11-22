import React from "react";
import { useNavigate } from "react-router-dom";
import { createUser, listRoles } from "../../api/users";
import { Save, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { getCurrentRole, ROLES } from "../../utils/session";

export default function AdminCreateUserPage() {
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = React.useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    roleId: "",
  });

  // Error states
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

  // Load roles
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

  // Validate logic
  const validate = () => {
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!form.username.trim()) newErrors.username = "Vui lòng nhập username";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Email không đúng định dạng";

    if (!/^[0-9]{10}$/.test(form.phone || ""))
      newErrors.phone = "Số điện thoại phải gồm 10 chữ số";

    if (!form.address.trim()) newErrors.address = "Vui lòng nhập địa chỉ";
    if (!form.roleId) newErrors.roleId = "Vui lòng chọn vai trò";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError("");
  };

  // Submit create user
  const onSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setGeneralError("");
    setShowSuccess(false);

    try {
      const res = await createUser({
        fullName: form.fullName,
        username: form.username,
        email: form.email || null,
        phone: form.phone,
        address: form.address,
        roleId: Number(form.roleId),
      });

      console.log("Create user response:", res);

      // Reaching here means the API responded with 2xx and success wrapper
      setShowSuccess(true);
      setTimeout(() => navigate("/admin/users"), 1300);
    } catch (e) {
      const rawMsg =
          e?.data?.message ||
          e?.response?.data?.message ||
          e?.message ||
          "";
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

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
        {/* SUCCESS TOAST */}
        {showSuccess && (
            <div className="fixed top-4 right-4 z-50 animate-slide-in">
              <div className="bg-green-50 border border-green-200 shadow-lg rounded-xl p-4 flex gap-3 items-center">
                <CheckCircle className="text-green-600" size={24} />
                <div>
                  <div className="font-semibold text-green-800">Thành công!</div>
                  <div className="text-sm text-green-700">Tạo người dùng thành công</div>
                </div>
              </div>
            </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <button
              onClick={() => navigate(-1)}
              className="rounded-md border px-2 py-1 bg-white text-sm shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold">Tạo tài khoản mới</h1>

          <button
              onClick={onSave}
              disabled={saving}
              className="ml-auto flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>

        {/* General error */}
        {generalError && (
            <div className="max-w-2xl mb-4 bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3">
              <XCircle className="text-red-600 mt-0.5" size={20} />
              <div>
                <div className="font-semibold text-red-800">Lỗi</div>
                <div className="text-sm text-red-700">{generalError}</div>
              </div>
            </div>
        )}

        {/* FORM */}
        <div className="rounded-xl border bg-white shadow-sm p-4 grid gap-4 max-w-2xl">
          {[
            { key: "fullName", label: "Họ tên", required: true },
            { key: "username", label: "Username", required: true },
            { key: "email", label: "Email" },
            { key: "phone", label: "Số điện thoại", required: true },
            { key: "address", label: "Địa chỉ", required: true },
          ].map((f) => (
              <div key={f.key}>
                <div className="text-xs text-slate-600 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </div>

                <input
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 ${
                        errors[f.key] ? "border-red-400" : "border-slate-300"
                    }`}
                    value={form[f.key]}
                    placeholder={`Nhập ${f.label.toLowerCase()}`}
                    onChange={(e) => updateField(f.key, e.target.value)}
                />

                {errors[f.key] && (
                    <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <XCircle size={12} />
                      {errors[f.key]}
                    </div>
                )}
              </div>
          ))}

          {/* ROLE */}
          <div>
            <div className="text-xs text-slate-600 mb-1">
              Vai trò <span className="text-red-500">*</span>
            </div>
            <select
                className={`w-full border rounded-md px-3 py-2 text-sm ${
                    errors.roleId ? "border-red-400" : "border-slate-300"
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
                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <XCircle size={12} />
                  {errors.roleId}
                </div>
            )}
          </div>

          <div className="text-[12px] text-slate-500 bg-blue-50 border border-blue-200 rounded p-3">
            💡 Sau khi tạo, hệ thống sẽ gửi email xác thực để người dùng thiết lập mật khẩu lần đầu.
          </div>
        </div>
      </div>
  );
}