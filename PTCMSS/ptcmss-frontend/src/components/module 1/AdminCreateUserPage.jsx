import React from "react";
import { useNavigate } from "react-router-dom";
import { createUser, listRoles } from "../../api/users";
import { Save, ArrowLeft } from "lucide-react";
import { getCurrentRole, ROLES } from "../../utils/session";

export default function AdminCreateUserPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [roles, setRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const currentRole = React.useMemo(() => getCurrentRole(), []);

  const filterAssignableRoles = React.useCallback(
    (list) => {
      if (currentRole !== ROLES.MANAGER) return list;
      const deny = new Set(["ADMIN", "MANAGER"]);
      return (list || []).filter((r) => {
        const label = String(r?.roleName || r?.name || "")
          .trim()
          .toUpperCase();
        return !deny.has(label);
      });
    },
    [currentRole]
  );

  React.useEffect(() => {
    (async () => {
      try {
        const rs = await listRoles();
        setRoles(filterAssignableRoles(Array.isArray(rs) ? rs : []));
      } catch {}
    })();
  }, [filterAssignableRoles]);

  React.useEffect(() => {
    if (!roleId) return;
    const exists = roles.some((r) => String(r.id) === String(roleId));
    if (!exists) setRoleId("");
  }, [roles, roleId]);

  const valid = fullName.trim() && username.trim() && phone.trim() && address.trim() && roleId;

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await createUser({ fullName, username, email, phone, address, roleId: Number(roleId) });
      navigate("/admin/users");
    } catch (e) {
      alert("Tạo người dùng thất bại");
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
        <div className="text-lg font-semibold">Tạo tài khoản mới</div>
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
          <div className="text-xs text-slate-600 mb-1">Username *</div>
          <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Đăng nhập bằng tên này" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Email</div>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Số điện thoại *</div>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Địa chỉ *</div>
          <input value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="text-xs text-slate-600 mb-1">Vai trò *</div>
          <select value={roleId} onChange={(e)=>setRoleId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            <option value="">-- Chọn vai trò --</option>
            {roles.map(r => (<option key={r.id} value={r.id}>{r.roleName || r.name}</option>))}
          </select>
        </div>
        <div className="text-[12px] text-slate-500">Sau khi tạo, hệ thống sẽ gửi liên kết xác thực để người dùng thiết lập mật khẩu lần đầu.</div>
      </div>
    </div>
  );
}

