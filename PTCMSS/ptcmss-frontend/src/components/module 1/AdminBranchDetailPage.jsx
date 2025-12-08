import React from "react";
import { Building2, ArrowLeft, Save, ShieldCheck, RefreshCw, X, MapPin } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getBranch, updateBranch } from "../../api/branches";
import { listEmployeesByRole, getAvailableManagers } from "../../api/employees";
import { listUsers, listRoles } from "../../api/users";
import ProvinceAutocomplete from "../common/ProvinceAutocomplete";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusPill({ status }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-200">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
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
                    t.kind === "success" && "bg-amber-50 border-amber-200 text-amber-700",
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
  const [fieldErrors, setFieldErrors] = React.useState({});

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const b = await getBranch(branchId);
        // Strip "Chi nhánh" prefix if it exists when loading
        const rawName = b.branchName || "";
        const cleanedName = rawName.replace(/^Chi nhánh\s*/i, "").trim();
        setBranchName(cleanedName);
        setAddress(b.location || "");
        setStatus(b.status || "ACTIVE");
        // Set managerId from the branch data
        if (b.managerId) {
          setManagerId(String(b.managerId));
        }
      } catch {
        push("Tải chi nhánh thất bại", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  React.useEffect(() => {
    (async () => {
      // Lấy danh sách managers chưa được gán (hoặc đang quản lý chi nhánh hiện tại)
      try {
        const emps = await getAvailableManagers(Number(branchId));
        if (Array.isArray(emps)) {
          const arr = emps.map((e) => ({ id: e.userId, name: e.userFullName || "", email: e.email || "" }));
          setManagers(arr);
          return;
        }
      } catch (err) {
        console.error("Failed to load available managers:", err);
      }
      // Fallback: lấy tất cả managers nếu API mới không hoạt động
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
  }, [branchId]);

  const validateBranchName = React.useCallback((nameStr) => {
    const cleaned = nameStr.trim();

    if (!cleaned) {
      return "Vui lòng chọn tỉnh/thành phố";
    }

    if (cleaned.toLowerCase().includes("chi nhánh")) {
      return "Tên chi nhánh không được chứa cụm từ 'chi nhánh'";
    }

    return null;
  }, []);

  const validate = () => {
    const errs = {};

    if (!branchName.trim()) {
      errs.branchName = "Vui lòng nhập tên chi nhánh";
    } else {
      const nameError = validateBranchName(branchName);
      if (nameError) errs.branchName = nameError;
    }

    if (!address.trim()) errs.address = "Vui lòng nhập địa chỉ";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Manager có thể giữ nguyên (không bắt buộc chọn lại)
  const valid = React.useMemo(() => {
    if (!branchName.trim() || !address.trim()) {
      return false;
    }
    return validateBranchName(branchName) === null;
  }, [branchName, address, validateBranchName]);

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = { branchName: `Chi nhánh ${branchName.trim()}`, location: address.trim(), status };
      if (managerId) body.managerId = Number(managerId);
      await updateBranch(branchId, body);
      push("Cập nhật chi nhánh thành công", "success");
      setTimeout(() => {
        navigate("/admin/branches");
      }, 1500);
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message || "Cập nhật chi nhánh thất bại";
      push(errorMsg, "error", 4000);
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="grid gap-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Tên chi nhánh</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600 pointer-events-none z-10">
                  Chi nhánh
                </div>
                <div className="pl-[90px]">
                  <ProvinceAutocomplete
                      value={branchName}
                      onChange={(value) => {
                        setBranchName(value);
                        setFieldErrors((p) => ({ ...p, branchName: undefined }));
                      }}
                      error={fieldErrors.branchName}
                      placeholder="Chọn tỉnh/thành phố (VD: Hà Nội, Cần Thơ...)"
                  />
                </div>
              </div>
              {fieldErrors.branchName && (
                  <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    <span>{fieldErrors.branchName}</span>
                  </div>
              )}
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                💡 "Chi nhánh" đã được gán sẵn, chỉ cần chọn tỉnh/thành phố từ danh sách.
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Địa chỉ</span>
                <span className="text-red-500">*</span>
              </label>
              <textarea
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setFieldErrors((p) => ({ ...p, address: undefined }));
                  }}
                  rows={3}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 resize-none ${
                      fieldErrors.address
                          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                          : "border-slate-300 focus:border-sky-500/50 focus:ring-sky-500/20"
                  }`}
                  placeholder="VD: 123 Đường ABC, Quận XYZ"
              />
              {fieldErrors.address && (
                  <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    <span>{fieldErrors.address}</span>
                  </div>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">Quản lý chi nhánh <span className="text-slate-400">(tùy chọn)</span></div>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500">
                <option value="">-- Không gán Manager --</option>
                {(managers || []).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.email ? ` (${m.email})` : ''}</option>
                ))}
              </select>
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Chỉ hiển thị các Manager đã có bản ghi nhân viên. Có thể để trống nếu chưa có.
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-600 mb-1">Trạng thái hoạt động</div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500">
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