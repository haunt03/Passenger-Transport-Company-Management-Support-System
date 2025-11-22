import React from "react";
import { Upload, Save, XCircle } from "lucide-react";
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
      <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-600 text-xl font-semibold select-none">
        {src ? <img src={src} alt="avatar" className="h-full w-full object-cover" /> : <span>{initials}</span>}
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

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-lg font-semibold">Hồ sơ cá nhân</div>
          {loading && <div className="text-xs text-slate-500">Đang tải…</div>}
          <button onClick={onSave} disabled={saving} className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50">
            <Save className="h-4 w-4" /> Lưu thay đổi
          </button>
        </div>

        {generalError && (
            <div className="max-w-2xl mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-rose-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-rose-600 mt-0.5" />
              <span>{generalError}</span>
            </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-4">
              <AvatarPreview src={authImgSrc || avatarPreview} name={fullName} />
              <div>
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
                  <Upload className="h-4 w-4 text-slate-500" /> Chọn ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
                </label>
                <div className="text-[11px] text-slate-500 mt-1">Khuyến nghị ảnh vuông (1:1), JPG/PNG.</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">Họ và tên</div>
                <input
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })); }}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.fullName ? "border-rose-300" : "border-slate-300"}`}
                />
                {errors.fullName && <div className="text-[12px] text-rose-600 mt-1">{errors.fullName}</div>}
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Số điện thoại</div>
                <input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "")); setErrors((p) => ({ ...p, phone: undefined })); }}
                    className={`w-full border rounded-md px-3 py-2 text-sm ${errors.phone ? "border-rose-300" : "border-slate-300"}`}
                    placeholder="0901234567"
                />
                {errors.phone && <div className="text-[12px] text-rose-600 mt-1">{errors.phone}</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">Email (không sửa)</div>
                <input value={email} disabled className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Địa chỉ</div>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-slate-600 mb-1">Vai trò</div>
                <input value={roleName || ""} disabled className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Trạng thái</div>
                <input value={status || ""} disabled className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">ID người dùng</div>
                <input value={userId || ""} disabled className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}