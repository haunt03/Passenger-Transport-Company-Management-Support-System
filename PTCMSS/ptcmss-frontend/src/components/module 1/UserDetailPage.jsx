import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUser, updateUser, listRoles } from "../../api/users";
import { Save, ArrowLeft, XCircle } from "lucide-react";

export default function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [roles, setRoles] = React.useState([]);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [status, setStatus] = React.useState("ACTIVE");
  const [errors, setErrors] = React.useState({});
  const [generalError, setGeneralError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const u = await getUser(userId);
        setFullName(u.fullName || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setAddress(u.address || "");
        setStatus(u.status || "ACTIVE");
        setRoleId(u.roleId ? String(u.roleId) : "");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  React.useEffect(() => {
    (async () => {
      try {
        const rs = await listRoles();
        setRoles(Array.isArray(rs) ? rs : []);
      } catch {}
    })();
  }, []);

  const validate = () => {
    const next = {};
    if (!fullName.trim()) next.fullName = "Vui lòng nhập họ tên";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Email không đúng định dạng";
    if (phone && !/^[0-9]{10}$/.test(phone)) next.phone = "Số điện thoại phải gồm 10 chữ số";
    setErrors(next);
    setGeneralError("");
    return Object.keys(next).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateUser(userId, {
        fullName,
        email,
        phone,
        address,
        roleId: roleId ? Number(roleId) : undefined,
        status,
      });
      navigate(-1);
    } catch (e) {
      setGeneralError("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-lg font-semibold">Thông tin người dùng</div>
          {loading && <div className="text-xs text-slate-500">Đang tải...</div>}
          <button onClick={onSave} disabled={saving} className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50">
            <Save className="h-4 w-4" /> Lưu
          </button>
        </div>

        {generalError && (
            <div className="max-w-2xl mb-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-rose-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-rose-600 mt-0.5" />
              <span>{generalError}</span>
            </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 grid gap-4 max-w-2xl">
          <div>
            <div className="text-xs text-slate-600 mb-1">Họ tên *</div>
            <input
                value={fullName}
                onChange={(e)=>{ setFullName(e.target.value); setErrors((p)=>({ ...p, fullName: undefined })); }}
                className={`w-full border rounded-md px-3 py-2 text-sm ${errors.fullName ? "border-rose-300" : "border-slate-300"}`}
            />
            {errors.fullName && <div className="text-[12px] text-rose-600 mt-1">{errors.fullName}</div>}
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Email</div>
            <input
                value={email}
                onChange={(e)=>{ setEmail(e.target.value); setErrors((p)=>({ ...p, email: undefined })); }}
                className={`w-full border rounded-md px-3 py-2 text-sm ${errors.email ? "border-rose-300" : "border-slate-300"}`}
            />
            {errors.email && <div className="text-[12px] text-rose-600 mt-1">{errors.email}</div>}
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Số điện thoại</div>
            <input
                value={phone}
                onChange={(e)=>{ setPhone(e.target.value.replace(/[^0-9]/g, "")); setErrors((p)=>({ ...p, phone: undefined })); }}
                className={`w-full border rounded-md px-3 py-2 text-sm ${errors.phone ? "border-rose-300" : "border-slate-300"}`}
                placeholder="0123456789"
            />
            {errors.phone && <div className="text-[12px] text-rose-600 mt-1">{errors.phone}</div>}
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Địa chỉ</div>
            <input value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Vai trò</div>
            <select value={roleId} onChange={(e)=>setRoleId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="">-- Giữ nguyên --</option>
              {roles.map(r => (<option key={r.id} value={r.id}>{r.roleName || r.name}</option>))}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Trạng thái</div>
            <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
      </div>
  );
}