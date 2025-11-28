import React from "react";
import { Upload, Save, XCircle, User, Mail, Phone, MapPin, Shield, CheckCircle } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadAvatar } from "../../api/profile";

const cls = (...a) => a.filter(Boolean).join(" ");

function AvatarPreview({ src, name }) {
  const initials = (name || "?")
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") || "?";
  return (
      <div className="relative h-24 w-24 rounded-xl overflow-hidden border-2 border-slate-200 bg-gradient-to-br from-[#0079BC] to-[#005A8B] flex items-center justify-center text-white text-2xl font-bold select-none shadow-lg">
        {src ? (
            <img src={src} alt="avatar" className="h-full w-full object-cover" />
        ) : (
            <span className="text-white">{initials}</span>
        )}
      </div>
  );
}

const getCookie = (name) => {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  } catch { }
  return "";
};

export default function UpdateProfilePage() {
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [roleName, setRoleName] = React.useState("");
  const [roleId, setRoleId] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState("");
  const [authImgSrc, setAuthImgSrc] = React.useState(null);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [generalError, setGeneralError] = React.useState("");
  const [showSuccess, setShowSuccess] = React.useState(false);
  const userId = getCookie("userId") || localStorage.getItem("userId");

  const apiBase = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
  const resolveImg = (s) => {
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    return `${apiBase}${s.startsWith("/") ? "" : "/"}${s}`;
  };

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getMyProfile();
        setFullName(p?.fullName || "");
        setPhone(p?.phone || "");
        setEmail(p?.email || "");
        setAddress(p?.address || "");
        setRoleName(p?.roleName || "");
        setRoleId(p?.roleId || null);
        setStatus(p?.status || "");
        setAvatarPreview(resolveImg(p?.imgUrl || p?.avatarUrl));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPickAvatar = (file) => {
    if (!file) return;

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      setGeneralError("Kích thước ảnh vượt quá 2MB. Vui lòng chọn ảnh khác có kích thước nhỏ hơn.");
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setGeneralError("Định dạng ảnh không hợp lệ. Vui lòng chọn file JPG, PNG hoặc GIF.");
      return;
    }

    setGeneralError(""); // Clear any previous errors
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    let objUrl = null;
    (async () => {
      try {
        if (!avatarPreview || /^data:|^blob:/i.test(avatarPreview)) {
          setAuthImgSrc(null);
          return;
        }
        const token = localStorage.getItem("access_token") || "";
        const resp = await fetch(avatarPreview, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (!resp.ok) {
          setAuthImgSrc(null);
          return;
        }
        const blob = await resp.blob();
        objUrl = URL.createObjectURL(blob);
        setAuthImgSrc(objUrl);
      } catch {
        setAuthImgSrc(null);
      }
    })();
    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [avatarPreview]);

  const validate = () => {
    const next = {};
    if (phone && !/^[0-9]{10}$/.test(phone)) next.phone = "Số điện thoại phải gồm 10 chữ số";
    setErrors(next);
    setGeneralError("");
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setGeneralError("");
    setShowSuccess(false);

    try {
      // Upload avatar if changed
      if (avatarFile && userId) {
        try {
          await uploadAvatar(userId, avatarFile);
          console.log("Avatar uploaded successfully, triggering header update");

          // Small delay to ensure backend has processed the upload
          await new Promise(resolve => setTimeout(resolve, 500));

          // Trigger avatar update in header by dispatching custom event
          window.dispatchEvent(new CustomEvent('avatarUpdated'));
          console.log("Avatar update event dispatched");
        } catch (avatarErr) {
          console.error("Avatar upload error:", avatarErr);
          // Không block nếu upload avatar fail, chỉ log
        }
      }

      // Update profile - chỉ gửi phone và address (theo UpdateProfileRequest)
      if (userId) {
        const updateData = {
          phone: phone || null,
          address: address || null,
        };

        await updateMyProfile(updateData);
      } else {
        throw new Error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
      }

      setGeneralError("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reload profile to get updated data
      const p = await getMyProfile();
      setFullName(p?.fullName || "");
      setPhone(p?.phone || "");
      setEmail(p?.email || "");
      setAddress(p?.address || "");
      setRoleName(p?.roleName || "");
      setRoleId(p?.roleId || null);
      setStatus(p?.status || "");
      setAvatarPreview(resolveImg(p?.imgUrl || p?.avatarUrl || p?.avatar));
      setAvatarFile(null);
    } catch (err) {
      console.error("Update profile error:", err);

      // Parse error message từ nhiều nguồn
      let errorMessage = "Cập nhật hồ sơ thất bại";

      if (err?.data) {
        // Error từ apiFetch (http.js)
        if (err.data.message) {
          errorMessage = err.data.message;
        } else if (err.data.error) {
          errorMessage = err.data.error;
        } else if (typeof err.data === 'string') {
          errorMessage = err.data;
        }
      } else if (err?.response?.data) {
        // Error từ axios response
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Cải thiện message cho user-friendly hơn
      if (errorMessage.includes("Phone already exists") || errorMessage.includes("phone") && errorMessage.includes("exists")) {
        errorMessage = "Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.";
      } else if (errorMessage.includes("Email already exists") || errorMessage.includes("email") && errorMessage.includes("exists")) {
        errorMessage = "Email đã được sử dụng bởi người dùng khác. Vui lòng sử dụng email khác.";
      } else if (errorMessage.includes("duplicate") && errorMessage.includes("phone")) {
        errorMessage = "Số điện thoại đã được sử dụng bởi người dùng khác. Vui lòng sử dụng số điện thoại khác.";
      }

      setGeneralError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const BRAND_COLOR = "#EDC531";

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
                  <div className="text-xs text-green-700">Cập nhật hồ sơ thành công</div>
                </div>
              </div>
            </div>
        )}

        {/* Header */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                <User className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
                <p className="text-xs text-slate-500 mt-0.5">Quản lý thông tin tài khoản của bạn</p>
              </div>
            </div>
            {loading && (
                <div className="text-xs text-slate-500 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Đang tải...</span>
                </div>
            )}
            <button
                onClick={onSave}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                style={{ backgroundColor: BRAND_COLOR }}
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-5">
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
          {/* Avatar Section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
            <div className="flex items-start gap-6">
              <AvatarPreview src={authImgSrc || avatarPreview} name={fullName} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Ảnh đại diện</h3>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-[#0079BC]/50 cursor-pointer transition-all active:scale-[0.98]">
                  <Upload className="h-4 w-4" style={{ color: BRAND_COLOR }} />
                  <span>Chọn ảnh</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
                </label>
                <div className="text-xs text-slate-500 mt-2">Khuyến nghị ảnh vuông (1:1), JPG/PNG, tối đa 2MB</div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: BRAND_COLOR }} />
              <span>Thông tin cá nhân</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Họ và tên</span>
                  <span className="text-slate-400 text-[10px]">(không thể sửa)</span>
                </label>
                <input
                    value={fullName}
                    disabled
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Số điện thoại</span>
                </label>
                <input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "")); setErrors((p) => ({ ...p, phone: undefined })); }}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 ${errors.phone ? "border-rose-300 focus:border-rose-400" : "border-slate-300 focus:border-[#0079BC]/50"
                    }`}
                    placeholder="0901234567"
                />
                {errors.phone && <div className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  <span>{errors.phone}</span>
                </div>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" style={{ color: BRAND_COLOR }} />
              <span>Thông tin liên hệ</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Email</span>
                  <span className="text-slate-400 text-[10px]">(không thể sửa)</span>
                </label>
                <input
                    value={email}
                    disabled
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Địa chỉ</span>
                </label>
                <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 focus:border-[#0079BC]/50"
                    placeholder="Nhập địa chỉ"
                />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: BRAND_COLOR }} />
              <span>Thông tin tài khoản</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>Vai trò</span>
                </label>
                <div className="relative">
                  <input
                      value={roleName || ""}
                      disabled
                      className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                  {roleName && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <span>Trạng thái</span>
                </label>
                <div className="relative">
                  <input
                      value={status || ""}
                      disabled
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed ${status === "ACTIVE" ? "border-green-200" : "border-slate-300"
                      }`}
                  />
                  {status === "ACTIVE" && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-green-600 font-medium">Hoạt động</span>
                      </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
  );
}