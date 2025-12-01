import React from "react";
import { useNavigate } from "react-router-dom";
import { listBranches, createBranch } from "../../api/branches";
import { listEmployeesByRole } from "../../api/employees";
import {
  Building2,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  X,
  Edit,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  UserCog,
} from "lucide-react";
import AnimatedDialog from "../common/AnimatedDialog";
import ProvinceAutocomplete from "../common/ProvinceAutocomplete";

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
                    t.kind === "success" &&
                    "bg-amber-50 border-amber-300 text-amber-700",
                    t.kind === "error" &&
                    "bg-rose-50 border-rose-300 text-rose-700",
                    t.kind === "info" &&
                    "bg-white border-slate-300 text-slate-700"
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
  const [managerId, setManagerId] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState({});

  const reset = () => {
    setName("");
    setAddress("");
    setManagerId("");
    setFieldErrors({});
  };

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

    if (!name.trim()) {
      errs.name = "Vui lòng nhập tên chi nhánh";
    } else {
      const nameError = validateBranchName(name);
      if (nameError) errs.name = nameError;
    }

    if (!address.trim()) errs.address = "Vui lòng nhập địa chỉ";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isFormValid = React.useMemo(() => {
    if (!name.trim() || !address.trim()) {
      return false;
    }
    return validateBranchName(name) === null;
  }, [name, address, validateBranchName]);

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  const BRAND_COLOR = "#0079BC";

  return (
      <AnimatedDialog
          open={open}
          onClose={onClose}
          size="lg"
          showCloseButton={true}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tạo cơ sở / chi nhánh mới</h2>
              <p className="text-xs text-slate-500 mt-0.5">Thêm chi nhánh mới vào hệ thống</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* NAME */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Tên chi nhánh</span>
                <span className="text-red-500">*</span>
              </label>
              <ProvinceAutocomplete
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    setFieldErrors((p) => ({ ...p, name: undefined }));
                  }}
                  error={fieldErrors.name}
                  placeholder="Chọn tỉnh/thành phố (VD: Hà Nội, Cần Thơ...)"
              />
              {fieldErrors.name && (
                  <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    <span>{fieldErrors.name}</span>
                  </div>
              )}
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                💡 Chỉ được chọn từ danh sách 63 tỉnh/thành phố Việt Nam. Không được nhập "Chi nhánh" vào tên.
              </div>
            </div>

            {/* ADDRESS */}
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
                          : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                  }`}
                  placeholder="VD: 123 Đường ABC, Quận XYZ, TP. Hà Nội"
              />
              {fieldErrors.address && (
                  <div className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    <span>{fieldErrors.address}</span>
                  </div>
              )}
            </div>

            {/* MANAGER (optional) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <UserCog className="h-4 w-4 text-slate-400" />
                <span>Quản lý chi nhánh</span>
                <span className="text-slate-400 text-xs">(tùy chọn)</span>
              </label>
              <select
                  value={managerId}
                  onChange={(e) => {
                    setManagerId(e.target.value);
                    setFieldErrors((p) => ({ ...p, managerId: undefined }));
                  }}
                  className={`w-full border rounded-lg px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                      fieldErrors.managerId
                          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                          : "border-slate-300 focus:border-[#0079BC]/50 focus:ring-[#0079BC]/20"
                  }`}
              >
                <option value="">-- Không gán Manager --</option>
                {availableManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.email ? ` (${m.email})` : ''}
                    </option>
                ))}
              </select>
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Chỉ hiển thị các Manager đã có bản ghi nhân viên. Có thể để trống nếu chưa có. Số điện thoại sẽ lấy từ thông tin Manager.
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex justify-end gap-3">
            <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-[0.98]"
            >
              Hủy
            </button>

            <button
                onClick={() => {
                  if (!validate()) return;
                  onSave({
                    name: name.trim(),
                    address: address.trim(),
                    managerId: managerId ? Number(managerId) : null,
                  });
                }}
                disabled={!isFormValid}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                style={{ backgroundColor: BRAND_COLOR }}
            >
              Lưu chi nhánh
            </button>
          </div>
        </div>
      </AnimatedDialog>
  );
}

/* =================== PAGE ===================== */

export default function AdminBranchesPage() {
  const { toasts, push } = useToasts();
  const navigate = useNavigate();

  const [managers, setManagers] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);

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
      const arr = Array.isArray(data)
          ? data
          : data?.items || data?.content || [];

      const mapped = arr.map((b) => {
        let managerName = null;

        if (typeof b.manager === "string") managerName = b.manager;
        else if (typeof b.manager === "object" && b.manager !== null)
          managerName =
              b.manager.fullName ||
              b.manager.name ||
              b.manager.username ||
              null;

        if (!managerName)
          managerName = b.managerName || b.managerFullName || null;

        return {
          id: b.id,
          name: b.branchName || b.name,
          address: b.location || "",
          managerName: managerName,
          employeeCount: b.employeeCount || 0,
          status: b.status || "ACTIVE",
        };
      });

      setBranches(mapped);
    } catch (e) {
      push("Tải danh sách chi nhánh thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    onRefresh();
  }, []);

  const handleCreateBranch = async ({ name, address, managerId }) => {
    try {
      await createBranch({
        branchName: name,
        location: address,
        managerId,
      });
      push("Tạo chi nhánh thành công", "success");
      setOpenCreate(false);
      onRefresh();
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.message || "Tạo chi nhánh thất bại";
      push(errorMsg, "error", 4000);
    }
  };

  React.useEffect(() => {
    (async () => {
      try {
        const emps = await listEmployeesByRole("Manager");
        if (Array.isArray(emps)) {
          const mgrs = emps.map((e) => ({
            id: e.userId,
            name: e.userFullName || "",
            email: e.email || "",
          }));
          setManagers(mgrs);
        } else {
          setManagers([]);
        }
      } catch {
        setManagers([]);
      }
    })();
  }, []);

  const onEditBranch = (branch) => {
    navigate(`/admin/branches/${branch.id}`);
  };

  const BRAND_COLOR = "#0079BC";

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
        <Toasts toasts={toasts} />

        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-4 mb-6">
            <div className="flex items-start gap-3 flex-1 min-w-[220px]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="text-xs text-slate-500 leading-none mb-1">
                  Hệ thống chi nhánh / cơ sở
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  Danh sách Cơ sở / Chi nhánh
                </h1>
                <p className="text-xs text-slate-500 mt-1">Quản lý các chi nhánh và cơ sở trong hệ thống</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                  onClick={() => setOpenCreate(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_COLOR }}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Tạo cơ sở mới</span>
              </button>

              <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <RefreshCw
                    className={cls(
                        "h-4 w-4 text-slate-500",
                        loading ? "animate-spin" : ""
                    )}
                />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Danh sách chi nhánh</h3>
                <div className="text-xs text-slate-500">
                  {branches.length} chi nhánh
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Tên chi nhánh
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Địa chỉ
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Quản lý
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Nhân viên
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="text-right font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                {current.length === 0 ? (
                    <tr>
                      <td
                          colSpan={6}
                          className="px-6 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="text-slate-500 font-medium">Không có chi nhánh nào</div>
                          <div className="text-xs text-slate-400">Nhấn "Tạo cơ sở mới" để thêm chi nhánh đầu tiên</div>
                        </div>
                      </td>
                    </tr>
                ) : (
                    current.map((b) => (
                        <tr key={b.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{b.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2 text-slate-700">
                              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{b.address || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-700">
                              <UserCog className="h-4 w-4 text-slate-400" />
                              <span className="text-sm">{b.managerName || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-700">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="text-sm font-medium">{b.employeeCount || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                                onClick={() => onEditBranch(b)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-[#0079BC]/50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all active:scale-[0.98] group-hover:shadow-md"
                            >
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

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, branches.length)} / {branches.length} chi nhánh
              </div>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>

                <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                  Trang <span className="font-semibold">{page}</span> / {totalPages}
                </div>

                <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <CreateBranchModal
            open={openCreate}
            onClose={() => setOpenCreate(false)}
            onSave={handleCreateBranch}
            availableManagers={managerOptions}
        />
      </div>
  );
}


// import React from "react";
// import { useNavigate } from "react-router-dom";
// import { listBranches, createBranch } from "../../api/branches";
// import { listEmployeesByRole } from "../../api/employees";
// import { listUsers, listRoles } from "../../api/users";
// import { Building2, PlusCircle, RefreshCw, ShieldCheck, X, Edit, ChevronLeft, ChevronRight } from "lucide-react";

// const cls = (...a) => a.filter(Boolean).join(" ");

// function StatusBadge({ status }) {
//   if (status === "ACTIVE") {
//     return (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-sky-50 text-sky-700 border-sky-300">
//         <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
//         <span>Äang hoáº¡t Ä‘á»™ng</span>
//       </span>
//     );
//   }
//   return (
//     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-slate-100 text-slate-600 border-slate-300">
//       <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
//       <span>Táº¡m dá»«ng</span>
//     </span>
//   );
// }

// function useToasts() {
//   const [toasts, setToasts] = React.useState([]);
//   const push = (msg, kind = "info", ttl = 2400) => {
//     const id = Math.random().toString(36).slice(2);
//     setToasts((arr) => [...arr, { id, msg, kind }]);
//     setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), ttl);
//   };
//   return { toasts, push };
// }

// function Toasts({ toasts }) {
//   return (
//     <div className="fixed top-4 right-4 z-50 space-y-2">
//       {toasts.map((t) => (
//         <div
//           key={t.id}
//           className={cls(
//             "rounded-md px-3 py-2 text-sm shadow border",
//             t.kind === "success" && "bg-emerald-50 border-emerald-300 text-emerald-700",
//             t.kind === "error" && "bg-rose-50 border-rose-300 text-rose-700",
//             t.kind === "info" && "bg-white border-slate-300 text-slate-700"
//           )}
//         >
//           {t.msg}
//         </div>
//       ))}
//     </div>
//   );
// }

// function CreateBranchModal({ open, onClose, onSave, availableManagers }) {
//   const [name, setName] = React.useState("");
//   const [address, setAddress] = React.useState("");
//   const [phone, setPhone] = React.useState("");
//   const [managerId, setManagerId] = React.useState("");
//   const [fieldErrors, setFieldErrors] = React.useState({});

//   const reset = () => {
//     setName("");
//     setAddress("");
//     setPhone("");
//     setManagerId("");
//     setFieldErrors({});
//   };

//   const validatePhone = React.useCallback((phoneStr) => {
//     const cleaned = phoneStr.trim();
//     // Cho phep cac dinh dang pho bien: 9-12 chu so,
//     // co the co dau cach/gach ngang hoac ma quoc gia +84.
//     if (/[^0-9\s\-+]/.test(cleaned)) {
//       return "Chi dung so, dau cach, gach ngang hoac +84";
//     }

//     const digitsOnly = cleaned.replace(/[^0-9]/g, "");
//     if (digitsOnly.length < 9 || digitsOnly.length > 12) {
//       return "So dien thoai can 9-12 chu so (co the kem +84)";
//     }

//     if (cleaned.startsWith("+") && !digitsOnly.startsWith("84")) {
//       return "Khi dung ma quoc gia, vui long nhap +84...";
//     }

//     return null; // Valid
//   }, []);
//   const validate = () => {
//     const errs = {};
//     if (!name.trim()) errs.name = "Vui lÃ²ng nháº­p tÃªn chi nhÃ¡nh";
//     if (!address.trim()) errs.address = "Vui lÃ²ng nháº­p Ä‘á»‹a chá»‰";

//     if (!phone.trim()) {
//       errs.phone = "Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i";
//     } else {
//       const phoneError = validatePhone(phone);
//       if (phoneError) errs.phone = phoneError;
//     }

//     if (!managerId) errs.managerId = "Vui lÃ²ng chá»n quáº£n lÃ½ chi nhÃ¡nh";
//     setFieldErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   // Kiá»ƒm tra form cÃ³ há»£p lá»‡ khÃ´ng (Ä‘á»ƒ enable/disable nÃºt)
//   const isFormValid = React.useMemo(() => {
//     if (!name.trim() || !address.trim() || !phone.trim() || !managerId) {
//       return false;
//     }
//     const phoneError = validatePhone(phone);
//     return phoneError === null;
//   }, [name, address, phone, managerId, validatePhone]);

//   React.useEffect(() => {
//     if (!open) reset();
//   }, [open]);

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
//       <div className="w-full max-w-lg rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
//         <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
//           <div className="h-9 w-9 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
//             <Building2 className="h-5 w-5" />
//           </div>
//           <div className="font-semibold text-slate-900">Táº¡o cÆ¡ sá»Ÿ / chi nhÃ¡nh má»›i</div>
//           <button onClick={onClose} className="ml-auto rounded-md hover:bg-slate-100 p-1 text-slate-500 hover:text-slate-700 transition-colors">
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         <div className="p-4 space-y-4 text-sm">
//           <div>
//             <div className="text-xs text-slate-600 mb-1">TÃªn chi nhÃ¡nh <span className="text-rose-500">*</span></div>
//             <input
//               value={name}
//               onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
//               className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 ${fieldErrors.name ? "border-rose-300" : "border-slate-300"}`}
//               placeholder="VD: Chi nhÃ¡nh HÃ  Ná»™i"
//             />
//             {fieldErrors.name && <div className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</div>}
//           </div>
//           <div>
//             <div className="text-xs text-slate-600 mb-1">Äá»‹a chá»‰ <span className="text-rose-500">*</span></div>
//             <input
//               value={address}
//               onChange={(e) => { setAddress(e.target.value); setFieldErrors((p) => ({ ...p, address: undefined })); }}
//               className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 ${fieldErrors.address ? "border-rose-300" : "border-slate-300"}`}
//               placeholder="Sá»‘ 1 TrÃ ng Tiá»n, HoÃ n Kiáº¿m..."
//             />
//             {fieldErrors.address && <div className="text-[11px] text-rose-600 mt-1">{fieldErrors.address}</div>}
//           </div>
//           <div>
//             <div className="text-xs text-slate-600 mb-1">Sá»‘ Ä‘iá»‡n thoáº¡i <span className="text-rose-500">*</span></div>
//             <input
//               value={phone}
//               onChange={(e) => {
//                 // Cho phÃ©p nháº­p sá»‘, dáº¥u cÃ¡ch, gáº¡ch ngang vÃ  dáº¥u +
//                 const cleaned = e.target.value.replace(/[^0-9\s\-+]/g, "");
//                 setPhone(cleaned);
//                 setFieldErrors((p) => ({ ...p, phone: undefined }));
//               }}
//               className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 ${fieldErrors.phone ? "border-rose-300" : "border-slate-300"}`}
//               placeholder="0123456789 hoáº·c +84 123 456 789"
//               maxLength={15}
//             />
//             {fieldErrors.phone && <div className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</div>}
//             {!fieldErrors.phone && phone.trim() && (
//               <div className="text-[11px] text-slate-500 mt-1">
//                 âœ“ Há»— trá»£: 0123456789, +84123456789, 0123 456 789
//               </div>
//             )}
//           </div>
//           <div>
//             <div className="text-xs text-slate-600 mb-1">Quáº£n lÃ½ chi nhÃ¡nh <span className="text-rose-500">*</span></div>
//             <select
//               value={managerId}
//               onChange={(e) => { setManagerId(e.target.value); setFieldErrors((p) => ({ ...p, managerId: undefined })); }}
//               className={`w-full bg-white border rounded-md px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 ${fieldErrors.managerId ? "border-rose-300" : "border-slate-300"}`}
//             >
//               <option value="">-- Chá»n quáº£n lÃ½ --</option>
//               {availableManagers.map((m) => (
//                 <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
//               ))}
//             </select>
//             {fieldErrors.managerId && <div className="text-[11px] text-rose-600 mt-1">{fieldErrors.managerId}</div>}
//             <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">Hiá»ƒn thá»‹ táº¥t cáº£ ngÆ°á»i dÃ¹ng cÃ³ vai trÃ² MANAGER.</div>
//           </div>
//           <div className="text-[11px] text-slate-500 leading-relaxed">
//             Sau khi táº¡o, chi nhÃ¡nh sáº½ á»Ÿ tráº¡ng thÃ¡i <b className="text-slate-700">ACTIVE</b> vÃ  Manager sáº½ Ä‘Æ°á»£c gÃ¡n vÃ o chi nhÃ¡nh Ä‘Ã³.
//           </div>
//         </div>

//         <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-2">
//           <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">Há»§y</button>
//           <button
//             onClick={() => {
//               if (!validate()) return;
//               onSave({ name: name.trim(), address: address.trim(), phone: phone.trim(), managerId: Number(managerId) });
//             }}
//             disabled={!isFormValid}
//             className="rounded-md bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
//           >
//             LÆ°u chi nhÃ¡nh
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function AdminBranchesPage() {
//   const { toasts, push } = useToasts();
//   const navigate = useNavigate();

//   const [managers, setManagers] = React.useState([]);
//   const [branches, setBranches] = React.useState([]);
//   const [page, setPage] = React.useState(1);
//   const [pageSize, setPageSize] = React.useState(10);
//   const [loading, setLoading] = React.useState(false);
//   const [openCreate, setOpenCreate] = React.useState(false);

//   const managerOptions = React.useMemo(() => managers, [managers]);
//   const totalPages = Math.max(1, Math.ceil(branches.length / pageSize));
//   const current = React.useMemo(() => {
//     const start = (page - 1) * pageSize;
//     return branches.slice(start, start + pageSize);
//   }, [branches, page, pageSize]);

//   React.useEffect(() => {
//     if (page > totalPages) setPage(totalPages);
//   }, [page, totalPages]);

//   const onRefresh = async () => {
//     setLoading(true);
//     try {
//       const data = await listBranches({ page: 0, size: 100 });
//       console.log("API Response:", data);
//       const arr = Array.isArray(data) ? data : (data?.items || data?.content || []);
//       console.log("Branches array:", arr);
//       const mapped = arr.map((b) => {
//         // Xá»­ lÃ½ manager name tá»« nhiá»u Ä‘á»‹nh dáº¡ng cÃ³ thá»ƒ
//         let managerName = null;
//         if (typeof b.manager === 'string') {
//           managerName = b.manager;
//         } else if (typeof b.manager === 'object' && b.manager !== null) {
//           managerName = b.manager.fullName || b.manager.name || b.manager.username || null;
//         }
//         // Fallback sang cÃ¡c trÆ°á»ng khÃ¡c
//         if (!managerName) {
//           managerName = b.managerName || b.managerFullName || null;
//         }

//         return {
//           id: b.id,
//           name: b.branchName || b.name,
//           address: b.location || "",
//           phone: b.phone || "",
//           managerName: managerName,
//           employeeCount: b.employeeCount || 0,
//           status: b.status || "ACTIVE",
//         };
//       });
//       console.log("Mapped branches:", mapped);
//       setBranches(mapped);
//     } catch (e) {
//       console.error("Error loading branches:", e);
//       push("Táº£i danh sÃ¡ch chi nhÃ¡nh tháº¥t báº¡i", "error");
//     } finally {
//       setLoading(false);
//     }
//   };
//   React.useEffect(() => { onRefresh(); }, []);

//   const handleCreateBranch = async ({ name, address, phone, managerId }) => {
//     try {
//       await createBranch({ branchName: name, location: address, phone, managerId });
//       push("Táº¡o chi nhÃ¡nh thÃ nh cÃ´ng", "success");
//       setOpenCreate(false);
//       onRefresh();
//     } catch (e) {
//       push("Táº¡o chi nhÃ¡nh tháº¥t báº¡i", "error");
//     }
//   };

//   React.useEffect(() => {
//     (async () => {
//       try {
//         const emps = await listEmployeesByRole("Manager");
//         if (Array.isArray(emps)) {
//           const mgrs = emps.map((e) => ({ id: e.userId, name: e.userFullName || "", email: e.email || "", branchId: e.branchId || null }));
//           setManagers(mgrs);
//           return;
//         }
//       } catch { }
//       try {
//         const roles = await listRoles();
//         const managerRole = (roles || []).find((r) => (r.roleName || r.name || "").toUpperCase() === "MANAGER");
//         if (managerRole?.id != null) {
//           const users = await listUsers({ roleId: managerRole.id });
//           const mgrs = (users || []).map((u) => ({ id: u.id, name: u.fullName || u.username || "", email: u.email || "", branchId: null }));
//           setManagers(mgrs);
//         }
//       } catch { }
//     })();
//   }, []);

//   const onEditBranch = (branch) => {
//     navigate(`/admin/branches/${branch.id}`);
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
//       <Toasts toasts={toasts} />

//       <div className="flex flex-wrap items-start gap-4 mb-5">
//         <div className="flex items-start gap-3 flex-1 min-w-[220px]">
//           <div className="h-10 w-10 rounded-md bg-sky-600 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(2,132,199,.35)]">
//             <Building2 className="h-5 w-5" />
//           </div>
//           <div className="flex flex-col">
//             <div className="text-[11px] text-slate-500 leading-none mb-1">Há»‡ thá»‘ng chi nhÃ¡nh / cÆ¡ sá»Ÿ</div>
//             <h1 className="text-lg font-semibold text-slate-900 leading-tight">Danh sÃ¡ch CÆ¡ sá»Ÿ / Chi nhÃ¡nh</h1>
//           </div>
//         </div>

//         <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 ml-auto">
//           <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors">
//             <PlusCircle className="h-4 w-4" />
//             <span>Táº¡o cÆ¡ sá»Ÿ má»›i</span>
//           </button>
//           <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm disabled:opacity-50">
//             <RefreshCw className={cls("h-4 w-4 text-slate-500", loading ? "animate-spin" : "")} />
//             <span>LÃ m má»›i</span>
//           </button>
//         </div>
//       </div>

//       <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
//         <div className="px-4 py-3 border-b border-slate-200 text-sm text-slate-600">Danh sÃ¡ch chi nhÃ¡nh</div>
//         <div className="overflow-x-auto">
//           <table className="min-w-full text-sm">
//             <thead>
//               <tr className="bg-slate-50 text-slate-600">
//                 <th className="text-left font-medium px-4 py-2">TÃŠN CHI NHÃNH</th>
//                 <th className="text-left font-medium px-4 py-2">Äá»ŠA CHá»ˆ</th>
//                 <th className="text-left font-medium px-4 py-2">QUáº¢N LÃ CHI NHÃNH</th>
//                 <th className="text-left font-medium px-4 py-2">NHÃ‚N VIÃŠN</th>
//                 <th className="text-left font-medium px-4 py-2">TRáº NG THÃI</th>
//                 <th className="text-right font-medium px-4 py-2">HÃ€NH Äá»˜NG</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-200">
//               {current.length === 0 ? (
//                 <tr>
//                   <td colSpan={6} className="px-4 py-6 text-center text-slate-500">KhÃ´ng cÃ³ chi nhÃ¡nh nÃ o.</td>
//                 </tr>
//               ) : (
//                 current.map((b) => (
//                   <tr key={b.id} className="hover:bg-slate-50">
//                     <td className="px-4 py-2 text-slate-800 font-medium">{b.name}</td>
//                     <td className="px-4 py-2 text-slate-700">{b.address}</td>
//                     <td className="px-4 py-2 text-slate-700">{b.managerName || "-"}</td>
//                     <td className="px-4 py-2 text-slate-700">{b.employeeCount || 0}</td>
//                     <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
//                     <td className="px-4 py-2 text-right">
//                       <button onClick={() => onEditBranch(b)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm">
//                         <Edit className="h-3.5 w-3.5" />
//                         Sá»­a
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-3 text-sm text-slate-700">
//           <div className="flex items-center gap-1">
//             <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm disabled:opacity-50">
//               <ChevronLeft className="h-4 w-4" />
//             </button>
//             <div>Trang {page}/{totalPages}</div>
//             <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm disabled:opacity-50">
//               <ChevronRight className="h-4 w-4" />
//             </button>
//           </div>
//           <div className="ml-auto flex items-center gap-2">
//             <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white shadow-sm">
//               {[10, 20, 50, 100].map((n) => (
//                 <option key={n} value={n}>{n}/trang</option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       <CreateBranchModal open={openCreate} onClose={() => setOpenCreate(false)} onSave={handleCreateBranch} availableManagers={managerOptions} />
//     </div>
//   );
// }
