import React from "react";
import { listBranches, createBranch } from "../../api/branches";
import { listEmployeesByRole } from "../../api/employees";
import { listUsers, listRoles } from "../../api/users";
import { Building2, PlusCircle, RefreshCw, ShieldCheck, X, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusBadge({ status }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-sky-50 text-sky-700 border-sky-300">
        <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
        <span>Đang hoạt động</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-slate-100 text-slate-600 border-slate-300">
      <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
      <span>Tạm dừng</span>
    </span>
  );
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = (msg, kind = "info", ttl = 2400) => {
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
            "rounded-md px-3 py-2 text-sm shadow border",
            t.kind === "success" && "bg-emerald-50 border-emerald-300 text-emerald-700",
            t.kind === "error" && "bg-rose-50 border-rose-300 text-rose-700",
            t.kind === "info" && "bg-white border-slate-300 text-slate-700"
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function CreateBranchModal({ open, onClose, onSave, availableManagers }) {
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [managerId, setManagerId] = React.useState("");

  const valid = name.trim() !== "" && phone.trim() !== "" && managerId !== "";

  React.useEffect(() => {
    if (!open) {
      setName("");
      setAddress("");
      setPhone("");
      setManagerId("");
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="font-semibold text-slate-900">Tạo cơ sở / chi nhánh mới</div>
          <button onClick={onClose} className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-500 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div>
            <div className="text-xs text-slate-600 mb-1">Tên chi nhánh <span className="text-rose-500">*</span></div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500" placeholder="VD: Chi nhánh Hà Nội" />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Địa chỉ</div>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500" placeholder="Số 1 Tràng Tiền, Hoàn Kiếm..." />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Số điện thoại <span className="text-rose-500">*</span></div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500" placeholder="024-123-4567" />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Quản lý chi nhánh <span className="text-rose-500">*</span></div>
            <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500">
              <option value="">-- Chọn quản lý --</option>
              {availableManagers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">Hiển thị tất cả người dùng có vai trò MANAGER.</div>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">Sau khi tạo, chi nhánh sẽ ở trạng thái <b className="text-slate-700">ACTIVE</b> và Manager sẽ được gán vào chi nhánh đó.</div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">Hủy</button>
          <button onClick={() => valid && onSave({ name, address, phone, managerId: Number(managerId) })} disabled={!valid} className="rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors">Lưu chi nhánh</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBranchesPage() {
  const { toasts, push } = useToasts();
  const navigate = useNavigate();

  const [managers, setManagers] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);

  // Hiển thị tất cả Manager (không lọc theo branchId để tránh rỗng khi Manager đã được gán sẵn)
  const managerOptions = React.useMemo(() => managers, [managers]);
  const totalPages = Math.max(1, Math.ceil(branches.length / pageSize));
  const current = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return branches.slice(start, start + pageSize);
  }, [branches, page, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onRefresh = async () => {
    setLoading(true);
    try {
      const data = await listBranches({ page: 0, size: 100 });
      const arr = Array.isArray(data) ? data : (data?.items || data?.content || []);
      const mapped = arr.map((b) => ({
        id: b.id,
        name: b.branchName || b.name,
        address: b.location || "",
        phone: b.phone || "",
        managerName: b.manager || null,
        employeeCount: b.employeeCount || 0,
        status: b.status || "ACTIVE",
      }));
      setBranches(mapped);
    } catch (e) {
      push("Tải danh sách chi nhánh thất bại", "error");
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { onRefresh(); }, []);

  const handleCreateBranch = async ({ name, address, phone, managerId }) => {
    try {
      await createBranch({ branchName: name, location: address, phone, managerId });
      push("Tạo chi nhánh thành công", "success");
      setOpenCreate(false);
      onRefresh();
    } catch (e) {
      push("Tạo chi nhánh thất bại", "error");
    }
  };

  React.useEffect(() => {
    (async () => {
      // Try Employee API first; fallback to Roles + Users
      try {
        const emps = await listEmployeesByRole("Manager");
        if (Array.isArray(emps) && emps.length >= 0) {
          const mgrs = emps.map((e) => ({ id: e.userId, name: e.userFullName || "", email: "", branchId: e.branchId || null }));
          setManagers(mgrs);
          return;
        }
      } catch {}
      try {
        const roles = await listRoles();
        const managerRole = (roles || []).find((r) => (r.roleName || r.name || "").toUpperCase() === "MANAGER");
        if (managerRole?.id != null) {
          const users = await listUsers({ roleId: managerRole.id });
          const mgrs = (users || []).map((u) => ({ id: u.id, name: u.fullName || u.username || "", email: u.email || "", branchId: null }));
          setManagers(mgrs);
        }
      } catch {}
    })();
  }, []);

  const onEditBranch = (branch) => {
    navigate(`/admin/branches/${branch.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <Toasts toasts={toasts} />

      <div className="flex flex-wrap items-start gap-4 mb-5">
        <div className="flex items-start gap-3 flex-1 min-w-[220px]">
          <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="text-[11px] text-slate-500 leading-none mb-1">Hệ thống chi nhánh / cơ sở</div>
            <h1 className="text-lg font-semibold text-slate-900 leading-tight">Danh sách Cơ sở / Chi nhánh</h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
          <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors">
            <PlusCircle className="h-4 w-4" />
            <span>Tạo cơ sở mới</span>
          </button>
          <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm disabled:opacity-50">
            <RefreshCw className={cls("h-4 w-4 text-slate-500", loading ? "animate-spin" : "")} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 text-sm text-slate-600">Danh sách chi nhánh</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="text-left font-medium px-4 py-2">TÊN CHI NHÁNH</th>
                <th className="text-left font-medium px-4 py-2">ĐỊA CHỈ</th>
                <th className="text-left font-medium px-4 py-2">QUẢN LÝ CHI NHÁNH</th>
                <th className="text-left font-medium px-4 py-2">NHÂN VIÊN</th>
                <th className="text-left font-medium px-4 py-2">TRẠNG THÁI</th>
                <th className="text-right font-medium px-4 py-2">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {current.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Không có chi nhánh nào.</td>
                </tr>
              ) : (
                current.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-800 font-medium">{b.name}</td>
                    <td className="px-4 py-2 text-slate-700">{b.address}</td>
                    <td className="px-4 py-2 text-slate-700">{b.managerName || "—"}</td>
                    <td className="px-4 py-2 text-slate-700">{b.employeeCount || 0}</td>
                    <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => onEditBranch(b)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm">
                        <Edit className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-3 text-sm text-slate-700">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>Trang {page}/{totalPages}</div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white shadow-sm">
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}/trang</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CreateBranchModal open={openCreate} onClose={() => setOpenCreate(false)} onSave={handleCreateBranch} availableManagers={managerOptions} />
    </div>
  );
}
