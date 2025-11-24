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
    if (!fullName.trim()) next.fullName = "Vui lòng nhập họ tên";
    if (phone && !/^[0-9]{10}$/.test(phone)) next.phone = "Số điện thoại phải gồm 10 chữ số";
    setErrors(next);
    setGeneralError("");
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Upload avatar if changed
      if (avatarFile && userId) {
        await uploadAvatar(userId, avatarFile);
      }

      // Only update profile if roleId and status are available
      if (roleId && status) {
        await updateMyProfile({
          fullName,
          phone,
          email: email || null,
          address,
          roleId,
          status
        });
      }

      setGeneralError("");
      alert("Cập nhật hồ sơ thành công");

      // Reload profile to get updated data
      const p = await getMyProfile();
      setFullName(p?.fullName || "");
      setPhone(p?.phone || "");
      setEmail(p?.email || "");
      setAddress(p?.address || "");
      setRoleName(p?.roleName || "");
      setRoleId(p?.roleId || null);
      setStatus(p?.status || "");
      setAvatarPreview(resolveImg(p?.imgUrl || p?.avatarUrl));
      setAvatarFile(null);
    } catch (err) {
      console.error("Update profile error:", err);
      setGeneralError("Cập nhật hồ sơ thất bại: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const BRAND_COLOR = "#0079BC";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: BRAND_COLOR }}>
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Hồ sơ cá nhân</h1>
            <p className="text-xs text-slate-500">Quản lý thông tin tài khoản của bạn</p>
          </div>
        </div>
        {loading && (
          <div className="ml-auto text-xs text-slate-500 px-3 py-1.5 bg-slate-100 rounded-md">
            Đang tải…
          </div>
        )}
        <button 
          onClick={onSave} 
          disabled={saving} 
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all active:scale-[0.98]"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <Save className="h-4 w-4" /> 
          <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
        </button>
      </div>

      {generalError && (
        <div className="max-w-3xl mb-5 bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-rose-700 flex items-start gap-2.5 shadow-sm">
          <XCircle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="max-w-3xl space-y-5">
        {/* Avatar Section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-start gap-6">
            <AvatarPreview src={authImgSrc || avatarPreview} name={fullName} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Ảnh đại diện</h3>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-[#0079BC]/50 cursor-pointer transition-all">
                <Upload className="h-4 w-4" style={{ color: BRAND_COLOR }} /> 
                <span>Chọn ảnh</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
              </label>
              <div className="text-xs text-slate-500 mt-2">Khuyến nghị ảnh vuông (1:1), JPG/PNG, tối đa 2MB.</div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: BRAND_COLOR }} />
            <span>Thông tin cá nhân</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Họ và tên *</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 ${
                  errors.fullName ? "border-rose-300 focus:border-rose-400" : "border-slate-300 focus:border-[#0079BC]/50"
                }`}
                placeholder="Nhập họ và tên"
              />
              {errors.fullName && <div className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                <span>{errors.fullName}</span>
              </div>}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Số điện thoại</span>
              </label>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "")); setErrors((p) => ({ ...p, phone: undefined })); }}
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 ${
                  errors.phone ? "border-rose-300 focus:border-rose-400" : "border-slate-300 focus:border-[#0079BC]/50"
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
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
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: BRAND_COLOR }} />
            <span>Thông tin tài khoản</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
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
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed ${
                    status === "ACTIVE" ? "border-green-200" : "border-slate-300"
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
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                <span>ID người dùng</span>
              </label>
              <input 
                value={userId || ""} 
                disabled 
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-mono" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
