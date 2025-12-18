import React from "react";
import { useNavigate } from "react-router-dom";
import { listUsers, listUsersByBranch, listRoles } from "../../api/users";
import { listEmployeesByRole, listEmployees, listEmployeesByBranch } from "../../api/employees";
import { RefreshCw, Edit2, ShieldCheck, Users, Search, Filter, Mail, Phone, Shield, UserPlus } from "lucide-react";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";
import { getDriverProfileByUser } from "../../api/drivers";
import Pagination from "../common/Pagination";
import UserAvatar from "../common/UserAvatar";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusBadge({ value }) {
  const map = {
    ACTIVE: "bg-sky-50 text-sky-700 border-sky-300",
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const currentRole = React.useMemo(() => getCurrentRole(), []);
  const currentUserId = React.useMemo(() => getStoredUserId(), []);
  const isManagerView = currentRole === ROLES.MANAGER;
  const isAccountantView = currentRole === ROLES.ACCOUNTANT;
  const [managerBranchInfo, setManagerBranchInfo] = React.useState({ id: null, name: "" });
  const [managerBranchLoading, setManagerBranchLoading] = React.useState(isManagerView || isAccountantView);
  const [managerBranchError, setManagerBranchError] = React.useState("");
  const [branches, setBranches] = React.useState([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState("");

  React.useEffect(() => {
    if (!isManagerView && !isAccountantView) {
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
        // Load employees to find current user's branch
        const { getEmployeeByUserId } = await import("../../api/employees");
        const emp = await getEmployeeByUserId(currentUserId);
        if (cancelled) return;

        const empData = emp?.data || emp;
        if (empData?.branchId) {
          setManagerBranchInfo({ id: empData.branchId, name: empData.branchName || "" });
        } else {
          setManagerBranchInfo({ id: null, name: "" });
          setManagerBranchError("Không xác định được chi nhánh của bạn.");
        }
      } catch (error) {
        console.error("Failed to load branch:", error);
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
  }, [isManagerView, isAccountantView, currentUserId]);

  const branchFilterValue = (isManagerView || isAccountantView) ? managerBranchInfo.id : undefined;
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
          // Hide Admin role from all views
          const userRoleName = String(u.roleName || "").trim().toLowerCase();
          if (userRoleName === "admin" || userRoleName === "quản trị viên") {
            return false;
          }

          // For Manager role, filter out users with role >= Manager (only show subordinates)
          if (isManagerView) {
            // Define role hierarchy: Admin > Manager > Consultant > Driver > Accountant
            const managerOrHigherRoles = ["manager", "quản lý"];
            if (managerOrHigherRoles.includes(userRoleName)) {
              return false; // Hide Manager roles from Manager view
            }
          }

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

          // Admin branch filter (chỉ áp dụng cho Admin)
          if (!isManagerView && !isAccountantView && selectedBranchId) {
            const userBranchId = String(u.branchId || "");
            if (userBranchId !== selectedBranchId) return false;
          }

          // Manager/Accountant branch filter - chỉ hiện nhân viên trong chi nhánh
          if ((isManagerView || isAccountantView) && branchFilterValue) {
            const userBranchId = Number(u.branchId || 0);
            if (userBranchId !== branchFilterValue) return false;
          }

          return true;
        });
      },
      [normalizedKeyword, selectedRoleName, normalizedStatus, isManagerView, selectedBranchId, branchFilterValue]
  );

  const [allUsers, setAllUsers] = React.useState([]);

  const onRefresh = React.useCallback(async () => {
    if (isManagerView || isAccountantView) {
      if (managerBranchLoading) return;
      if (!branchFilterValue) {
        setAllUsers([]);
        setUsers([]);
        return;
      }
    }
    setLoading(true);
    try {
      // Dùng employees API vì có branchId
      let data;
      if ((isManagerView || isAccountantView) && branchFilterValue) {
        data = await listEmployeesByBranch(branchFilterValue);
      } else {
        data = await listEmployees();
      }

      let arr = [];
      if (Array.isArray(data?.data)) {
        arr = data.data;
      } else if (Array.isArray(data)) {
        arr = data;
      }
      // Map employee data to user-like structure
      const mapped = arr.map(emp => ({
        id: emp.userId || emp.id,
        empId: emp.id,
        fullName: emp.userFullName,
        email: emp.userEmail,
        phone: emp.userPhone,
        roleName: emp.roleName,
        roleId: emp.roleId,
        branchId: emp.branchId,
        branchName: emp.branchName,
        status: emp.status,
        // Avatar path lấy từ backend (userAvatar) nếu có
        avatar: emp.userAvatar || emp.avatar || emp.avatarUrl,
      }));
      setAllUsers(mapped);
    } finally {
      setLoading(false);
    }
  }, [
    branchFilterValue,
    isManagerView,
    isAccountantView,
    managerBranchLoading,
  ]);

  const refreshRef = React.useRef(onRefresh);
  React.useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  React.useEffect(() => {
    if (isManagerView || isAccountantView) {
      if (managerBranchLoading || !branchFilterValue) return;
    }
    refreshRef.current();
  }, [isManagerView, isAccountantView, managerBranchLoading, branchFilterValue]);

  // Apply filters whenever allUsers or filter values change
  React.useEffect(() => {
    const filtered = applyFilters(allUsers);
    setUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allUsers, applyFilters]);

  // Pagination calculations
  const totalPages = Math.ceil(users.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const currentUsers = users.slice(startIdx, endIdx);

  React.useEffect(() => {
    (async () => {
      try {
        const rs = await listRoles();
        // Handle different response formats
        const rolesList = Array.isArray(rs)
            ? rs
            : Array.isArray(rs?.data)
                ? rs.data
                : Array.isArray(rs?.items)
                    ? rs.items
                    : [];
        setRoles(rolesList);
      } catch (error) {
        console.error("Failed to load roles:", error);
        setRoles([]);
      }
    })();
  }, []);

  // Load branches for Admin filter (not for Manager or Accountant)
  React.useEffect(() => {
    if (isManagerView || isAccountantView) return; // Only load for Admin

    (async () => {
      try {
        const { listBranches } = await import("../../api/branches");
        const data = await listBranches({ page: 0, size: 100 });
        let arr = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (data?.data?.items) {
          arr = data.data.items;
        } else if (data?.data?.content) {
          arr = data.data.content;
        } else if (data?.items) {
          arr = data.items;
        } else if (data?.content) {
          arr = data.content;
        } else if (Array.isArray(data?.data)) {
          arr = data.data;
        }
        setBranches(arr);
      } catch (error) {
        console.error("Failed to load branches:", error);
        setBranches([]);
      }
    })();
  }, [isManagerView]);

  const BRAND_COLOR = "#0079BC";

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 p-5">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-4 mb-6">
            <div className="flex items-start gap-3 flex-1 min-w-[220px]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                <Users className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="text-xs text-slate-500 leading-none mb-1">
                  Quản trị hệ thống
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {isManagerView || isAccountantView ? "Danh sách nhân viên" : "Quản lý người dùng"}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {isManagerView || isAccountantView ? "Quản lý nhân viên trong chi nhánh" : "Quản lý tài khoản và phân quyền người dùng"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Chỉ Admin và Manager mới có nút thêm nhân viên, Accountant chỉ xem */}
              {!isAccountantView && (
                  <button
                      onClick={() => navigate('/admin/users/new')}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                      style={{ backgroundColor: BRAND_COLOR }}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Thêm nhân viên</span>
                  </button>
              )}
              <button
                  onClick={onRefresh}
                  disabled={loading || ((isManagerView || isAccountantView) && (managerBranchLoading || !branchFilterValue))}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                <RefreshCw className={cls("h-4 w-4", loading && "animate-spin")} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* Manager/Accountant View Notice */}
          {(isManagerView || isAccountantView) && (
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-sky-700" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sky-800 text-sm mb-1">
                    {isManagerView ? "Chế độ Manager" : "Chế độ Kế toán"}
                  </div>
                  <div className="text-sm text-sky-800">
                    {managerBranchLoading
                        ? "Đang xác định chi nhánh phụ trách..."
                        : branchFilterValue
                            ? "Chỉ hiển thị tài khoản thuộc chi nhánh " + (managerBranchInfo.name || ("#" + branchFilterValue)) + "."
                            : managerBranchError || "Không xác định được chi nhánh của bạn. Hãy liên hệ Admin."}
                  </div>
                </div>
              </div>
          )}

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[240px] flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-[#0079BC]/50 focus-within:ring-2 focus-within:ring-[#0079BC]/20 transition-all">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tìm theo tên hoặc email"
                    className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-[#0079BC]/50 focus-within:ring-2 focus-within:ring-[#0079BC]/20 transition-all">
                <Shield className="h-4 w-4 text-slate-400" />
                <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="bg-transparent outline-none text-sm text-slate-900 border-none cursor-pointer"
                >
                  <option value="">-- Vai trò --</option>
                  {roles.map(r => (<option key={r.id} value={r.id}>{r.roleName || r.name}</option>))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-[#0079BC]/50 focus-within:ring-2 focus-within:ring-[#0079BC]/20 transition-all">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-transparent outline-none text-sm text-slate-900 border-none cursor-pointer"
                >
                  <option value="">-- Trạng thái --</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              {!isManagerView && !isAccountantView && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus-within:border-[#0079BC]/50 focus-within:ring-2 focus-within:ring-[#0079BC]/20 transition-all">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="bg-transparent outline-none text-sm text-slate-900 border-none cursor-pointer"
                    >
                      <option value="">-- Tất cả chi nhánh --</option>
                      {branches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.branchName || b.name}
                          </option>
                      ))}
                    </select>
                  </div>
              )}

              <button
                  onClick={onRefresh}
                  disabled={(isManagerView || isAccountantView) && (managerBranchLoading || !branchFilterValue)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_COLOR }}
              >
                <Filter className="h-4 w-4" />
                <span>Lọc</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Danh sách người dùng</h3>
                <div className="text-xs text-slate-500">
                  {users.length} người dùng
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    SĐT
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="text-left font-semibold px-6 py-3.5 text-xs text-slate-700 uppercase tracking-wider">
                    Chi nhánh
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
                {currentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Users className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="text-slate-500 font-medium">Không có dữ liệu</div>
                          <div className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc tạo người dùng mới</div>
                        </div>
                      </td>
                    </tr>
                ) : currentUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.fullName} avatar={u.avatar} size={32} />
                          <div className="font-semibold text-slate-900">{u.fullName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{u.phone || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{u.roleName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{u.branchName || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge value={u.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Chỉ Admin và Manager mới có nút Chỉnh sửa */}
                          {!isAccountantView ? (
                              <button
                                  onClick={async () => {
                                    // Nếu là Manager và user có role là Driver, redirect đến driver detail page
                                    if (isManagerView && u.roleName?.toUpperCase() === "DRIVER") {
                                      try {
                                        // Lấy driver profile để có driverId
                                        const driverProfile = await getDriverProfileByUser(u.id);
                                        // Response có thể là { driverId, ... } hoặc { data: { driverId, ... } }
                                        const driverId = driverProfile?.driverId || driverProfile?.data?.driverId || driverProfile?.id;
                                        if (driverId) {
                                          navigate(`/manager/drivers/${driverId}`);
                                          return;
                                        }
                                      } catch (error) {
                                        console.error("Failed to get driver profile:", error);
                                        // Fallback to user edit page if error
                                      }
                                    }
                                    // Default: navigate to user edit page (cho Admin hoặc non-Driver users)
                                    navigate(`/admin/users/${u.id}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-[#0079BC]/50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all active:scale-[0.98] group-hover:shadow-md"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Chỉnh sửa
                              </button>
                          ) : (
                              <span className="text-xs text-slate-400 italic">Chỉ xem</span>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                  <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      pageSize={pageSize}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      totalItems={users.length}
                  />
                </div>
            )}
          </div>
        </div>
      </div>
  );
}





