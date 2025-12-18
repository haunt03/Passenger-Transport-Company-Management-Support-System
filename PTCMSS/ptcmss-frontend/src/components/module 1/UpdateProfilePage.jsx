import React from "react";
import { Upload, Save, XCircle, User, Mail, Phone, MapPin, Shield, CheckCircle, Lock, Eye, EyeOff, Camera } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadAvatar, changePassword } from "../../api/profile";

const cls = (...a) => a.filter(Boolean).join(" ");

function AvatarPreview({ src, name, onPick }) {
  const initials = (name || "?")
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") || "?";
  return (
      <div className="relative group">
        <div className="relative h-32 w-32 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0079BC] via-[#005A8B] to-[#003d5c] flex items-center justify-center text-white text-3xl font-semibold select-none shadow-lg ring-4 ring-white">
          {src ? (
              <img src={src} alt="avatar" className="h-full w-full object-cover" />
          ) : (
              <span className="text-white">{initials}</span>
          )}
        </div>
        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl cursor-pointer">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
            <Camera className="h-5 w-5 text-[#0079BC]" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
        </label>
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
  const [showPasswordSection, setShowPasswordSection] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState(false);
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

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setGeneralError("Kích thước ảnh vượt quá 2MB. Vui lòng chọn ảnh khác.");
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setGeneralError("Định dạng ảnh không hợp lệ. Vui lòng chọn file JPG, PNG hoặc GIF.");
      return;
    }

    setGeneralError("");
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
      if (avatarFile && userId) {
        try {
          await uploadAvatar(userId, avatarFile);
          await new Promise(resolve => setTimeout(resolve, 500));
          window.dispatchEvent(new CustomEvent('avatarUpdated'));
        } catch (avatarErr) {
          console.error("Avatar upload error:", avatarErr);
        }
      }

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
      let errorMessage = "Cập nhật hồ sơ thất bại";

      if (err?.data) {
        if (err.data.message) {
          errorMessage = err.data.message;
        } else if (err.data.error) {
          errorMessage = err.data.error;
        } else if (typeof err.data === 'string') {
          errorMessage = err.data;
        }
      } else if (err?.response?.data) {
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

      // Chuẩn hóa thông báo tiếng Việt cho lỗi mạng/FETCH
      if (errorMessage === "Failed to fetch" || errorMessage === "NetworkError when attempting to fetch resource.") {
        errorMessage = "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.";
      }

      if (errorMessage.includes("Phone already exists") || errorMessage.includes("phone") && errorMessage.includes("exists")) {
        errorMessage = "Số điện thoại đã được sử dụng bởi người dùng khác.";
      } else if (errorMessage.includes("Email already exists") || errorMessage.includes("email") && errorMessage.includes("exists")) {
        errorMessage = "Email đã được sử dụng bởi người dùng khác.";
      } else if (errorMessage.includes("duplicate") && errorMessage.includes("phone")) {
        errorMessage = "Số điện thoại đã được sử dụng bởi người dùng khác.";
      }

      setGeneralError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("Mật khẩu mới không được trùng mật khẩu hiện tại");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(userId, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      setPasswordSuccess(true);
      setPasswordError(""); // Clear any previous errors
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);

      setTimeout(() => {
        setPasswordSuccess(false);
      }, 4000);
    } catch (err) {
      console.error("Change password error:", err);
      let errorMessage = "Đổi mật khẩu thất bại";

      if (err?.data) {
        if (err.data.message) {
          errorMessage = err.data.message;
        } else if (err.data.error) {
          errorMessage = err.data.error;
        } else if (typeof err.data === 'string') {
          errorMessage = err.data;
        }
      } else if (err?.response?.data) {
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

      setPasswordError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const BRAND_COLOR = "#0079BC";

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        {/* Success Toast - Profile Update */}
        {showSuccess && (
            <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-white border border-green-200 shadow-xl rounded-2xl p-4 flex gap-3 items-center min-w-[320px] backdrop-blur-sm">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900 text-sm">Thành công!</div>
                  <div className="text-xs text-green-700">Cập nhật hồ sơ thành công</div>
                </div>
              </div>
            </div>
        )}

        {/* Success Toast - Password Change */}
        {passwordSuccess && (
            <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-white border border-green-200 shadow-xl rounded-2xl p-4 flex gap-3 items-center min-w-[320px] backdrop-blur-sm">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900 text-sm">Thành công!</div>
                  <div className="text-xs text-green-700">Đổi mật khẩu thành công</div>
                </div>
              </div>
            </div>
        )}

        {/* Error Toast - Password Change */}
        {passwordError && !showPasswordSection && (
            <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-white border border-red-200 shadow-xl rounded-2xl p-4 flex gap-3 items-center min-w-[320px] backdrop-blur-sm">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="text-red-600" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-900 text-sm">Lỗi</div>
                  <div className="text-xs text-red-700">{passwordError}</div>
                </div>
                <button
                    onClick={() => setPasswordError("")}
                    className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hồ sơ cá nhân</h1>
                <p className="text-sm text-slate-500 mt-1.5">Quản lý thông tin và cài đặt tài khoản của bạn</p>
              </div>
              {loading && (
                  <div className="text-xs text-slate-500 px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-[#0079BC] border-t-transparent rounded-full"></div>
                    <span>Đang tải...</span>
                  </div>
              )}
              <button
                  onClick={onSave}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_COLOR }}
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Error Message */}
            {generalError && (
                <div className="bg-white border border-red-200 rounded-2xl p-4 flex gap-3 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <XCircle className="text-red-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 text-sm mb-1">Lỗi</div>
                    <div className="text-sm text-red-700">{generalError}</div>
                  </div>
                </div>
            )}

            {/* Avatar Section */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <AvatarPreview src={authImgSrc || avatarPreview} name={fullName} onPick={onPickAvatar} />
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{fullName || "Chưa có tên"}</h3>
                  <p className="text-sm text-slate-500 mb-4">{email || "Chưa có email"}</p>
                  <p className="text-xs text-slate-400">Nhấp vào ảnh để thay đổi ảnh đại diện</p>
                  <p className="text-xs text-slate-400 mt-1">JPG/PNG, tối đa 2MB</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="h-4 w-4 text-[#0079BC]" />
                </div>
                <span>Thông tin cá nhân</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Họ và tên
                    <span className="text-slate-400 font-normal ml-1">(chỉ đọc)</span>
                  </label>
                  <input
                      value={fullName}
                      disabled
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "")); setErrors((p) => ({ ...p, phone: undefined })); }}
                        className={`w-full border rounded-xl px-4 py-3 pl-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 ${errors.phone ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-[#0079BC]/50"
                        }`}
                        placeholder="0901234567"
                    />
                  </div>
                  {errors.phone && (
                      <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        <span>{errors.phone}</span>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-[#0079BC]" />
                </div>
                <span>Thông tin liên hệ</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Email
                    <span className="text-slate-400 font-normal ml-1">(chỉ đọc)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={email}
                        disabled
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Địa chỉ
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 focus:border-[#0079BC]/50"
                        placeholder="Nhập địa chỉ"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-[#0079BC]" />
                </div>
                <span>Thông tin tài khoản</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Vai trò
                  </label>
                  <div className="relative">
                    <input
                        value={roleName || ""}
                        disabled
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    {roleName && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Trạng thái
                  </label>
                  <div className="relative">
                    <input
                        value={status || ""}
                        disabled
                        className={`w-full border rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-600 cursor-not-allowed ${status === "ACTIVE" ? "border-green-200" : "border-slate-200"
                        }`}
                    />
                    {status === "ACTIVE" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-green-600 font-medium">Hoạt động</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-[#0079BC]" />
                  </div>
                  <span>Đổi mật khẩu</span>
                </h3>
                <button
                    onClick={() => {
                      setShowPasswordSection(!showPasswordSection);
                      setPasswordError("");
                      setPasswordSuccess(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-xs font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-[#0079BC]/50 transition-colors text-slate-700"
                >
                  {showPasswordSection ? "Ẩn" : "Hiển thị"}
                </button>
              </div>

              {showPasswordSection && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {passwordError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 items-center">
                          <XCircle className="text-red-600 flex-shrink-0" size={18} />
                          <div className="text-sm text-red-800 flex-1">{passwordError}</div>
                          <button
                              onClick={() => setPasswordError("")}
                              className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              setPasswordError("");
                            }}
                            autoComplete="off"
                            autoCapitalize="none"
                            inputMode="text"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 focus:border-[#0079BC]/50"
                            placeholder="Nhập mật khẩu hiện tại"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordError("");
                            }}
                            autoComplete="new-password"
                            autoCapitalize="none"
                            inputMode="text"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 focus:border-[#0079BC]/50"
                            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setPasswordError("");
                            }}
                            autoComplete="new-password"
                            autoCapitalize="none"
                            inputMode="text"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0079BC]/20 focus:border-[#0079BC]/50"
                            placeholder="Nhập lại mật khẩu mới"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                        onClick={onChangePassword}
                        disabled={changingPassword}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                        style={{ backgroundColor: BRAND_COLOR }}
                    >
                      <Lock className="h-4 w-4" />
                      <span>{changingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}</span>
                    </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
