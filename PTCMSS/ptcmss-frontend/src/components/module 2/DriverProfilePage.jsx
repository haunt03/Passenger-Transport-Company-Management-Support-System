// src/components/driver/DriverProfilePage.jsx
import React from "react";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Activity,
  Car,
  Save,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { getCookie } from "../../utils/cookies";
import {
  getDriverProfileByUser,
  updateDriverProfile,
  uploadDriverAvatar,
} from "../../api/drivers";
import { getMyProfile } from "../../api/profile";
import { validatePhone, validateRequired } from "../../utils/validation";
import UserAvatar from "../../components/common/UserAvatar";
import { Upload, Camera } from "lucide-react";

/* ===========================================
   Small Helpers
=========================================== */
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtNum = (n) =>
    new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

function daysUntil(dateStr) {
  if (!dateStr) return NaN;
  const now = new Date();
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function initialsOf(name) {
  return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");
}

/* ===========================================
   Toast System
=========================================== */
function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = (msg, kind = "info", ttl = 2200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((a) => [...a, { id, msg, kind }]);
    setTimeout(() => setToasts((a) => a.filter((t) => t.id !== id)), ttl);
  };
  return { toasts, push };
}

function Toasts({ toasts }) {
  return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
            <div
                key={t.id}
                className={cls(
                    "rounded-lg px-3 py-2 text-sm border shadow-lg bg-white",
                    t.kind === "success" &&
                    "bg-info-50 border-info-200 text-info-700",
                    t.kind === "error" &&
                    "bg-rose-50 border-rose-200 text-rose-700",
                    t.kind === "info" &&
                    "bg-blue-50 border-blue-200 text-blue-700"
                )}
            >
              {t.msg}
            </div>
        ))}
      </div>
  );
}

/* ===========================================
   MAIN PAGE
=========================================== */
export default function DriverProfilePage() {
  const { toasts, push } = useToasts();

  const [profile, setProfile] = React.useState(null);
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState(null); // Preview URL
  const [avatarFile, setAvatarFile] = React.useState(null); // File object để upload
  const [avatarUrl, setAvatarUrl] = React.useState(null); // Fetched avatar blob URL
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

  const [phoneError, setPhoneError] = React.useState("");
  const [addressError, setAddressError] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  /* ===========================================
     Load driver profile
  =========================================== */
  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const userId = getCookie("userId");
        if (!userId) {
          setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
          return;
        }

        const data = await getDriverProfileByUser(userId);
        if (!mounted) return;

        // Nếu không có avatar trong driver profile, thử lấy từ user profile (giống header)
        let avatarPath = data?.avatar;
        if (!avatarPath) {
          try {
            const userProfile = await getMyProfile();
            avatarPath = userProfile?.avatar || userProfile?.avatarUrl || userProfile?.imgUrl;
            // Cập nhật data với avatar từ user profile
            if (avatarPath) {
              data.avatar = avatarPath;
            }
          } catch (err) {
            // Silently ignore - avatar is optional
          }
        }

        setProfile(data);
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setAvatarPreview(null); // Reset preview khi load lại
        setAvatarFile(null);

        // Load avatar với auth token (giống header)
        if (avatarPath) {
          try {
            const apiBase = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
            const imgPath = avatarPath;
            const fullUrl = /^https?:\/\//i.test(imgPath)
                ? imgPath
                : `${apiBase}${imgPath.startsWith("/") ? "" : "/"}${imgPath}`;
            const urlWithCacheBuster = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

            // Fetch with auth
            let token = localStorage.getItem("access_token") || "";
            if (!token) {
              try {
                const parts = document.cookie.split("; ");
                for (const p of parts) {
                  const [k, v] = p.split("=");
                  if (k === "access_token") {
                    token = decodeURIComponent(v || "");
                    break;
                  }
                }
              } catch {}
            }
            const resp = await fetch(urlWithCacheBuster, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: "include",
              cache: "no-store",
            });

            console.log("[DriverProfile] Avatar fetch response:", resp.status, resp.ok);

            if (resp.ok && mounted) {
              const blob = await resp.blob();
              const blobUrl = URL.createObjectURL(blob);
              setAvatarUrl(blobUrl);
            } else if (mounted) {
              setAvatarUrl(null);
            }
          } catch (err) {
            // Suppress extension-related errors (chrome.runtime.lastError)
            if (err?.message?.includes("runtime.lastError") ||
                err?.message?.includes("Receiving end does not exist")) {
              // Ignore Chrome extension errors
              return;
            }
            if (mounted) setAvatarUrl(null);
          }
        } else if (mounted) {
          setAvatarUrl(null);
        }
      } catch (err) {
        setError(
            err?.data?.message ||
            err?.message ||
            "Không tải được hồ sơ tài xế."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup avatar blob URL khi component unmount
  React.useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  // Check if data has changed
  const dirty =
      profile &&
      (phone !== (profile.phone || "") ||
          address !== (profile.address || "") ||
          avatarFile !== null); // Có avatar mới chọn

  // Check if form is valid (no errors and has required data)
  const isValid =
      phone.trim() !== "" &&
      address.trim() !== "" &&
      !phoneError &&
      !addressError;

  /* ===========================================
     Validation
  =========================================== */
  const validate = () => {
    let ok = true;

    // Phone validation
    const phoneErr = validateRequired(phone, "Số điện thoại") || validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      ok = false;
    } else {
      setPhoneError("");
    }

    // Address validation
    const addressErr = validateRequired(address, "Địa chỉ");
    if (addressErr) {
      setAddressError(addressErr);
      ok = false;
    } else if (address.trim().length < 10) {
      setAddressError("Địa chỉ phải có ít nhất 10 ký tự");
      ok = false;
    } else {
      setAddressError("");
    }

    return ok;
  };

  /* ===========================================
     Save handler
  =========================================== */
  const onSave = async () => {
    if (!profile || !dirty) return;

    if (!validate()) {
      push("Vui lòng kiểm tra lại thông tin ❌", "error");
      return;
    }

    try {
      setSaving(true);
      const userId = getCookie("userId");
      if (!userId) {
        push("Không tìm thấy userId", "error");
        return;
      }

      // Upload avatar trước nếu có
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          await uploadDriverAvatar(parseInt(userId), avatarFile);
        } catch (err) {
          push(
              err?.data?.message || err?.message || "Không thể upload ảnh đại diện",
              "error"
          );
          setUploadingAvatar(false);
          setSaving(false);
          return;
        }
        setUploadingAvatar(false);
      }

      // Cập nhật thông tin liên lạc
      const payload = {
        phone: phone.trim(),
        address: address.trim(),
      };

      const updated = await updateDriverProfile(profile.driverId, payload);

      // Reload profile để lấy avatar mới nếu có
      if (avatarFile) {
        const reloadedProfile = await getDriverProfileByUser(userId);
        setProfile(reloadedProfile);

        // Reload avatar với auth token
        if (reloadedProfile?.avatar) {
          try {
            const apiBase = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
            const imgPath = reloadedProfile.avatar;
            const fullUrl = /^https?:\/\//i.test(imgPath)
                ? imgPath
                : `${apiBase}${imgPath.startsWith("/") ? "" : "/"}${imgPath}`;
            const urlWithCacheBuster = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

            let token = localStorage.getItem("access_token") || "";
            if (!token) {
              try {
                const parts = document.cookie.split("; ");
                for (const p of parts) {
                  const [k, v] = p.split("=");
                  if (k === "access_token") {
                    token = decodeURIComponent(v || "");
                    break;
                  }
                }
              } catch {}
            }
            const resp = await fetch(urlWithCacheBuster, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: "include",
              cache: "no-store",
            });

            if (resp.ok) {
              // Revoke old URL
              if (avatarUrl) {
                URL.revokeObjectURL(avatarUrl);
              }
              const blob = await resp.blob();
              const newBlobUrl = URL.createObjectURL(blob);
              setAvatarUrl(newBlobUrl);
            }
          } catch (err) {
            // Silently ignore - avatar reload is optional
          }
        }
      } else {
        setProfile(updated);
      }

      setPhone(updated.phone || "");
      setAddress(updated.address || "");
      setAvatarPreview(null);
      setAvatarFile(null);

      push("Đã lưu thông tin", "success");
    } catch (err) {
      setError(
          err?.data?.message ||
          err?.message ||
          "Không thể cập nhật hồ sơ tài xế."
      );
      push("Lưu thất bại ❌", "error");
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  const onCancel = () => {
    if (!profile) return;
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
    setPhoneError("");
    setAddressError("");
    setAvatarPreview(null);
    setAvatarFile(null);
    push("Đã hoàn tác thay đổi", "info");
  };

  /* ===========================================
     Avatar preview handler (chỉ hiển thị preview, chưa upload)
  =========================================== */
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      push("Chỉ chấp nhận file ảnh", "error");
      e.target.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      push("Kích thước file không được vượt quá 5MB", "error");
      e.target.value = "";
      return;
    }

    // Tạo preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarFile(file);
    };
    reader.onerror = () => {
      push("Không thể đọc file ảnh", "error");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  /* ===========================================
     Derived UI fields
  =========================================== */
  const fullName = profile?.fullName || "Tài xế";
  const email = profile?.email || "—";
  const branchName = profile?.branchName || "—";
  const licenseExpiry = profile?.licenseExpiry || null;

  const leftDays =
      Number.isNaN(daysUntil(licenseExpiry))
          ? null
          : daysUntil(licenseExpiry);

  let licenseColor = "border-info-200 bg-info-50 text-info-700";
  let licenseText =
      leftDays != null ? `${leftDays} ngày nữa hết hạn` : "—";
  let LicenseIcon = Clock;

  if (leftDays != null) {
    if (leftDays <= 30) {
      licenseColor =
          "border-rose-200 bg-rose-50 text-rose-700 animate-pulse";
      licenseText = `Sắp hết hạn! ${leftDays} ngày còn lại`;
      LicenseIcon = AlertTriangle;
    } else if (leftDays <= 90) {
      licenseColor = "border-info-200 bg-info-50 text-info-700";
      LicenseIcon = Clock;
    }
  }

  const tripsTotal = profile?.totalTrips || 0;
  const status = profile?.status || "ACTIVE";
  const licenseClass = profile?.licenseClass || "—";
  const note = profile?.note || "";
  const healthCheckDate = profile?.healthCheckDate || "";

  /* ===========================================
     RENDER
  =========================================== */
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/40 text-slate-900 p-6">
        <Toasts toasts={toasts} />

        {/* Error banner */}
        {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
        )}

        {loading && (
            <div className="mb-4 text-sm text-slate-500">
              Đang tải hồ sơ tài xế...
            </div>
        )}

        {!loading && profile && (
            <>
              {/* ================= HERO CARD ================= */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-100 bg-gradient-to-r from-white/90 via-emerald-50 to-sky-50 shadow-xl shadow-emerald-100/50 p-6 mb-8">
                <div className="absolute -right-12 -top-12 w-44 h-44 bg-emerald-200/30 rounded-full blur-3xl" />
                <div className="absolute -left-10 bottom-0 w-32 h-32 bg-sky-200/25 rounded-full blur-2xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Avatar + info */}
                  <div className="flex items-start gap-4 min-w-[220px]">
                    <div className="relative">
                      <div className="relative">
                        {avatarPreview ? (
                            // Hiển thị preview nếu có
                            <UserAvatar
                                name={fullName}
                                avatar={avatarPreview}
                                size={64}
                                className={cls(
                                    "ring-4 ring-primary-400 shadow-sm transition-all"
                                )}
                            />
                        ) : avatarUrl ? (
                            // Hiển thị avatar đã fetch với auth
                            <div
                                className={cls(
                                    "rounded-full overflow-hidden ring-2 ring-blue-100 shadow-sm",
                                    "w-16 h-16 flex items-center justify-center"
                                )}
                            >
                              <img
                                  src={avatarUrl}
                                  alt={fullName}
                                  className="w-full h-full object-cover"
                                  onError={() => setAvatarUrl(null)}
                              />
                            </div>
                        ) : (
                            // Fallback sang UserAvatar với initials
                            <UserAvatar
                                name={fullName}
                                avatar={null}
                                size={64}
                                className="ring-2 ring-blue-100 shadow-sm"
                            />
                        )}
                        {/* Badge "Chưa lưu" khi có preview */}
                        {avatarPreview && (
                            <div className="absolute -top-1 -left-1 bg-info-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                              Mới
                            </div>
                        )}
                      </div>

                      {/* Upload button overlay */}
                      <label
                          className={cls(
                              "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer transition-colors",
                              (saving || uploadingAvatar)
                                  ? "bg-slate-400 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700"
                          )}
                          title="Tải ảnh đại diện"
                      >
                        {uploadingAvatar ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Camera className="h-3.5 w-3.5 text-white" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarSelect}
                            disabled={saving || uploadingAvatar}
                            className="hidden"
                        />
                      </label>

                      {/* Status badge */}
                      <span
                          className={cls(
                              "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] border-2 border-white shadow-sm font-semibold",
                              status === "ACTIVE"
                                  ? "bg-info-500 text-white"
                                  : "bg-slate-400 text-white"
                          )}
                      >
                    {/* {status === "ACTIVE" ? "ON" : "OFF"} */}
                  </span>
                    </div>

                    <div>
                      <div className="text-lg font-semibold text-slate-900">
                        {fullName}
                      </div>

                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{email}</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{address || "Chưa có địa chỉ"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 lg:ml-auto lg:max-w-xl">
                    {/* Tổng chuyến */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-info-500" />
                        Tổng chuyến
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {fmtNum(tripsTotal)}
                      </div>
                    </div>

                    {/* GPLX */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-info-500" />
                        GPLX
                      </div>

                      <div className="mt-1 text-lg font-semibold">{licenseClass}</div>

                      <div className="mt-2">
                        <div
                            className={cls(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] shadow-sm",
                                licenseColor
                            )}
                        >
                          <LicenseIcon className="h-3.5 w-3.5" />
                          {licenseText}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= MAIN GRID ================= */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ===== Contact + Edit ===== */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-medium">Thông tin liên lạc</div>
                  </div>

                  <div className="p-4 space-y-4 text-sm text-slate-700">
                    {/* Phone */}
                    <div>
                      <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        Số điện thoại
                      </div>

                      <input
                          className={cls(
                              "w-full rounded-lg border px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500",
                              phoneError
                                  ? "border-rose-400 bg-rose-50"
                                  : "border-slate-300"
                          )}
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhone(val);
                            // Real-time validation
                            if (val.trim()) {
                              const err = validatePhone(val);
                              setPhoneError(err);
                            } else {
                              setPhoneError("");
                            }
                          }}
                          placeholder="0123456789"
                          maxLength={10}
                      />

                      {phoneError && (
                          <div className="text-xs text-rose-600 mt-1">
                            {phoneError}
                          </div>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Địa chỉ liên lạc
                      </div>

                      <textarea
                          rows={3}
                          className={cls(
                              "w-full rounded-lg border px-3 py-2 shadow-sm resize-none focus:ring-2 focus:ring-blue-500",
                              addressError
                                  ? "border-rose-400 bg-rose-50"
                                  : "border-slate-300"
                          )}
                          value={address}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddress(val);
                            // Real-time validation
                            if (val.trim() && val.trim().length < 10) {
                              setAddressError("Địa chỉ phải có ít nhất 10 ký tự");
                            } else {
                              setAddressError("");
                            }
                          }}
                          placeholder="Số nhà, đường, quận, tỉnh"
                          maxLength={200}
                      />

                      <div className="flex items-center justify-between mt-1">
                        {addressError ? (
                            <div className="text-xs text-rose-600">
                              {addressError}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">
                              {address.length}/200 ký tự
                            </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={!dirty || saving}
                        className={cls(
                            "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm",
                            dirty
                                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        )}
                    >
                      <X className="h-4 w-4" />
                      Huỷ
                    </button>

                    <button
                        onClick={onSave}
                        disabled={!dirty || !isValid || saving}
                        className={cls(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition-colors",
                            dirty && isValid && !saving
                                ? "bg-sky-600 text-white hover:bg-sky-500"
                                : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        )}
                        title={
                          !dirty
                              ? "Chưa có thay đổi"
                              : !isValid
                                  ? "Vui lòng sửa lỗi trước khi lưu"
                                  : "Lưu thay đổi"
                        }
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>

                {/* ===== Driver Info ===== */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-medium">Hồ sơ tài xế</div>
                  </div>

                  <div className="p-4 text-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldReadOnly label="Họ và tên" value={fullName} />
                      <FieldReadOnly icon={Mail} label="Email" value={email} />
                      <FieldReadOnly icon={MapPin} label="Chi nhánh" value={branchName} />
                      <FieldReadOnly icon={ShieldCheck} label="Hạng GPLX" value={licenseClass} />
                    </div>

                    {/* GPLX Expiry */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-600">
                      Ngày hết hạn GPLX
                    </span>
                        <div
                            className={cls(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] shadow-sm",
                                licenseColor
                            )}
                        >
                          <LicenseIcon className="h-3.5 w-3.5" />
                          {licenseText}
                        </div>
                      </div>

                      <div className="text-base font-semibold text-slate-900">
                        {licenseExpiry || "—"}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <FieldReadOnly label="Ghi chú nội bộ" value={note || "—"} />
                      <FieldReadOnly label="Khám sức khoẻ gần nhất" value={healthCheckDate || "—"} />
                    </div>
                  </div>
                </div>
              </div>
            </>
        )}
      </div>
  );
}

/* ===========================================
   READ ONLY FIELD COMPONENT
=========================================== */
function FieldReadOnly({ icon: IconComp, label, value }) {
  return (
      <div className="text-xs">
        <div className="mb-1 flex items-center gap-1 text-slate-500 font-medium">
          {IconComp && <IconComp className="h-3.5 w-3.5 text-slate-400" />}
          {label}
        </div>
        <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm shadow-sm">
          {value || "—"}
        </div>
      </div>
  );
}