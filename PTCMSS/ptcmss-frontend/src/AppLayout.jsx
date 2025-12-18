import React from "react";
import { Routes, Route, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  Settings,
  Users,
  CarFront,
  ClipboardList,
  CalendarClock,
  DollarSign,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Bell,
  Search,
  Shield,
  LayoutDashboard,
  Briefcase,
  AlertTriangle,
  FileText,
  Bus, // Icon cho logo - vận tải hành khách
  // Các icon khác có thể dùng: Navigation, Route, Truck, Car, MapPin
} from "lucide-react";
import { logout as apiLogout } from "./api/auth";
import {
  ROLES,
  ALL_ROLES,
  getCurrentRole,
  getHomePathForRole,
  getStoredUsername,
  getStoredRoleLabel,
  hasActiveSession,
} from "./utils/session";
import { WebSocketProvider, useWebSocket } from "./contexts/WebSocketContext";
import NotificationToast from "./components/common/NotificationToast";
import { useNotifications } from "./hooks/useNotifications";

// Menu items cho từng role - hiển thị flat list, không dùng accordion
const SIDEBAR_ITEMS_BY_ROLE = {
  // Consultant (Tư vấn viên - 7 options)
  [ROLES.CONSULTANT]: [
    { label: "Bảng điều khiển", to: "/orders/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Danh sách đơn hàng", to: "/orders", icon: ClipboardList },
    { label: "Tạo đơn hàng", to: "/orders/new", icon: ClipboardList },
    { label: "Danh sách khách hàng", to: "/consultant/customers", icon: Users },
    { label: "Danh sách xe", to: "/consultant/vehicles", icon: CarFront },
    { label: "Danh sách tài xế", to: "/consultant/drivers", icon: Users },
    { label: "Đánh giá tài xế", to: "/consultant/ratings", icon: BarChart3 },
  ],
  // Driver (Tài xế - 8 options)
  [ROLES.DRIVER]: [
    { label: "Bảng điều khiển", to: "/driver/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Lịch làm việc", to: "/driver/schedule", icon: CalendarClock },
    { label: "Danh sách chuyến", to: "/driver/trips-list", icon: ClipboardList },
    { label: "Quản lý sự cố", to: "/driver/incidents", icon: AlertTriangle },
    { label: "Xin nghỉ phép", to: "/driver/leave-request", icon: CalendarClock },
    { label: "Danh sách yêu cầu", to: "/driver/requests", icon: ClipboardList },
    { label: "Hồ sơ tài xế", to: "/driver/profile", icon: Users },
  ],
  // Coordinator (Điều phối viên - 7 options)
  [ROLES.COORDINATOR]: [
    { label: "Bảng điều khiển", to: "/dispatch", icon: LayoutDashboard, exact: true },
    { label: "Cảnh báo chờ duyệt", to: "/dispatch/notifications-dashboard", icon: Bell },
    { label: "Sự cố chuyến đi", to: "/dispatch/incidents", icon: AlertTriangle },
    { label: "Danh sách đơn", to: "/coordinator/orders", icon: ClipboardList },
    { label: "Danh sách tài xế", to: "/coordinator/drivers", icon: Users },
    { label: "Danh sách xe", to: "/coordinator/vehicles", icon: CarFront },
    { label: "Quản lý yêu cầu", to: "/coordinator/expense-management", icon: DollarSign },
  ],
  // Accountant (Kế toán - 8 options)
  [ROLES.ACCOUNTANT]: [
    { label: "Bảng điều khiển", to: "/accounting", icon: LayoutDashboard, exact: true },
    { label: "Báo cáo doanh thu", to: "/accounting/revenue-report", icon: BarChart3 },
    { label: "Báo cáo chi phí", to: "/accounting/expenses", icon: DollarSign },
    { label: "Danh sách hóa đơn", to: "/accounting/invoices", icon: ClipboardList },
    { label: "Duyệt yêu cầu chi phí", to: "/accounting/expense-requests", icon: DollarSign },
    { label: "Danh sách đơn hàng", to: "/accountant/orders", icon: ClipboardList },
    { label: "Danh sách nhân viên", to: "/accountant/users", icon: Users },
    { label: "Danh sách xe", to: "/accountant/vehicles", icon: CarFront },
  ],
  // Manager (Quản lý - 9 options)
  [ROLES.MANAGER]: [
    { label: "Bảng điều khiển", to: "/analytics/manager", icon: LayoutDashboard, exact: true },
    { label: "Báo cáo doanh thu", to: "/accounting/revenue-report", icon: BarChart3 },
    { label: "Báo cáo chi phí", to: "/accounting/expenses", icon: DollarSign },
    { label: "Danh sách đơn hàng", to: "/manager/orders", icon: ClipboardList },
    { label: "Danh sách tài xế", to: "/manager/drivers", icon: Users },
    { label: "Danh sách nhân viên", to: "/admin/users", icon: Users },
    { label: "Danh sách xe", to: "/vehicles", icon: CarFront },
    { label: "Danh sách khách hàng", to: "/manager/customers", icon: Users },
    { label: "Sự cố chuyến đi", to: "/dispatch/incidents", icon: AlertTriangle },
  ],
  // Admin (Quản trị viên - 8 options)
  [ROLES.ADMIN]: [
    { label: "Bảng điều khiển công ty", to: "/analytics/admin", icon: LayoutDashboard },
    { label: "Bảng điều khiển chi nhánh", to: "/analytics/manager", icon: Briefcase },
    { label: "Danh sách chi nhánh", to: "/admin/branches", icon: Briefcase },
    { label: "Danh mục xe", to: "/vehicles/categories", icon: CarFront },
    { label: "Danh sách xe", to: "/vehicles", icon: CarFront },
    { label: "Danh sách nhân viên", to: "/admin/users", icon: Users },
    { label: "Danh sách khách hàng", to: "/admin/customers", icon: Users },
    { label: "Cấu hình hệ thống", to: "/admin/settings", icon: Settings },
  ],
};

// Legacy SIDEBAR_SECTIONS - giữ lại cho backward compatibility
const SIDEBAR_SECTIONS = [];

function useRole() {
  return React.useMemo(() => getCurrentRole(), []);
}

/* ========= IMPORT CÁC PAGE ========= */
/* Module 1 – Quản trị hệ thống */
import SystemSettingsPage from "./components/module 1/SystemSettingsPage.jsx";
import CreateBranchPage from "./components/module 1/CreateBranchPage.jsx";
import AdminBranchesPage from "./components/module 1/AdminBranchesPage.jsx";
import AdminBranchDetailPage from "./components/module 1/AdminBranchDetailPage.jsx";
import AdminUsersPage from "./components/module 1/AdminUsersPage.jsx";
import CustomerListPage from "./components/module 1/CustomerListPage.jsx";
import CreateUserPage from "./components/module 1/CreateUserPage.jsx";
import CreateEmployeeWithUserPage from "./components/module 1/CreateEmployeeWithUserPage.jsx";
import AdminManagersPage from "./components/module 1/AdminManagersPage.jsx";
import UserDetailPage from "./components/module 1/UserDetailPage.jsx";
import UpdateProfilePage from "./components/module 1/UpdateProfilePage.jsx";
import LoginPage from "./components/module 1/LoginPage.jsx";
import SetPasswordPage from "./components/module 1/SetPasswordPage.jsx";
import VerificationSuccessPage from "./components/module 1/VerificationSuccessPage.jsx";
import VerificationErrorPage from "./components/module 1/VerificationErrorPage.jsx";

/* Module 2 – Tài xế */
import DriverDashboard from "./components/module 2/DriverDashboard.jsx";
import DriverProfilePage from "./components/module 2/DriverProfilePage.jsx";
import DriverSchedulePage from "./components/module 2/DriverSchedulePage.jsx";
import DriverLeaveRequestPage from "./components/module 2/DriverLeaveRequestPage.jsx";
import DriverIncidentManagementPage from "./components/module 2/DriverIncidentManagementPage.jsx";
import DriverTripDetailPage from "./components/module 2/DriverTripDetailPage.jsx";
import DriverTripsListPage from "./components/module 2/DriverTripsListPage.jsx";
import DriverRequestsPage from "./components/module 2/DriverRequestsPage.jsx";

/* Module 3 – Phương tiện */
import VehicleCategoryPage from "./components/module 3/VehicleCategoryPage.jsx";
import VehicleCategoryManagePage from "./components/module 3/VehicleCategoryManagePage.jsx";
import VehicleCreatePage from "./components/module 3/VehicleCreatePage.jsx";
import VehicleListPage from "./components/module 3/VehicleListPage.jsx";
import VehicleDetailPage from "./components/module 3/VehicleDetailPage.jsx";

/* Module 4 – Báo giá & Đơn hàng */
import ConsultantDashboardPage from "./components/module 4/ConsultantDashboardPage.jsx";
import CreateOrderPage from "./components/module 4/CreateOrderPage.jsx";
import ConsultantOrderListPage from "./components/module 4/ConsultantOrderListPage.jsx";
import OrderDetailPage from "./components/module 4/OrderDetailPage.jsx";
import EditOrderPage from "./components/module 4/EditOrderPage.jsx";

/* Module 5 – Điều phối / Lịch chạy */
import CoordinatorTimelinePro from "./components/module 5/CoordinatorTimelinePro.jsx";
import ExpenseRequestForm from "./components/module 5/ExpenseRequestForm.jsx";
import NotificationsWidget from "./components/module 5/NotificationsWidget.jsx";
import PendingTripsPage from "./components/module 5/PendingTripsPage.jsx";
import NotificationsDashboard from "./components/module 5/NotificationsDashboard.jsx";
import RatingManagementPage from "./components/module 5/RatingManagementPage.jsx";
import DriverRatingsPage from "./components/module 5/DriverRatingsPage.jsx";
import CoordinatorIncidentListPage from "./components/module 5/CoordinatorIncidentListPage.jsx";
import CoordinatorOrderListPage from "./components/module 5/CoordinatorOrderListPage.jsx";
import CoordinatorDriverListPage from "./components/module 5/CoordinatorDriverListPage.jsx";
import CoordinatorDriverDetailPage from "./components/module 5/CoordinatorDriverDetailPage.jsx";
import CoordinatorDriverTripsPage from "./components/module 5/CoordinatorDriverTripsPage.jsx";
import CoordinatorVehicleListPage from "./components/module 5/CoordinatorVehicleListPage.jsx";
import CoordinatorVehicleDetailPage from "./components/module 5/CoordinatorVehicleDetailPage.jsx";
import CoordinatorExpenseManagementPage from "./components/module 5/CoordinatorExpenseManagementPage.jsx";

/* DemoAssign – mở AssignDriverDialog */
import DemoAssign from "./DemoAssign.jsx";

/* Module 6 – Kế toán & Thanh toán */
import AccountantDashboard from "./components/module 6/AccountantDashboard.jsx";
import InvoiceManagement from "./components/module 6/InvoiceManagement.jsx";
import ExpenseReportPage from "./components/module 6/ExpenseReportPage.jsx";
import ExpenseRequestManagementPage from "./components/module 6/ExpenseRequestManagementPage.jsx";
import ReportRevenuePage from "./components/module 6/ReportRevenuePage.jsx";

/* Module 7 – Báo cáo & Phân tích */
import AdminDashboardPro from "./components/module 7/AdminDashboard.jsx";
import ManagerDashboardPro from "./components/module 7/ManagerDashboard.jsx";

/* ---------------------------------------------------
   SidebarNav
   - Flat list menu - không dùng accordion
   - Mỗi role có menu items riêng
--------------------------------------------------- */
function SidebarNav({ collapsed = false, onToggleSidebar }) {
  const role = useRole();
  const location = useLocation();

  // Load pending payment count for Accountant
  const [pendingPaymentCount, setPendingPaymentCount] = React.useState(0);
  const [pendingExpenseRequestCount, setPendingExpenseRequestCount] = React.useState(0);
  const isAccountant = role === ROLES.ACCOUNTANT;

  React.useEffect(() => {
    if (!isAccountant) return;

    let mounted = true;
    const loadPendingCount = async () => {
      try {
        const { countPendingPayments } = await import("./api/invoices");
        const count = await countPendingPayments();
        if (mounted) {
          setPendingPaymentCount(Number(count) || 0);
        }
      } catch (err) {
        console.error("Error loading pending payment count:", err);
        if (mounted) {
          setPendingPaymentCount(0);
        }
      }
    };

    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAccountant]);

  // Load pending expense request count for Accountant
  React.useEffect(() => {
    if (!isAccountant) return;

    let mounted = true;
    const loadPendingExpenseCount = async () => {
      try {
        const { getPendingExpenseRequests } = await import("./api/expenses");
        const { getEmployeeByUserId } = await import("./api/employees");
        const { getStoredUserId } = await import("./utils/session");

        // Get branchId for accountant
        const userId = getStoredUserId();
        let branchId = null;
        if (userId) {
          try {
            const emp = await getEmployeeByUserId(Number(userId));
            branchId = emp?.branchId || emp?.branch?.id || emp?.branch?.branchId || null;
          } catch (err) {
            console.error("Error loading employee branch for expense count:", err);
          }
        }

        const response = await getPendingExpenseRequests(branchId || undefined);
        const list = Array.isArray(response) ? response : (response?.data || response?.items || []);
        if (mounted) {
          setPendingExpenseRequestCount(list.length || 0);
        }
      } catch (err) {
        console.error("Error loading pending expense request count:", err);
        if (mounted) {
          setPendingExpenseRequestCount(0);
        }
      }
    };

    loadPendingExpenseCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingExpenseCount, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAccountant]);

  // Lấy menu items cho role hiện tại
  const menuItems = React.useMemo(() => {
    return SIDEBAR_ITEMS_BY_ROLE[role] || [];
  }, [role]);

  // Chỉ highlight mục khớp đường dẫn dài nhất để tránh chọn cả trang cha/lẫn trang con
  const activeIndex = React.useMemo(() => {
    let bestIdx = -1;
    let bestLen = -1;
    const path = location.pathname;
    menuItems.forEach((item, idx) => {
      const to = item.to || "";
      if (!to) return;
      const exact = path === to;
      const prefix = path.startsWith(to.endsWith("/") ? to : `${to}/`);
      if (exact || prefix) {
        if (to.length > bestLen) {
          bestLen = to.length;
          bestIdx = idx;
        }
      }
    });
    return bestIdx;
  }, [location.pathname, menuItems]);

  return (
      <aside className="bg-white border-r border-slate-200 flex flex-col shadow-sm h-screen sticky top-0">
        {/* brand / account mini */}
        <div className="px-4 py-4 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50/50">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,121,188,.35)] flex-shrink-0 transition-transform duration-200 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,121,188,.45)]" style={{ backgroundColor: '#0079BC' }}>
            <Bus className="h-5 w-5" />
          </div>
          {!collapsed && (
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <div className="text-slate-900 font-bold text-sm truncate">TranspoManager</div>
                <div className="text-[10px] text-slate-500 leading-tight">Hệ thống quản lý vận tải</div>
              </div>
          )}
          {typeof onToggleSidebar === "function" && (
              <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors flex-shrink-0 ml-auto"
                  title="Ẩn/hiện menu"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
          )}
        </div>

        {/* Menu items - Flat list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
                <NavLink
                    key={`${item.to}-${index}`}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive: navActive }) => {
                      // Chỉ dùng activeIndex (isActive) để tránh nhiều tab cùng sáng màu
                      const active = isActive || (item.exact && navActive);
                      const base = "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200 ease-in-out";
                      if (active) {
                        return [
                          base,
                          "bg-gradient-to-r from-[#0079BC]/10 to-sky-50 text-[#0079BC] font-semibold shadow-sm",
                          "border-l-[3px] border-[#0079BC]",
                        ].join(" ");
                      }
                      return [
                        base,
                        "text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100/50",
                        "hover:text-slate-900 border-l-[3px] border-transparent hover:border-slate-300",
                      ].join(" ");
                    }}
                >
                  {Icon && (
                      <Icon className={`h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                          location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))
                              ? "text-[#0079BC]"
                              : "text-slate-500 group-hover:text-slate-700"
                      }`} />
                  )}
                  <span className="truncate flex-1">{item.label}</span>
                  {/* Badge for pending payments on Invoice List */}
                  {isAccountant && item.to === "/accounting/invoices" && pendingPaymentCount > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500 text-white min-w-[18px] text-center">
                  {pendingPaymentCount > 99 ? "99+" : pendingPaymentCount}
                </span>
                  )}
                  {/* Badge for pending expense requests */}
                  {isAccountant && item.to === "/accounting/expense-requests" && pendingExpenseRequestCount > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500 text-white min-w-[18px] text-center">
                  {pendingExpenseRequestCount > 99 ? "99+" : pendingExpenseRequestCount}
                </span>
                  )}
                </NavLink>
            );
          })}
        </nav>
      </aside>
  );
}
/* ---------------------------------------------------
   Topbar
   - nền trắng
   - viền dưới + bóng mờ nhẹ
   - Admin info và nút đăng xuất ở bên phải
--------------------------------------------------- */
function Topbar({ onToggleSidebar, sidebarCollapsed = false }) {
  const navigate = useNavigate();
  const { pushNotification } = useNotifications();
  const username = getStoredUsername() || "John Doe";
  const roleName = getStoredRoleLabel() || "Quản trị viên";
  const initials =
      String(username)
          .trim()
          .split(/\s+/)
          .map((s) => s && s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "JD";

  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const [avatarKey, setAvatarKey] = React.useState(0);

  // Load avatar on mount and when avatarUpdated event is triggered
  React.useEffect(() => {
    let mounted = true;
    let blobUrl = null;

    const loadAvatar = async () => {
      try {
        const { getMyProfile } = await import("./api/profile");
        const profile = await getMyProfile();

        const apiBase = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/$/, "");
        const imgPath = profile?.avatar || profile?.avatarUrl || profile?.imgUrl;

        if (imgPath && mounted) {
          // Add cache buster to force reload
          const fullUrl = /^https?:\/\//i.test(imgPath)
              ? imgPath
              : `${apiBase}${imgPath.startsWith("/") ? "" : "/"}${imgPath}`;
          const urlWithCacheBuster = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

          // Fetch with auth
          const token = localStorage.getItem("access_token") || "";
          const resp = await fetch(urlWithCacheBuster, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
            cache: "no-store",
          });

          if (resp.ok && mounted) {
            const blob = await resp.blob();
            // Revoke old URL before creating new one
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            blobUrl = URL.createObjectURL(blob);
            setAvatarUrl(blobUrl);
          }
        }
      } catch (error) {
        // Silently ignore avatar loading errors to avoid console spam
        // Avatar is optional and errors shouldn't disrupt the app
      }
    };

    loadAvatar();

    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [avatarKey]);

  // Listen for avatar update event from UpdateProfilePage
  React.useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log("Avatar update event received, reloading avatar...");
      setAvatarKey((k) => k + 1);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, []);

  const onLogout = React.useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.warn("Logout endpoint unavailable, ignoring:", error?.message);
    } finally {
      pushNotification({
        title: "Đăng xuất thành công",
        message: "Hẹn gặp lại bạn lần sau.",
        type: "SUCCESS",
      });
      navigate("/login", { replace: true });
    }
  }, [navigate, pushNotification]);

  const handleProfileClick = () => {
    navigate("/me/profile");
  };

  const currentRole = getCurrentRole();
  const shouldShowNotifications =
      currentRole === ROLES.CONSULTANT ||
      currentRole === ROLES.COORDINATOR ||
      currentRole === ROLES.ACCOUNTANT;

  return (
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
        {/* Left side - future breadcrumb */}
        <div className="flex items-center justify-start flex-1">
          {/* Sidebar toggle button đã được di chuyển vào SidebarNav header */}
        </div>

        {/* Right side - bell (một số role) + user chip + logout */}
        <div className="flex items-center gap-2.5">
          {/* bell - WebSocket Notifications (chỉ cho các role tham gia điều phối/thu chi) */}
          {shouldShowNotifications && <NotificationsWidget />}

          {/* user chip */}
          <button
              onClick={handleProfileClick}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow-md hover:border-[#0079BC]/50 transition-all cursor-pointer active:scale-[0.98]"
          >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={username}
                    className="h-9 w-9 rounded-full object-cover shadow-sm"
                    onError={() => setAvatarUrl(null)}
                />
            ) : (
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: '#0079BC' }}>
                  {initials}
                </div>
            )}
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-slate-900 text-xs font-semibold">{username}</span>
              <span className="text-slate-500 text-[10px]">{roleName}</span>
            </div>
          </button>

          {/* logout button */}
          <button
              onClick={onLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all active:scale-[0.98]"
          >
            Đăng xuất
          </button>
        </div>
      </header>
  );
}
/* ---------------------------------------------------
   ShellLayout
   - nền tổng thể bg-slate-50
   - vùng content scrollable
--------------------------------------------------- */
function ShellLayout({ sidebarCollapsed = false, onToggleSidebar }) {
  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem("access_token");
  } catch {
    hasToken = false;
  }
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  // Giữ sidebar cố định và tránh cộng thêm margin khiến layout bị lệch/scroll ngang
  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";

  return (
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
        <div className={`${sidebarWidth} flex-shrink-0 transition-all duration-200`}>
          <SidebarNav collapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
          <main className="flex-1 overflow-y-auto min-h-0 p-0">
            {/* Ghi chú: Một số màn con vẫn theme dark. Có thể refactor sau. */}
            <Outlet />
          </main>
        </div>
      </div>
  );
}

function RedirectWithToast({ to, state, toast }) {
  const { pushNotification } = useWebSocket();
  React.useEffect(() => {
    if (toast) {
      pushNotification({
        id: Date.now(),
        title: toast.title || "Thông báo",
        message: toast.message || "",
        type: toast.type || "ERROR",
      });
    }
  }, [pushNotification, toast]);
  return <Navigate to={to} replace state={state} />;
}

function ProtectedRoute({ roles = ALL_ROLES, children }) {
  const role = useRole();
  const allowed = roles && roles.length ? roles : ALL_ROLES;
  const location = useLocation();

  if (!hasActiveSession()) {
    return (
        <RedirectWithToast
            to="/login"
            state={{ from: `${location.pathname}${location.search}` }}
            toast={{
              title: "Phiên đăng nhập đã hết hạn",
              message: "Bạn không có quyền truy cập, vui lòng đăng nhập lại.",
              type: "ERROR",
            }}
        />
    );
  }

  if (allowed.includes(role)) {
    return children;
  }
  return <Navigate to={getHomePathForRole(role)} replace />;
}

function RoleRedirect() {
  const role = useRole();
  const location = useLocation();
  if (!hasActiveSession()) {
    return (
        <RedirectWithToast
            to="/login"
            state={{ from: `${location.pathname}${location.search}` }}
            toast={{
              title: "Vui lòng đăng nhập",
              message: "Bạn cần đăng nhập để tiếp tục sử dụng hệ thống.",
              type: "WARNING",
            }}
        />
    );
  }
  return <Navigate to={getHomePathForRole(role)} replace />;
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!hasActiveSession()) {
    return (
        <RedirectWithToast
            to="/login"
            state={{ from: `${location.pathname}${location.search}` }}
            toast={{
              title: "Phiên đăng nhập không hợp lệ",
              message: "Bạn cần đăng nhập để truy cập trang này.",
              type: "ERROR",
            }}
        />
    );
  }
  return children;
}

/* ---------------------------------------------------
   ROUTES TREE
--------------------------------------------------- */
export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
      <WebSocketProvider>
        <NotificationToast />
        <Routes>
          {/* Trang đăng nhập không dùng shell */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/verification-success" element={<VerificationSuccessPage />} />
          <Route path="/verification-error" element={<VerificationErrorPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Các route cần shell layout */}
          <Route element={<RequireAuth><ShellLayout sidebarCollapsed={sidebarCollapsed} onToggleSidebar={handleToggleSidebar} /></RequireAuth>}>
            <Route index element={<RoleRedirect />} />

            {/* Báo cáo & Phân tích */}
            <Route
                path="/analytics/admin"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <AdminDashboardPro />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/analytics/manager"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <ManagerDashboardPro />
                  </ProtectedRoute>
                }
            />

            {/* Quản trị hệ thống */}
            <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <SystemSettingsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/branches"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <AdminBranchesPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/branches/new"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <CreateBranchPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/branches/:branchId"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <AdminBranchDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/managers"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <AdminManagersPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users/new"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <CreateEmployeeWithUserPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <UserDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <CustomerListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/me/profile"
                element={
                  <ProtectedRoute>
                    <UpdateProfilePage />
                  </ProtectedRoute>
                }
            />


            {/* Tài xế - Only for actual drivers */}
            <Route
                path="/driver/dashboard"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverDashboard />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/profile"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverProfilePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/schedule"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverSchedulePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/trips-list"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverTripsListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/leave-request"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverLeaveRequestPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/requests"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverRequestsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/incidents"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverIncidentManagementPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/trips/:tripId"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverTripDetailPage />
                  </ProtectedRoute>
                }
            />
            {/* Phương tiện */}
            <Route
                path="/vehicles"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <VehicleListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/vehicles/new"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <VehicleCreatePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/vehicles/:vehicleId"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR, ROLES.ACCOUNTANT]}>
                    <VehicleDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/vehicles/categories"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <VehicleCategoryManagePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/vehicles/categories/new"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN]}>
                    <VehicleCategoryPage />
                  </ProtectedRoute>
                }
            />

            {/* Báo giá & Đơn hàng */}
            <Route
                path="/orders/dashboard"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT]}>
                    <ConsultantDashboardPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/orders"
                element={
                  <ProtectedRoute
                      roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR, ROLES.ACCOUNTANT]}
                  >
                    <ConsultantOrderListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/orders/new"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CONSULTANT]}>
                    <CreateOrderPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/orders/:orderId"
                element={
                  <ProtectedRoute
                      roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR, ROLES.ACCOUNTANT]}
                  >
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/orders/:orderId/edit"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CONSULTANT, ROLES.COORDINATOR]}>
                    <EditOrderPage />
                  </ProtectedRoute>
                }
            />

            {/* Điều phối / Lịch chạy */}
            <Route
                path="/dispatch"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                    <CoordinatorTimelinePro />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/pending"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                    <PendingTripsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/notifications-dashboard"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                    <NotificationsDashboard />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/incidents"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.MANAGER]}>
                    <CoordinatorIncidentListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/expense-request"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CONSULTANT, ROLES.DRIVER]}>
                    <ExpenseRequestForm />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/consultant/ratings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CONSULTANT]}>
                    <RatingManagementPage />
                  </ProtectedRoute>
                }
            />
            {/* Backward compatibility: dispatch ratings now redirect to consultant view */}
            <Route
                path="/dispatch/ratings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.COORDINATOR]}>
                    <Navigate to="/consultant/ratings" replace />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/drivers/:driverId/ratings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.CONSULTANT]}>
                    <DriverRatingsPage />
                  </ProtectedRoute>
                }
            />

            {/* Coordinator specific routes */}
            <Route
                path="/coordinator/orders"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorOrderListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/drivers"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorDriverListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/drivers/:driverId"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorDriverDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/drivers/:driverId/trips"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorDriverTripsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/vehicles"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorVehicleListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/vehicles/:vehicleId"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorVehicleDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/coordinator/expense-management"
                element={
                  <ProtectedRoute roles={[ROLES.COORDINATOR]}>
                    <CoordinatorExpenseManagementPage />
                  </ProtectedRoute>
                }
            />

            {/* Consultant specific routes */}
            <Route
                path="/consultant/customers"
                element={
                  <ProtectedRoute roles={[ROLES.CONSULTANT]}>
                    <CustomerListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/consultant/vehicles"
                element={
                  <ProtectedRoute roles={[ROLES.CONSULTANT]}>
                    <VehicleListPage readOnly />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/consultant/drivers"
                element={
                  <ProtectedRoute roles={[ROLES.CONSULTANT]}>
                    <CoordinatorDriverListPage readOnly />
                  </ProtectedRoute>
                }
            />

            {/* Accountant specific routes */}
            <Route
                path="/accountant/orders"
                element={
                  <ProtectedRoute roles={[ROLES.ACCOUNTANT]}>
                    <ConsultantOrderListPage readOnly />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accountant/users"
                element={
                  <ProtectedRoute roles={[ROLES.ACCOUNTANT]}>
                    <AdminUsersPage readOnly />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accountant/vehicles"
                element={
                  <ProtectedRoute roles={[ROLES.ACCOUNTANT]}>
                    <VehicleListPage readOnly />
                  </ProtectedRoute>
                }
            />

            {/* Manager specific routes */}
            <Route
                path="/manager/orders"
                element={
                  <ProtectedRoute roles={[ROLES.MANAGER]}>
                    <ConsultantOrderListPage readOnly />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/manager/drivers"
                element={
                  <ProtectedRoute roles={[ROLES.MANAGER]}>
                    <CoordinatorDriverListPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/manager/drivers/:driverId"
                element={
                  <ProtectedRoute roles={[ROLES.MANAGER]}>
                    <CoordinatorDriverDetailPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/manager/drivers/:driverId/trips"
                element={
                  <ProtectedRoute roles={[ROLES.MANAGER]}>
                    <CoordinatorDriverTripsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/manager/customers"
                element={
                  <ProtectedRoute roles={[ROLES.MANAGER]}>
                    <CustomerListPage />
                  </ProtectedRoute>
                }
            />

            {/* Kế toán & Thanh toán */}
            <Route
                path="/accounting"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
                    <AccountantDashboard />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accounting/invoices"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.ACCOUNTANT]}>
                    <InvoiceManagement />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accounting/expenses"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT]}>
                    <ExpenseReportPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accounting/expense-requests"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT]}>
                    <ExpenseRequestManagementPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/accounting/revenue-report"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.CONSULTANT, ROLES.MANAGER]}>
                    <ReportRevenuePage />
                  </ProtectedRoute>
                }
            />
          </Route>

          {/* fallback */}
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </WebSocketProvider>
  );
}
