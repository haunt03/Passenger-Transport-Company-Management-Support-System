import React from "react";
import {
  Save, XCircle, User, Mail, Phone, MapPin, Shield,
  CheckCircle, Lock, Eye, EyeOff, Camera
} from "lucide-react";
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  changePassword
} from "../../api/profile";

/* ---------------- Avatar ---------------- */
function AvatarPreview({ src, name, onPick }) {
  const initials =
      name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
      <div className="relative group">
        <div className="h-32 w-32 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center text-white text-3xl font-semibold">
          {src ? <img src={src} className="h-full w-full object-cover" /> : initials}
        </div>
        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer">
          <Camera className="text-white" />
          <input type="file" hidden accept="image/*" onChange={e => onPick(e.target.files[0])} />
        </label>
      </div>
  );
}

/* ---------------- Main ---------------- */
export default function UpdateProfilePage() {
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [roleName, setRoleName] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState("");
  const [avatarFile, setAvatarFile] = React.useState(null);

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [generalError, setGeneralError] = React.useState("");

  /* -------- Password -------- */
  const [showPasswordSection, setShowPasswordSection] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);

  /* -------- Load profile -------- */
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await getMyProfile();
      setFullName(p?.fullName || "");
      setPhone(p?.phone || "");
      setEmail(p?.email || "");
      setAddress(p?.address || "");
      setRoleName(p?.roleName || "");
      setStatus(p?.status || "");
      setAvatarPreview(p?.avatarUrl || "");
      setLoading(false);
    })();
  }, []);

  /* -------- Save profile -------- */
  const onSave = async () => {
    setSaving(true);
    setGeneralError("");
    try {
      if (avatarFile) await uploadAvatar(avatarFile);
      await updateMyProfile({ phone, address });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setGeneralError("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  /* -------- Change password -------- */
  const onChangePassword = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng nhập đầy đủ");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Đổi mật khẩu thất bại");
    } finally {
      setChangingPassword(false);
    }
  };

  /* ================= RENDER ================= */
  return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {showSuccess && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex gap-2">
              <CheckCircle className="text-green-600" />
              <span>Cập nhật thành công</span>
            </div>
        )}

        {generalError && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-2">
              <XCircle className="text-red-600" />
              <span>{generalError}</span>
            </div>
        )}

        <AvatarPreview src={avatarPreview} name={fullName} onPick={setAvatarFile} />

        <div className="grid grid-cols-2 gap-4">
          <input disabled value={fullName} className="input" />
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input" />
          <input disabled value={email} className="input" />
          <input value={address} onChange={e => setAddress(e.target.value)} className="input" />
        </div>

        <button onClick={onSave} disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? "Đang lưu..." : "Lưu"}
        </button>

        {/* PASSWORD */}
        <div className="border-t pt-6">
          <button onClick={() => setShowPasswordSection(!showPasswordSection)}>
            Đổi mật khẩu
          </button>

          {showPasswordSection && (
              <div className="space-y-3 mt-4">
                {passwordError && <p className="text-red-600">{passwordError}</p>}
                <input type="password" placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input type="password" placeholder="Xác nhận mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button onClick={onChangePassword} disabled={changingPassword}>
                  {changingPassword ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
          )}
        </div>
      </div>
  );
}
