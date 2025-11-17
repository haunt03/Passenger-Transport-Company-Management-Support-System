import React from "react";
import { Building2, ArrowLeft, Save, ShieldCheck, RefreshCw } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getBranch, updateBranch } from "../../api/branches";
import { listEmployeesByRole } from "../../api/employees";
import { listUsers, listRoles } from "../../api/users";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusPill({ status }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Đang hoạt động</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-slate-100 text-slate-600 border-slate-300">
      <ShieldCheck className="h-3.5 w-3.5 text-slate-500 opacity-70" />
      <span>Ngừng hoạt động</span>
    </span>
  );
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = (msg, kind = "info", ttl = 2600) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, msg, kind }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), ttl);
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
            t.kind === "success" && "bg-emerald-50 border-emerald-200 text-emerald-700",
            t.kind === "error" && "bg-rose-50 border-rose-200 text-rose-700",
            t.kind === "info" && "bg-blue-50 border-blue-200 text-blue-700"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function AdminBranchDetailPage() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { toasts, push } = useToasts();

  const [branchName, setBranchName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [managerId, setManagerId] = React.useState("");
  const [status, setStatus] = React.useState("ACTIVE");
  const [managers, setManagers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const b = await getBranch(branchId);
        setBranchName(b.branchName || "");
        setAddress(b.location || "");
        setStatus(b.status || "ACTIVE");
      } catch {
        push("Tải chi nhánh thất bại", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  React.useEffect(() => {
    (async () => {
      // Try Employee API first; fallback to Roles + Users
      try {
        const emps = await listEmployeesByRole("Manager");
        if (Array.isArray(emps) && emps.length >= 0) {
          const arr = emps.map((e) => ({ id: e.userId, name: e.userFullName || "", email: "" }));
          setManagers(arr);
          return;
        }
      } catch {}
      try {
        const roles = await listRoles();
        const managerRole = (roles || []).find((r) => (r.roleName || r.name || "").toUpperCase() === "MANAGER");
        if (managerRole?.id != null) {
          const users = await listUsers({ roleId: managerRole.id });
          const arr = (users || []).map((u) => ({ id: u.id, name: u.fullName || u.username || "", email: u.email || "" }));
          setManagers(arr);
        }
      } catch {}
    })();
  }, []);

  // Manager có thể giữ nguyên (không bắt buộc chọn lại)
  const valid = branchName.trim() !== "" && (status === "ACTIVE" || status === "INACTIVE");

  const onSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const body = { branchName, location: address, status };
      if (managerId) body.managerId = Number(managerId);
      await updateBranch(branchId, body);
      push("Cập nhật chi nhánh thành công", "success");
    } catch {
      push("Cập nhật chi nhánh thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <Toasts toasts={toasts} />

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="font-semibold">Thông tin chi nhánh</div>
        <button onClick={onSave} disabled={!valid || saving} className="ml-auto inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50">
          <Save className="h-4 w-4" /> Lưu
        </button>
        <button onClick={() => window.location.reload()} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Làm mới
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="grid gap-4">
          <div>
            <div className="text-xs text-slate-600 mb-1">Tên chi nhánh <span className="text-rose-500">*</span></div>
            <input value={branchName} onChange={(e) => setBranchName(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Địa chỉ</div>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Quản lý chi nhánh <span className="text-rose-500">*</span></div>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="">-- Chọn quản lý --</option>
              {(managers || []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Trạng thái hoạt động</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
            <div className="mt-2"><StatusPill status={status} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
