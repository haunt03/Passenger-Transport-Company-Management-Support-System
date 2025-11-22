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

/**
 * DriverProfilePage – Module 2.S3 (Thông tin tài xế)
 *
 * - Hiển thị thông tin cá nhân + GPLX + thống kê chuyến
 * - Cho tài xế tự sửa SĐT & Địa chỉ (PUT /api/drivers/{driverId}/profile)
 */

/* ======================= helpers ======================= */
const cls = (...a) => a.filter(Boolean).join(" ");

const fmtNum = (n) =>
  new Intl.NumberFormat("vi-VN").format(Math.max(0, Number(n || 0)));

function daysUntil(dateStr) {
  if (!dateStr) return NaN;
  const now = new Date();
  const target = new Date(String(dateStr) + "T00:00:00");
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function initialsOf(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

/* ======================= tiny toast ======================= */
function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = (msg, kind = "info", ttl = 2200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((a) => [...a, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((a) => a.filter((t) => t.id !== id));
    }, ttl);
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
            t.kind === "info" && "bg-blue-50 border-blue-200 text-blue-700"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ======================= main page ======================= */
export default function DriverProfilePage() {
  const { toasts, push } = useToasts();

  const [profile, setProfile] = React.useState(null);
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  /* -------- load profile from API -------- */
  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const userId = getCookie("userId");
        if (!userId) {
          if (mounted) {
            setError("Không tìm thấy userId trong cookie. Vui lòng đăng nhập lại.");
          }
          return;
        }

        const data = await getDriverProfileByUser(userId);

        if (!mounted) return;

        setProfile(data);
        setPhone(data.phone || "");
        setAddress(data.address || "");
      } catch (err) {
        if (!mounted) return;
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

  const dirty =
    profile &&
    (phone !== (profile.phone || "") || address !== (profile.address || ""));

  /* -------- license status UI -------- */
  const licenseExpiry =
    profile?.licenseExpiry || profile?.license_expiry || null;
  const leftDays = Number.isNaN(daysUntil(licenseExpiry))
    ? null
    : daysUntil(licenseExpiry);

  let licenseColor =
    "border-emerald-200 bg-emerald-50 text-emerald-700";
  let licenseText = leftDays != null ? `${leftDays} ngày nữa hết hạn` : "—";
  let LicenseIcon = Clock;

  if (leftDays != null) {
    if (leftDays <= 30) {
      licenseColor =
        "border-rose-200 bg-rose-50 text-rose-700 animate-pulse";
      licenseText = `Sắp hết hạn! ${leftDays} ngày còn lại`;
      LicenseIcon = AlertTriangle;
    } else if (leftDays <= 90) {
      licenseColor = "border-amber-200 bg-amber-50 text-amber-700";
      licenseText = `Còn ${leftDays} ngày`;
      LicenseIcon = Clock;
    }
  }

  /* -------- save handler (PUT) -------- */
  const onSave = async () => {
    if (!profile || !dirty) return;

    const payload = {
      phone: phone.trim() || null,
      address: address.trim() || null,
      // note & healthCheckDate không gửi => giữ nguyên
    };

    try {
      setSaving(true);
      setError("");

      const updated = await updateDriverProfile(profile.driverId, payload);

      setProfile(updated);
      setPhone(updated.phone || "");
      setAddress(updated.address || "");

      push("Đã lưu thông tin liên lạc ✅", "success");
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
    push("Đã hoàn tác thay đổi", "info");
  };

  /* -------- derive fields cho UI -------- */
  const fullName = profile?.fullName || profile?.full_name || "Tài xế";
  const branchName = profile?.branchName || profile?.branch || "—";
  const email = profile?.email || "—";
  const status = profile?.status || "ACTIVE";
  const licenseClass =
    profile?.licenseClass || profile?.license_class || "—";

  const tripsTotal = profile?.totalTrips ?? profile?.trips_total ?? 0;
  const kmTotal = profile?.totalKm ?? profile?.km_total ?? 0;

  const note = profile?.note || "";
  const healthCheckDate = profile?.healthCheckDate || "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <Toasts toasts={toasts} />

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
          {/* ========== HERO CARD ========== */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 p-6 mb-8">
            <div className="relative flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Avatar + status + info */}
              <div className="flex items-start gap-4 min-w-[220px]">
                <div className="relative flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 text-xl font-semibold shadow-sm">
                  {initialsOf(fullName)}
                  <span
                    className={cls(
                      "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium border border-white shadow-sm",
                      status === "ACTIVE"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-400 text-white"
                    )}
                  >
                    {status === "ACTIVE" ? "ON" : "OFF"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-semibold flex flex-wrap items-center gap-2 text-slate-900 leading-tight">
                    <span>{fullName}</span>
                    <span className="px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-medium leading-none shadow-sm">
                      {branchName}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 flex items-center gap-2 leading-tight">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{email}</span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-2 leading-tight">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{address || "Chưa có địa chỉ"}</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 lg:ml-auto lg:max-w-xl">
                {/* Tổng chuyến */}
                <div className="rounded-xl bg-slate-50/60 border border-slate-200 p-4 flex flex-col shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    Tổng chuyến
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 leading-none">
                    {fmtNum(tripsTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    chuyến đã hoàn thành
                  </div>
                </div>

                {/* Tổng km */}
                <div className="rounded-xl bg-slate-50/60 border border-slate-200 p-4 flex flex-col shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Car className="h-3.5 w-3.5 text-emerald-500" />
                    Tổng km
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 leading-none">
                    {fmtNum(kmTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    km đã chạy
                  </div>
                </div>

                {/* GPLX */}
                <div className="rounded-xl bg-slate-50/60 border border-slate-200 p-4 flex flex-col shadow-sm">
                  <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    GPLX
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 leading-none flex items-baseline gap-2">
                    <span>{licenseClass}</span>
                  </div>

                  <div className="mt-2 flex items-start gap-2 text-[11px] leading-snug">
                    <div
                      className={cls(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium text-[11px] leading-none shadow-sm",
                        licenseColor
                      )}
                    >
                      <LicenseIcon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">
                        {licenseText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========== MAIN GRID ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card: liên lạc + chỉnh sửa */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center">
                <div className="text-sm font-medium text-slate-700">
                  Thông tin liên lạc
                </div>
                <div className="ml-auto text-[11px] text-slate-400 leading-none">
                  PUT /api/drivers/{profile.driverId}/profile
                </div>
              </div>

              <div className="p-4 space-y-4 text-sm text-slate-700">
                {/* Phone */}
                <div>
                  <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    Số điện thoại
                  </div>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                {/* Address */}
                <div>
                  <div className="text-[12px] text-slate-500 mb-1 flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Địa chỉ liên lạc
                  </div>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ví dụ: Số nhà, đường, quận/huyện, tỉnh/thành"
                  />
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Địa chỉ này dùng để liên hệ khẩn cấp và gửi tài liệu.
                  </div>
                </div>
              </div>

              {/* footer buttons */}
              <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={onCancel}
                  disabled={!dirty || saving}
                  className={cls(
                    "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm",
                    dirty
                      ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-700"
                      : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                  )}
                >
                  <X className="h-4 w-4" />
                  Huỷ thay đổi
                </button>

                <button
                  onClick={onSave}
                  disabled={!dirty || saving}
                  className={cls(
                    "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium shadow-sm",
                    dirty
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed opacity-60"
                  )}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>

            {/* Card: hồ sơ tài xế & GPLX */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center">
                <div className="text-sm font-medium text-slate-700">
                  Hồ sơ tài xế
                </div>
                <div className="ml-auto text-[11px] text-slate-400 leading-none">
                  GET /api/drivers/{profile.driverId}/profile
                </div>
              </div>

              <div className="p-4 text-sm text-slate-700 space-y-4">
                {/* Họ tên, email, chi nhánh, hạng GPLX */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldReadOnly label="Họ và tên" value={fullName} />
                  <FieldReadOnly icon={Mail} label="Email" value={email} />
                  <FieldReadOnly
                    icon={MapPin}
                    label="Chi nhánh"
                    value={branchName}
                  />
                  <FieldReadOnly
                    icon={ShieldCheck}
                    label="Hạng giấy phép lái xe"
                    value={licenseClass}
                  />
                </div>

                {/* Hạn GPLX */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-600 font-medium">
                      Ngày hết hạn GPLX
                    </div>
                    <div
                      className={cls(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium text-[11px] leading-none shadow-sm",
                        licenseColor
                      )}
                    >
                      <LicenseIcon className="h-3.5 w-3.5" />
                      <span className="tabular-nums">
                        {licenseText}
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-900 text-base font-semibold tabular-nums leading-none">
                    {licenseExpiry || "—"}
                  </div>

                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Vui lòng gia hạn trước khi hết hạn để tránh bị khoá lịch
                    chạy.
                  </div>
                </div>

                {/* Thông tin thêm: note + health check */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <FieldReadOnly
                    label="Ghi chú nội bộ"
                    value={note || "—"}
                  />
                  <FieldReadOnly
                    label="Ngày khám sức khỏe gần nhất"
                    value={healthCheckDate || "—"}
                  />
                </div>

                {/* Stats recap */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg bg-slate-50/60 border border-slate-200 p-3 shadow-sm">
                    <div className="text-slate-600 flex items-center gap-1 mb-1 text-[11px] font-medium">
                      <Activity className="h-3.5 w-3.5 text-emerald-500" />
                      Tổng chuyến
                    </div>
                    <div className="text-xl font-semibold tabular-nums text-slate-900 leading-none">
                      {fmtNum(tripsTotal)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      chuyến đã hoàn thành
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/60 border border-slate-200 p-3 shadow-sm">
                    <div className="text-slate-600 flex items-center gap-1 mb-1 text-[11px] font-medium">
                      <Car className="h-3.5 w-3.5 text-emerald-500" />
                      Quãng đường
                    </div>
                    <div className="text-xl font-semibold tabular-nums text-slate-900 leading-none">
                      {fmtNum(kmTotal)} km
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      tổng km đã chạy
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
                  Các số liệu hiệu suất ở đây chỉ mang tính tham khảo cá nhân.
                  Báo cáo chính thức nằm ở màn hình Manager / Admin.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ======================= read-only field ======================= */
function FieldReadOnly({ icon: IconComp, label, value }) {
  return (
    <div className="text-xs">
      <div className="mb-1 flex items-center gap-1 text-slate-500 font-medium text-[12px]">
        {IconComp ? (
          <IconComp className="h-3.5 w-3.5 text-slate-400" />
        ) : null}
        <span>{label}</span>
      </div>
      <div className="w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-slate-800 text-sm shadow-sm">
        {value || "—"}
      </div>
    </div>
  );
}
