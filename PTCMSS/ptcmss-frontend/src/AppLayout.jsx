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
  ChevronDown,
  Bell,
  Search,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { logout as apiLogout } from "./api/auth";
import {
  ROLES,
  ALL_ROLES,
  getCurrentRole,
  getHomePathForRole,
  getStoredUsername,
  getStoredRoleLabel,
} from "./utils/session";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import NotificationToast from "./components/common/NotificationToast";

const SIDEBAR_SECTIONS = [
  {
    sectionId: "analytics",
    icon: BarChart3,
    label: "Báo cáo & Phân tích",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    items: [
      { label: "Dashboard Công ty", to: "/analytics/admin", roles: [ROLES.ADMIN] },
      { label: "Dashboard Chi nhánh", to: "/analytics/manager", roles: [ROLES.ADMIN, ROLES.MANAGER] },
    ],
  },
  {
    sectionId: "admin",
    icon: Settings,
    label: "Quản trị hệ thống",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    items: [
      { label: "Cấu hình hệ thống", to: "/admin/settings", roles: [ROLES.ADMIN] },
      { label: "Danh sách chi nhánh", to: "/admin/branches", roles: [ROLES.ADMIN, ROLES.MANAGER] },
      // { label: "Tạo chi nhánh", to: "/admin/branches/new", roles: [ROLES.ADMIN] },
      { label: "Quản lý chi nhánh", to: "/admin/managers", roles: [ROLES.ADMIN] },
      { label: "Quản lý tài khoản", to: "/admin/users", roles: [ROLES.ADMIN, ROLES.MANAGER] },
      { label: "Quản lý nhân viên", to: "/admin/employees", roles: [ROLES.ADMIN, ROLES.MANAGER] },
      { label: "Hồ sơ cá nhân", to: "/me/profile", roles: ALL_ROLES },
    ],
  },
  {
    sectionId: "driver",
    icon: Users,
    label: "Tài xế",
    roles: [ROLES.DRIVER], // Only actual drivers can access driver dashboard
    items: [
      { label: "Bảng điều khiển tài xế", to: "/driver/dashboard" },
      { label: "Thông báo", to: "/driver/notifications" },
      { label: "Lịch làm việc", to: "/driver/schedule" },
      { label: "Xin nghỉ phép", to: "/driver/leave-request" },
      { label: "Hồ sơ tài xế", to: "/driver/profile" },
      { label: "Chi tiết chuyến", to: "/driver/trips" },
    ],
  },
  {
    sectionId: "vehicle",
    icon: CarFront,
    label: "Phương tiện",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    items: [
      { label: "Danh sách xe", to: "/vehicles" },
      // { label: "Tạo xe mới", to: "/vehicles/new", roles: [ROLES.ADMIN, ROLES.MANAGER] },
      { label: "Danh mục xe", to: "/vehicles/categories" },
      { label: "Tạo danh mục", to: "/vehicles/categories/new", roles: [ROLES.ADMIN] },
      // { label: "Chi tiết xe", to: "/vehicles/1" },
    ],
  },
  {
    sectionId: "orders",
    icon: ClipboardList,
    label: "Báo giá & Đơn hàng",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR, ROLES.ACCOUNTANT],
    items: [
      { label: "Bảng CSKH / Báo giá", to: "/orders/dashboard", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT] },
      {
        label: "Danh sách đơn hàng",
        to: "/orders",
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR, ROLES.ACCOUNTANT],
      },
      { label: "Tạo đơn hàng", to: "/orders/new", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT] },
      { label: "Gán tài xế / Sửa đơn", to: "/orders", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR] },
    ],
  },
  {
    sectionId: "dispatch",
    icon: CalendarClock,
    label: "Điều phối / Lịch chạy",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR],
    items: [
      { label: "Bảng điều phối", to: "/dispatch" },
      { label: "Đơn chưa gán chuyến", to: "/dispatch/pending" },
      { label: "Cảnh báo & Chờ duyệt", to: "/dispatch/notifications-dashboard" },
      { label: "Phiếu tạm ứng tài xế", to: "/dispatch/expense-request" },
      // { label: "Gán tài xế (demo)", to: "/dispatch/AssignDriverDialog" },
      // { label: "Thông báo điều phối", to: "/dispatch/notifications" }, // Đã xóa - trùng với "Cảnh báo & Chờ duyệt"
      { label: "Đánh giá tài xế", to: "/dispatch/ratings", roles: [ROLES.ADMIN, ROLES.MANAGER] },
    ],
  },
  {
    sectionId: "accounting",
    icon: DollarSign,
    label: "Kế toán & Thanh toán",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    items: [
      { label: "Tổng quan kế toán", to: "/accounting", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: "Hóa đơn / Thanh toán", to: "/accounting/invoices", roles: [ROLES.ADMIN, ROLES.ACCOUNTANT] },
      { label: "Báo cáo chi phí", to: "/accounting/expenses", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: "Báo cáo doanh thu", to: "/accounting/revenue-report", roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT] },
    ],
  },
];

function useRole() {
  return React.useMemo(() => getCurrentRole(), []);
}

function filterSectionsByRole(role) {
  return SIDEBAR_SECTIONS.map((section) => {
    if (section.roles && !section.roles.includes(role)) {
      return null;
    }
    const allowedItems = (section.items || []).filter(
        (item) => !item.roles || item.roles.includes(role)
    );
    if (!allowedItems.length) {
      return null;
    }
    return { ...section, items: allowedItems };
  }).filter(Boolean);
}

/* ========= IMPORT CÁC PAGE ========= */
/* Module 1 – Quản trị hệ thống */
import SystemSettingsPage from "./components/module 1/SystemSettingsPage.jsx";
import CreateBranchPage from "./components/module 1/CreateBranchPage.jsx";
import AdminBranchesPage from "./components/module 1/AdminBranchesPage.jsx";
import AdminBranchDetailPage from "./components/module 1/AdminBranchDetailPage.jsx";
import AdminUsersPage from "./components/module 1/AdminUsersPage.jsx";
import AdminManagersPage from "./components/module 1/AdminManagersPage.jsx";
import UserDetailPage from "./components/module 1/UserDetailPage.jsx";
import UpdateProfilePage from "./components/module 1/UpdateProfilePage.jsx";
import LoginPage from "./components/module 1/LoginPage.jsx";
import EmployeeManagementPage from "./components/module 1/EmployeeManagementPage.jsx";
import CreateEmployeePage from "./components/module 1/CreateEmployeePage.jsx";
import CreateEmployeeWithUserPage from "./components/module 1/CreateEmployeeWithUserPage.jsx";
import EditEmployeePage from "./components/module 1/EditEmployeePage.jsx";
import VerificationSuccessPage from "./components/module 1/VerificationSuccessPage.jsx";
import VerificationErrorPage from "./components/module 1/VerificationErrorPage.jsx";

/* Module 2 – Tài xế */
import DriverDashboard from "./components/module 2/DriverDashboard.jsx";
import DriverNotificationsPage from "./components/module 2/DriverNotificationsPage.jsx";
import DriverProfilePage from "./components/module 2/DriverProfilePage.jsx";
import DriverSchedulePage from "./components/module 2/DriverSchedulePage.jsx";
import DriverLeaveRequestPage from "./components/module 2/DriverLeaveRequestPage.jsx";
import DriverReportIncidentPage from "./components/module 2/DriverReportIncidentPage.jsx";
import DriverTripDetailPage from "./components/module 2/DriverTripDetailPage.jsx";

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

/* DemoAssign – mở AssignDriverDialog */
import DemoAssign from "./DemoAssign.jsx";

/* Module 6 – Kế toán & Thanh toán */
import AccountantDashboard from "./components/module 6/AccountantDashboard.jsx";
import InvoiceManagement from "./components/module 6/InvoiceManagement.jsx";
import ExpenseReportPage from "./components/module 6/ExpenseReportPage.jsx";
import ReportRevenuePage from "./components/module 6/ReportRevenuePage.jsx";

/* Module 7 – Báo cáo & Phân tích */
import AdminDashboardPro from "./components/module 7/AdminDashboard.jsx";
import ManagerDashboardPro from "./components/module 7/ManagerDashboard.jsx";

/* ---------------------------------------------------
   SidebarSection (controlled)
   - KHÔNG còn useState tự mở/tắt
   - Nhận activeSection + setActiveSection từ SidebarNav
   - Mỗi section có sectionId duy nhất
   - Item active có viền Tài xế + nền xanh nhạt
--------------------------------------------------- */
function SidebarSection({
                          sectionId,
                          icon,
                          label,
                          items,
                          activeSection,
                          setActiveSection,
                          location,
                        }) {
  const open = activeSection === sectionId;

  // Kiểm tra xem có item nào trong section này đang active không
  const hasActiveItem = items.some(item => location.pathname.startsWith(item.to));
  // Section đang active nếu có item active hoặc section đang mở
  const isCurrentSection = hasActiveItem || open;

  const handleToggle = () => {
    // Nếu section đang đóng, mở nó
    if (!open) {
      setActiveSection(sectionId);
    } else {
      // Nếu section đang mở và không có item active, cho phép đóng
      if (!hasActiveItem) {
        setActiveSection("");
      }
      // Nếu có item active, giữ nguyên (không đóng)
    }
  };

  return (
      <div className="text-[13px] text-slate-700">
        {/* header group */}
        <button
            type="button"
            onClick={handleToggle}
            className={`group w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-slate-700 transition-all duration-200 ease-in-out cursor-pointer active:scale-[0.98] ${
                isCurrentSection
                    ? "bg-gradient-to-r from-sky-50 to-blue-50 shadow-sm shadow-sky-100/50"
                    : "hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 hover:shadow-sm hover:shadow-sky-100/50"
            }`}
        >
        <span className="flex items-center gap-2.5">
          {React.createElement(icon, {
            className: `h-4 w-4 transition-all duration-200 ${
                open
                    ? "text-[#0079BC] scale-110"
                    : "text-sky-600 group-hover:text-[#0079BC] group-hover:scale-110"
            }`
          })}
          <span className={`font-medium leading-none transition-colors duration-200 ${
              open
                  ? "text-slate-900"
                  : "text-slate-800 group-hover:text-slate-900"
          }`}>
            {label}
          </span>
        </span>
          <div className="transition-transform duration-200 ease-in-out">
            {open ? (
                <ChevronDown className={`h-4 w-4 transition-all duration-200 ${
                    isCurrentSection ? "text-[#0079BC] rotate-0" : "text-slate-400"
                }`} />
            ) : (
                <ChevronRight className={`h-4 w-4 transition-all duration-200 text-slate-400 group-hover:text-[#0079BC] group-hover:translate-x-0.5`} />
            )}
          </div>
        </button>

        {/* submenu */}
        {open && (
            <ul className={`mt-1.5 mb-3 ml-2 flex flex-col border-l-2 ${hasActiveItem ? "border-[#0079BC]" : "border-slate-200"} space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-200`}>
              {items.map((item) => (
                  <li key={`${sectionId}-${item.to}-${item.label}`}>
                    <NavLink
                        to={item.to}
                        className={({ isActive }) => {
                          const base =
                              "group/item relative flex items-center justify-between pl-3.5 pr-3 py-2 text-[12px] rounded-lg transition-all duration-200 ease-in-out border border-transparent";
                          if (isActive) {
                            return [
                              base,
                              "bg-gradient-to-r from-[#0079BC]/10 to-sky-50 text-[#0079BC] border-[#0079BC]/20 font-semibold shadow-sm shadow-[#0079BC]/10",
                              "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#0079BC] before:rounded-r-md",
                              "hover:from-[#0079BC]/15 hover:to-sky-100 hover:shadow-md hover:shadow-[#0079BC]/20",
                            ].join(" ");
                          }
                          return [
                            base,
                            "text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100/50 hover:text-slate-900 hover:border-slate-200 hover:shadow-sm",
                            "hover:translate-x-1",
                          ].join(" ");
                        }}
                    >
                      <span className="truncate">{item.label}</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition-all duration-200 ${
                          "opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 group-hover/item:text-[#0079BC]"
                      }`} />
                    </NavLink>
                  </li>
              ))}
            </ul>
        )}
      </div>
  );
}

/* ---------------------------------------------------
   SidebarNav
   - nền trắng
   - border phải xám nhạt
   - header app với chip màu sky-600
   - QUAN TRỌNG: quản lý state mở/đóng cho toàn bộ sidebar
   - Tích hợp tìm kiếm chức năng
--------------------------------------------------- */
function SidebarNav() {
  const role = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const sections = React.useMemo(() => filterSectionsByRole(role), [role]);
  const [activeSection, setActiveSection] = React.useState(() => sections[0]?.sectionId || "");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Tự động mở section tương ứng với route hiện tại
  React.useEffect(() => {
    const pathname = location.pathname;

    // Tự động mở section "analytics" khi vào dashboard
    if (pathname.startsWith("/analytics/")) {
      const analyticsSection = sections.find(s => s.sectionId === "analytics");
      if (analyticsSection) {
        setActiveSection("analytics");
        return;
      }
    }

    // Tự động mở section "admin" khi vào admin pages
    if (pathname.startsWith("/admin/")) {
      const adminSection = sections.find(s => s.sectionId === "admin");
      if (adminSection) {
        setActiveSection("admin");
        return;
      }
    }

    // Tự động mở section "vehicles" khi vào vehicle pages
    if (pathname.startsWith("/vehicles/")) {
      const vehiclesSection = sections.find(s => s.sectionId === "vehicles");
      if (vehiclesSection) {
        setActiveSection("vehicles");
        return;
      }
    }

    // Tự động mở section "bookings" khi vào booking pages
    if (pathname.startsWith("/bookings/") || pathname.startsWith("/quotes/")) {
      const bookingsSection = sections.find(s => s.sectionId === "bookings");
      if (bookingsSection) {
        setActiveSection("bookings");
        return;
      }
    }

    // Tự động mở section "dispatch" khi vào dispatch pages
    if (pathname.startsWith("/dispatch/")) {
      const dispatchSection = sections.find(s => s.sectionId === "dispatch");
      if (dispatchSection) {
        setActiveSection("dispatch");
        return;
      }
    }

    // Tự động mở section "accounting" khi vào accounting pages
    if (pathname.startsWith("/accounting/")) {
      const accountingSection = sections.find(s => s.sectionId === "accounting");
      if (accountingSection) {
        setActiveSection("accounting");
        return;
      }
    }
  }, [location.pathname, sections]);

  React.useEffect(() => {
    if (!sections.length) {
      setActiveSection("");
      return;
    }
    if (!sections.some((section) => section.sectionId === activeSection)) {
      setActiveSection(sections[0].sectionId);
    }
  }, [sections, activeSection]);

  // Filter sections and items based on search query
  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase().trim();
    return sections.map(section => {
      const matchedItems = section.items.filter(item =>
          item.label.toLowerCase().includes(query) ||
          section.label.toLowerCase().includes(query)
      );

      if (matchedItems.length === 0 && !section.label.toLowerCase().includes(query)) {
        return null;
      }

      return {
        ...section,
        items: matchedItems.length > 0 ? matchedItems : section.items
      };
    }).filter(Boolean);
  }, [sections, searchQuery]);

  // Handle search result click
  const handleSearchResultClick = (item, sectionId) => {
    navigate(item.to);
    setActiveSection(sectionId);
    setSearchQuery(""); // Clear search after navigation
  };

  return (
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm fixed left-0 top-0 bottom-0 z-10">
        {/* brand / account mini */}
        <div className="px-4 py-4 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-br from-white to-slate-50/50">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-[0_8px_24px_rgba(0,121,188,.35)] flex-shrink-0 transition-transform duration-200 hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,121,188,.45)]" style={{ backgroundColor: '#0079BC' }}>
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0 flex-1">
            <div className="text-slate-900 font-bold text-sm truncate">TranspoManager</div>
            <div className="text-[10px] text-slate-500 leading-tight">Hệ thống quản lý vận tải</div>
          </div>
        </div>

        {/* Search box */}
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm transition-all focus-within:ring-2 focus-within:ring-[#0079BC]/20 focus-within:border-[#0079BC]/50 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400 text-xs"
                placeholder="Tìm chức năng..."
            />
          </div>
        </div>

        {/* groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
          {searchQuery.trim() ? (
              // Search results view
              <div className="space-y-1">
                {filteredSections.length > 0 ? (
                    filteredSections.map((section) => (
                        <div key={section.sectionId} className="mb-3">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
                            {section.label}
                          </div>
                          {section.items.map((item) => (
                              <button
                                  key={`${section.sectionId}-${item.to}`}
                                  onClick={() => handleSearchResultClick(item, section.sectionId)}
                                  className="w-full text-left flex items-center justify-between px-3 py-2 text-xs rounded-lg text-slate-600 hover:bg-gradient-to-r hover:from-[#0079BC]/10 hover:to-sky-50 hover:text-[#0079BC] transition-all"
                              >
                                <span className="truncate">{item.label}</span>
                                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                          ))}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Không tìm thấy kết quả
                    </div>
                )}
              </div>
          ) : (
              // Normal sections view
              sections.map((section) => (
                  <SidebarSection
                      key={section.sectionId}
                      sectionId={section.sectionId}
                      icon={section.icon}
                      label={section.label}
                      items={section.items}
                      activeSection={activeSection}
                      setActiveSection={setActiveSection}
                      location={location}
                  />
              ))
          )}
        </nav>

        {/* <div className="px-4 py-4 border-t border-slate-200 text-[11px] text-slate-500 bg-slate-50/50">v0.1 thử nghiệm</div> */}
      </aside>
  );
}
/* ---------------------------------------------------
   Topbar
   - nền trắng
   - viền dưới + bóng mờ nhẹ
   - Admin info và nút đăng xuất ở bên phải
--------------------------------------------------- */
function Topbar() {
  const navigate = useNavigate();
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
  const onLogout = () => {
    try {
      apiLogout();
    } catch {
      // do nothing
    }
    window.location.href = "/login";
  };

  const handleProfileClick = () => {
    navigate("/me/profile");
  };

  return (
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
        {/* Left side - empty or can add breadcrumb later */}
        <div className="flex-1"></div>

        {/* Right side - bell + user chip + logout */}
        <div className="flex items-center gap-2.5">
          {/* bell - WebSocket Notifications */}
          <NotificationsWidget />

          {/* user chip */}
          <button
              onClick={handleProfileClick}
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:shadow-md hover:border-[#0079BC]/50 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: '#0079BC' }}>
              {initials}
            </div>
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
function ShellLayout() {
  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem("access_token");
  } catch {
    hasToken = false;
  }
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }
  return (
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0 ml-64">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5">
            {/* Ghi chú: Một số màn con vẫn theme dark. Có thể refactor sau. */}
            <Outlet />
          </main>
        </div>
      </div>
  );
}

function ProtectedRoute({ roles = ALL_ROLES, children }) {
  const role = useRole();
  const allowed = roles && roles.length ? roles : ALL_ROLES;
  if (allowed.includes(role)) {
    return children;
  }
  return <Navigate to={getHomePathForRole(role)} replace />;
}

function RoleRedirect() {
  const role = useRole();
  return <Navigate to={getHomePathForRole(role)} replace />;
}

/* ---------------------------------------------------
   ROUTES TREE
--------------------------------------------------- */
export default function AppLayout() {
  return (
      <WebSocketProvider>
        <NotificationToast />
        <Routes>
          {/* Trang đăng nhập không dùng shell */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verification-success" element={<VerificationSuccessPage />} />
          <Route path="/verification-error" element={<VerificationErrorPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Các route cần shell layout */}
          <Route element={<ShellLayout />}>
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
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <UserDetailPage />
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
            <Route
                path="/admin/employees"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <EmployeeManagementPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/employees/create"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <CreateEmployeePage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/employees/create-with-user"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <CreateEmployeeWithUserPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/admin/employees/edit/:id"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <EditEmployeePage />
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
                path="/driver/notifications"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverNotificationsPage />
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
                path="/driver/leave-request"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverLeaveRequestPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/report-incident"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverReportIncidentPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/driver/trips"
                element={
                  <ProtectedRoute roles={[ROLES.DRIVER]}>
                    <DriverTripDetailPage />
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
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
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
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT]}>
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
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CONSULTANT, ROLES.COORDINATOR]}>
                    <EditOrderPage />
                  </ProtectedRoute>
                }
            />

            {/* Điều phối / Lịch chạy */}
            <Route
                path="/dispatch"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                    <CoordinatorTimelinePro />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/pending"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                    <PendingTripsPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/notifications-dashboard"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                    <NotificationsDashboard />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/expense-request"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                    <ExpenseRequestForm />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/dispatch/AssignDriverDialog"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                    <DemoAssign />
                  </ProtectedRoute>
                }
            />
            {/* Route đã xóa - trùng với /dispatch/notifications-dashboard
          <Route
            path="/dispatch/notifications"
            element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.COORDINATOR]}>
                <NotificationsWidget />
              </ProtectedRoute>
            }
          />
          */}
            <Route
                path="/dispatch/ratings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <RatingManagementPage />
                  </ProtectedRoute>
                }
            />
            <Route
                path="/drivers/:driverId/ratings"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                    <DriverRatingsPage />
                  </ProtectedRoute>
                }
            />

            {/* Kế toán & Thanh toán */}
            <Route
                path="/accounting"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT]}>
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
                path="/accounting/revenue-report"
                element={
                  <ProtectedRoute roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT]}>
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