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
} from "../../api/drivers";
import { validatePhone, validateRequired } from "../../utils/validation";

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
            "bg-emerald-50 border-emerald-200 text-emerald-700",
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

        setProfile(data);
        setPhone(data.phone || "");
        setAddress(data.address || "");
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
    return () => (mounted = false);
  }, []);

  // Check if data has changed
  const dirty =
    profile &&
    (phone !== (profile.phone || "") ||
      address !== (profile.address || ""));

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

    const payload = {
      phone: phone.trim(),
      address: address.trim(),
    };

    try {
      setSaving(true);
      const updated = await updateDriverProfile(profile.driverId, payload);

      setProfile(updated);
      setPhone(updated.phone || "");
      setAddress(updated.address || "");

      push("Đã lưu thông tin liên lạc", "success");
    } catch (err) {
      setError(
        err?.data?.message ||
        err?.message ||
        "Không thể cập nhật hồ sơ tài xế."
      );
      push("Lưu thất bại ❌", "error");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    if (!profile) return;
    setPhone(profile.phone || "");
    setAddress(profile.address || "");
    setPhoneError("");
    setAddressError("");
    push("Đã hoàn tác thay đổi", "info");
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

  let licenseColor = "border-emerald-200 bg-emerald-50 text-emerald-700";
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
      licenseColor = "border-amber-200 bg-amber-50 text-amber-700";
      LicenseIcon = Clock;
    }
  }

  const tripsTotal = profile?.totalTrips || 0;
  const kmTotal = profile?.totalKm || 0;
  const status = profile?.status || "ACTIVE";
  const licenseClass = profile?.licenseClass || "—";
  const note = profile?.note || "";
  const healthCheckDate = profile?.healthCheckDate || "";

  /* ===========================================
     RENDER
  =========================================== */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
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
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 p-6 mb-8">
            <div className="relative flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Avatar + info */}
              <div className="flex items-start gap-4 min-w-[220px]">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 text-xl font-semibold shadow-sm">
                  {initialsOf(fullName)}

                  <span
                    className={cls(
                      "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] border border-white shadow-sm",
                      status === "ACTIVE"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-400 text-white"
                    )}
                  >
                    {status === "ACTIVE" ? "ON" : "OFF"}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:ml-auto lg:max-w-xl">
                {/* Tổng chuyến */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    Tổng chuyến
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    {fmtNum(tripsTotal)}
                  </div>
                </div>

                {/* Tổng km */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Car className="h-3.5 w-3.5 text-emerald-500" />
                    Tổng km
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {fmtNum(kmTotal)} km
                  </div>
                </div>

                {/* GPLX */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
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
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center">
                <div className="text-sm font-medium">Thông tin liên lạc</div>
                <div className="ml-auto text-[11px] text-slate-400">
                  PUT /api/drivers/{profile.driverId}/profile
                </div>
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
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
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
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center">
                <div className="text-sm font-medium">Hồ sơ tài xế</div>
                <div className="ml-auto text-[11px] text-slate-400">
                  GET /api/drivers/{profile.driverId}/profile
                </div>
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