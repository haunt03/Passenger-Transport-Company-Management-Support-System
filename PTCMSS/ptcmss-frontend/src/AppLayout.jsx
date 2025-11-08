import React from "react";
import { Routes, Route, Navigate, NavLink, Outlet } from "react-router-dom";

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
} from "lucide-react";
import { logout as apiLogout } from "./api/auth";

/* ========= IMPORT CÁC PAGE ========= */
/* Module 1 – Quản trị hệ thống */
import SystemSettingsPage from "./components/module 1/SystemSettingsPage.jsx";
import CreateBranchPage from "./components/module 1/CreateBranchPage.jsx";
import AdminBranchesPage from "./components/module 1/AdminBranchesPage.jsx";
import AdminBranchDetailPage from "./components/module 1/AdminBranchDetailPage.jsx";
import AdminCreateUserPage from "./components/module 1/AdminCreateUserPage.jsx";
import AdminUsersPage from "./components/module 1/AdminUsersPage.jsx";
import AdminManagersPage from "./components/module 1/AdminManagersPage.jsx";
import UserDetailPage from "./components/module 1/UserDetailPage.jsx";
import UpdateProfilePage from "./components/module 1/UpdateProfilePage.jsx";
import LoginPage from "./components/module 1/LoginPage.jsx";

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
                        }) {
    const open = activeSection === sectionId;

    const handleToggle = () => {
        setActiveSection((curr) => (curr === sectionId ? "" : sectionId));
    };

    return (
        <div className="text-[13px] text-slate-700">
            {/* header group */}
            <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors"
            >
        <span className="flex items-center gap-2">
          {React.createElement(icon, { className: "h-4 w-4 text-sky-600" })}
            <span className="font-medium leading-none text-slate-800">{label}</span>
        </span>
                {open ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
            </button>

            {/* submenu */}
            {open && (
                <ul className="mt-1 mb-3 ml-2 flex flex-col border-l border-slate-200">
                    {items.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                className={({ isActive }) => {
                                    const base =
                                        "relative flex items-center justify-between pl-3 pr-3 py-2 text-[12px] rounded-md transition-colors border border-transparent";
                                    if (isActive) {
                                        return [
                                            base,
                                            "bg-sky-50 text-sky-700 border-sky-200 font-medium",
                                            "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-sky-600 before:rounded-r",
                                        ].join(" ");
                                    }
                                    return [
                                        base,
                                        "text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-200",
                                    ].join(" ");
                                }}
                            >
                                <span className="truncate">{item.label}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
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
--------------------------------------------------- */
function SidebarNav() {
    const [activeSection, setActiveSection] = React.useState("admin");

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
            {/* brand / account mini */}
            <div className="px-4 py-4 border-b border-slate-200 flex items-start gap-2">
                <div className="h-9 w-9 rounded-md bg-sky-600 flex items-center justify-center text-white font-semibold text-sm shadow-[0_8px_24px_rgba(2,132,199,.35)]">
                    TM
                </div>
                <div className="flex flex-col leading-tight">
                    <div className="text-slate-900 font-semibold text-sm">TranspoManager</div>
                    <div className="text-[11px] text-slate-500">bản thử nghiệm nội bộ</div>
                </div>
            </div>

            {/* groups */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 text-sm">
                {/* Quản trị hệ thống */}
                <SidebarSection
                    sectionId="admin"
                    icon={Settings}
                    label="Quản trị hệ thống"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Cấu hình hệ thống", to: "/admin/settings" },
                        { label: "Danh sách chi nhánh", to: "/admin/branches" },
                        { label: "Tạo chi nhánh", to: "/admin/branches/new" },
                        { label: "Quản lý chi nhánh", to: "/admin/managers" },
                        { label: "Tạo tài khoản", to: "/admin/users/new" },
                        // { label: "Chi tiết tài khoản (demo)", to: "/admin/users/123" },
                        { label: "Hồ sơ cá nhân", to: "/me/profile" },
                    ]}
                />

                {/* Tài xế */}
                <SidebarSection
                    sectionId="driver"
                    icon={Users}
                    label="Tài xế"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Bảng điều khiển tài xế", to: "/driver/dashboard" },
                        { label: "Thông báo", to: "/driver/notifications" },
                        { label: "Lịch làm việc", to: "/driver/schedule" },
                        { label: "Xin nghỉ phép", to: "/driver/leave-request" },
                        { label: "Hồ sơ tài xế", to: "/driver/profile" },
                        { label: "Chi tiết chuyến (demo)", to: "/driver/trips/123" },
                    ]}
                />

                {/* Phương tiện */}
                <SidebarSection
                    sectionId="vehicle"
                    icon={CarFront}
                    label="Phương tiện"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Danh sách xe", to: "/vehicles" },
                        { label: "Tạo xe mới", to: "/vehicles/new" },
                        { label: "Danh mục xe", to: "/vehicles/categories" },
                        { label: "Tạo danh mục", to: "/vehicles/categories/new" },
                        { label: "Chi tiết xe", to: "/vehicles/1" },
                    ]}
                />

                {/* Báo giá & Đơn hàng */}
                <SidebarSection
                    sectionId="orders"
                    icon={ClipboardList}
                    label="Báo giá & Đơn hàng"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Bảng CSKH / Báo giá", to: "/orders/dashboard" },
                        { label: "Danh sách đơn hàng", to: "/orders" },
                        { label: "Tạo đơn hàng", to: "/orders/new" },
                        { label: "Gán tài xế / Sửa đơn", to: "/orders/ABC123/edit" },
                        { label: "Chi tiết đơn hàng", to: "/orders/1" },
                    ]}
                />

                {/* Điều phối / Lịch chạy */}
                <SidebarSection
                    sectionId="dispatch"
                    icon={CalendarClock}
                    label="Điều phối / Lịch chạy"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Bảng điều phối", to: "/dispatch" },
                        { label: "Phiếu tạm ứng tài xế", to: "/dispatch/expense-request" },
                        { label: "Gán tài xế (demo)", to: "/dispatch/AssignDriverDialog" },
                        { label: "Thông báo điều phối", to: "/dispatch/notifications" },
                    ]}
                />

                {/* Kế toán & Thanh toán */}
                <SidebarSection
                    sectionId="accounting"
                    icon={DollarSign}
                    label="Kế toán & Thanh toán"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Tổng quan kế toán", to: "/accounting" },
                        { label: "Hóa đơn / Thanh toán", to: "/accounting/invoices" },
                        { label: "Báo cáo chi phí", to: "/accounting/expenses" },
                        { label: "Báo cáo doanh thu", to: "/accounting/revenue-report" },
                    ]}
                />

                {/* Báo cáo & Phân tích */}
                <SidebarSection
                    sectionId="analytics"
                    icon={BarChart3}
                    label="Báo cáo & Phân tích"
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    items={[
                        { label: "Dashboard Công ty", to: "/analytics/admin" },
                        { label: "Dashboard Chi nhánh", to: "/analytics/manager" },
                    ]}
                />
            </nav>

            <div className="px-4 py-4 border-t border-slate-200 text-[11px] text-slate-500">v0.1 thử nghiệm</div>
        </aside>
    );
}

/* ---------------------------------------------------
   Topbar
   - nền trắng
   - viền dưới + bóng mờ nhẹ
   - search pill nền slate-50
--------------------------------------------------- */
function Topbar() {
    const getCookie = (name) => {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2)
                return decodeURIComponent(parts.pop().split(";").shift());
        } catch {
            // do nothing
        }
        return "";
    };
    const username = getCookie("username") || localStorage.getItem("username") || "John Doe";
    const roleName = getCookie("roleName") || localStorage.getItem("roleName") || "Quản trị viên";
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

    return (
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
            {/* search */}
            <div className="flex-1 max-w-md flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-500/40">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                    className="bg-transparent outline-none flex-1 text-slate-700 placeholder:text-slate-400 text-sm"
                    placeholder="Tìm nhanh..."
                />
            </div>

            {/* bell */}
            <button className="relative rounded-md border border-slate-200 bg-white p-2 hover:border-sky-500/40 hover:bg-sky-50 transition-colors">
                <Bell className="h-4 w-4 text-sky-600" />
                <span className="absolute -top-1 -right-1 bg-sky-600 text-[10px] font-semibold text-white rounded-full px-1 leading-none shadow-sm">
          3
        </span>
            </button>

            {/* user chip + logout */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-sky-600 flex items-center justify-center text-[10px] font-medium text-white">
                        {initials}
                    </div>
                    <div className="hidden sm:flex flex-col leading-tight text-left">
                        <span className="text-slate-800 text-xs font-medium">{username}</span>
                        <span className="text-slate-500 text-[10px]">{roleName}</span>
                    </div>
                </div>
                <button onClick={onLogout} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 shadow-sm">
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
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-5">
                    {/* Ghi chú: Một số màn con vẫn theme dark. Có thể refactor sau. */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

/* ---------------------------------------------------
   ROUTES TREE
--------------------------------------------------- */
export default function AppLayout() {
    return (
        <Routes>
            {/* Trang đăng nhập không dùng shell */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Các route còn lại dùng ShellLayout */}
            <Route element={<ShellLayout />}>
                {/* default redirect */}
                <Route index element={<Navigate to="/analytics/admin" replace />} />

                {/* Báo cáo & Phân tích */}
                <Route path="/analytics/admin" element={<AdminDashboardPro />} />
                <Route path="/analytics/manager" element={<ManagerDashboardPro />} />

                {/* Quản trị hệ thống */}
                <Route path="/admin/settings" element={<SystemSettingsPage />} />
                <Route path="/admin/branches" element={<AdminBranchesPage />} />
                <Route path="/admin/branches/new" element={<CreateBranchPage />} />
                <Route path="/admin/branches/:branchId" element={<AdminBranchDetailPage />} />
                <Route path="/admin/managers" element={<AdminManagersPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/users/new" element={<AdminCreateUserPage />} />
                <Route path="/admin/users/:userId" element={<UserDetailPage />} />
                <Route path="/me/profile" element={<UpdateProfilePage />} />

                {/* Tài xế */}
                <Route path="/driver/dashboard" element={<DriverDashboard />} />
                <Route path="/driver/notifications" element={<DriverNotificationsPage />} />
                <Route path="/driver/profile" element={<DriverProfilePage />} />
                <Route path="/driver/schedule" element={<DriverSchedulePage />} />
                <Route path="/driver/leave-request" element={<DriverLeaveRequestPage />} />
                <Route path="/driver/report-incident" element={<DriverReportIncidentPage />} />
                <Route path="/driver/trips/:tripId" element={<DriverTripDetailPage />} />

                {/* Phương tiện */}
                <Route path="/vehicles" element={<VehicleListPage />} />
                <Route path="/vehicles/new" element={<VehicleCreatePage />} />
                <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
                <Route path="/vehicles/categories" element={<VehicleCategoryManagePage />} />
                <Route path="/vehicles/categories/new" element={<VehicleCategoryPage />} />

                {/* Báo giá & Đơn hàng */}
                <Route path="/orders/dashboard" element={<ConsultantDashboardPage />} />
                <Route path="/orders" element={<ConsultantOrderListPage />} />
                <Route path="/orders/new" element={<CreateOrderPage />} />
                <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                <Route path="/orders/:orderId/edit" element={<EditOrderPage />} />

                {/* Điều phối / Lịch chạy */}
                <Route path="/dispatch" element={<CoordinatorTimelinePro />} />
                <Route path="/dispatch/expense-request" element={<ExpenseRequestForm />} />
                <Route path="/dispatch/AssignDriverDialog" element={<DemoAssign />} />
                <Route path="/dispatch/notifications" element={<NotificationsWidget />} />

                {/* Kế toán & Thanh toán */}
                <Route path="/accounting" element={<AccountantDashboard />} />
                <Route path="/accounting/invoices" element={<InvoiceManagement />} />
                <Route path="/accounting/expenses" element={<ExpenseReportPage />} />
                <Route path="/accounting/revenue-report" element={<ReportRevenuePage />} />
            </Route>

            {/* fallback: path lạ -> về dashboard công ty */}
            <Route path="*" element={<Navigate to="/analytics/admin" replace />} />
        </Routes>
    );
}