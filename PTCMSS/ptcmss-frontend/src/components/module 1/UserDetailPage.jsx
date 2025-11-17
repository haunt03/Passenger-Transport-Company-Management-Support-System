import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUser, updateUser, listRoles } from "../../api/users";
import { Save, ArrowLeft } from "lucide-react";

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

  const valid = fullName.trim() && (status === "ACTIVE" || status === "INACTIVE");

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await updateUser(userId, { fullName, email, phone, address, roleId: roleId ? Number(roleId) : undefined, status });
      navigate(-1);
    } catch (e) {
      alert("Cập nhật thất bại");
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
        <button onClick={onSave} disabled={!valid || saving} className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50">
          <Save className="h-4 w-4" /> Lưu
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 grid gap-4 max-w-2xl">
        <div>
          <div className="text-xs text-slate-600 mb-1">Họ tên *</div>
          <input value={fullName} onChange={(e)=>setFullName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Email</div>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Số điện thoại</div>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
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

