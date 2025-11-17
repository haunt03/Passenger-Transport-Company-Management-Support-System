import React from "react";
import { useNavigate } from "react-router-dom";
import { listUsers, listUsersByBranch, listRoles, toggleUserStatus } from "../../api/users";
import { listEmployeesByRole } from "../../api/employees";
import { RefreshCw, PlusCircle, Edit2, ShieldCheck } from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusBadge({ value }) {
  const map = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-300",
    INACTIVE: "bg-slate-100 text-slate-600 border-slate-300",
  };
  const label = value === "ACTIVE" ? "Hoạt động" : "Vô hiệu hóa";
  return (
    <span className={cls("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border", map[value] || map.INACTIVE)}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const currentRole = React.useMemo(() => getCurrentRole(), []);
  const currentUserId = React.useMemo(() => getStoredUserId(), []);
  const isManagerView = currentRole === ROLES.MANAGER;
  const [managerBranchInfo, setManagerBranchInfo] = React.useState({ id: null, name: "" });
  const [managerBranchLoading, setManagerBranchLoading] = React.useState(isManagerView);
  const [managerBranchError, setManagerBranchError] = React.useState("");

  React.useEffect(() => {
    if (!isManagerView) {
      setManagerBranchInfo({ id: null, name: "" });
      setManagerBranchError("");
      setManagerBranchLoading(false);
      return;
    }
    if (!currentUserId) {
      setManagerBranchInfo({ id: null, name: "" });
      setManagerBranchError("Không tìm thấy chi nhánh phụ trách.");
      setManagerBranchLoading(false);
      return;
    }
    let cancelled = false;
    async function loadBranch() {
      setManagerBranchLoading(true);
      setManagerBranchError("");
      try {
        const managers = await listEmployeesByRole("Manager");
        if (cancelled) return;
        const mine = (managers || []).find((emp) => String(emp.userId) === String(currentUserId));
        if (mine?.branchId) {
          setManagerBranchInfo({ id: mine.branchId, name: mine.branchName || "" });
        } else {
          setManagerBranchInfo({ id: null, name: "" });
          setManagerBranchError("Không xác định được chi nhánh của bạn.");
        }
      } catch {
        if (cancelled) return;
        setManagerBranchInfo({ id: null, name: "" });
        setManagerBranchError("Không tải được chi nhánh của bạn.");
      } finally {
        if (!cancelled) setManagerBranchLoading(false);
      }
    }
    loadBranch();
    return () => {
      cancelled = true;
    };
  }, [isManagerView, currentUserId]);

  const branchFilterValue = isManagerView ? managerBranchInfo.id : undefined;
  const normalizedKeyword = React.useMemo(() => keyword.trim().toLowerCase(), [keyword]);
  const normalizedStatus = React.useMemo(() => (status || "").trim().toUpperCase(), [status]);
  const selectedRoleName = React.useMemo(() => {
    if (!roleId) return "";
    const found = roles.find((r) => String(r.id) === String(roleId));
    return (found?.roleName || found?.name || "").trim().toLowerCase();
  }, [roleId, roles]);

  const applyFilters = React.useCallback(
    (records) => {
      const source = Array.isArray(records) ? records : [];
      return source.filter((u) => {
        if (normalizedKeyword) {
          const haystack = `${u.fullName || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase();
          if (!haystack.includes(normalizedKeyword)) return false;
        }
        if (selectedRoleName) {
          const role = String(u.roleName || "").trim().toLowerCase();
          if (role !== selectedRoleName) return false;
        }
        if (normalizedStatus) {
          const st = String(u.status || "").trim().toUpperCase();
          if (st !== normalizedStatus) return false;
        }
        return true;
      });
    },
    [normalizedKeyword, selectedRoleName, normalizedStatus]
  );

  const onRefresh = React.useCallback(async () => {
    if (isManagerView) {
      if (managerBranchLoading) return;
      if (!branchFilterValue) {
        setUsers([]);
        return;
      }
    }
    setLoading(true);
    try {
      let data;
      if (isManagerView) {
        data = await listUsersByBranch(branchFilterValue);
      } else {
        data = await listUsers({
          keyword: keyword || undefined,
          roleId: roleId ? Number(roleId) : undefined,
          status: status || undefined,
        });
      }
      const arr = Array.isArray(data) ? data : data?.items || [];
      setUsers(applyFilters(arr));
    } finally {
      setLoading(false);
    }
  }, [
    keyword,
    roleId,
    status,
    branchFilterValue,
    isManagerView,
    managerBranchLoading,
    applyFilters,
  ]);

  const refreshRef = React.useRef(onRefresh);
  React.useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  React.useEffect(() => {
    if (isManagerView) {
      if (managerBranchLoading || !branchFilterValue) return;
    }
    refreshRef.current();
  }, [isManagerView, managerBranchLoading, branchFilterValue]);

  React.useEffect(() => {
    (async () => {
      try {
        const rs = await listRoles();
        setRoles(Array.isArray(rs) ? rs : []);
      } catch {}
    })();
  }, []);

  const onToggle = async (id) => {
    try {
      await toggleUserStatus(id);
      await onRefresh();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="text-lg font-semibold">Quản lý người dùng</div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => navigate("/admin/users/new")} className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm">
            <PlusCircle className="h-4 w-4" /> Tạo mới
          </button>
          <button onClick={onRefresh} disabled={loading || (isManagerView && (managerBranchLoading || !branchFilterValue))} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm disabled:opacity-50">
            <RefreshCw className={cls("h-4 w-4", loading && "animate-spin")} /> Làm mới
          </button>
        </div>
      </div>

      {isManagerView && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          {managerBranchLoading
            ? "Đang xác định chi nhánh phụ trách..."
            : branchFilterValue
            ? "Chỉ hiển thị tài khoản thuộc chi nhánh " + (managerBranchInfo.name || ("#" + branchFilterValue)) + "."
            : managerBranchError || "Không xác định được chi nhánh của bạn. Hãy liên hệ Admin."}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 mb-3 flex flex-wrap gap-2 items-center">
        <input value={keyword} onChange={(e)=>setKeyword(e.target.value)} placeholder="Tìm theo tên hoặc email" className="flex-1 min-w-[220px] border border-slate-300 rounded-md px-3 py-2 text-sm" />
        <select value={roleId} onChange={(e)=>setRoleId(e.target.value)} className="border border-slate-300 rounded-md px-2 py-2 text-sm">
          <option value="">-- Vai trò --</option>
          {roles.map(r => (<option key={r.id} value={r.id}>{r.roleName || r.name}</option>))}
        </select>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border border-slate-300 rounded-md px-2 py-2 text-sm">
          <option value="">-- Trạng thái --</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <button onClick={onRefresh} disabled={isManagerView && (managerBranchLoading || !branchFilterValue)} className="rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm disabled:opacity-50">Lọc</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="text-left font-medium px-4 py-2">H? tên</th>
              <th className="text-left font-medium px-4 py-2">Email</th>
              <th className="text-left font-medium px-4 py-2">SÐT</th>
              <th className="text-left font-medium px-4 py-2">Vai trò</th>
              <th className="text-left font-medium px-4 py-2">Tr?ng thái</th>
              <th className="text-right font-medium px-4 py-2">Hành d?ng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Không có dữ liệu.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-800 font-medium">{u.fullName}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.phone}</td>
                <td className="px-4 py-2">{u.roleName}</td>
                <td className="px-4 py-2"><StatusBadge value={u.status} /></td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => navigate(`/admin/users/${u.id}`)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm">
                    <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </button>
                  <button onClick={() => onToggle(u.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm">
                    {u.status === "ACTIVE" ? "Vô hiệu hóa" : "Kích hoạt"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}





