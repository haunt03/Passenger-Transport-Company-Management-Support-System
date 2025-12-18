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
    Bell,
    LayoutDashboard,
    Briefcase,
    AlertTriangle,
    Bus,
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

/* ================= SIDEBAR CONFIG ================= */

const SIDEBAR_ITEMS_BY_ROLE = {
    [ROLES.CONSULTANT]: [
        { label: "Bảng điều khiển", to: "/orders/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Danh sách đơn hàng", to: "/orders", icon: ClipboardList },
        { label: "Tạo đơn hàng", to: "/orders/new", icon: ClipboardList },
        { label: "Danh sách khách hàng", to: "/consultant/customers", icon: Users },
        { label: "Danh sách xe", to: "/consultant/vehicles", icon: CarFront },
        { label: "Danh sách tài xế", to: "/consultant/drivers", icon: Users },
        { label: "Đánh giá tài xế", to: "/consultant/ratings", icon: BarChart3 },
    ],

    [ROLES.DRIVER]: [
        { label: "Bảng điều khiển", to: "/driver/dashboard", icon: LayoutDashboard, exact: true },
        { label: "Lịch làm việc", to: "/driver/schedule", icon: CalendarClock },
        { label: "Danh sách chuyến", to: "/driver/trips-list", icon: ClipboardList },
        { label: "Quản lý sự cố", to: "/driver/incidents", icon: AlertTriangle },
        { label: "Xin nghỉ phép", to: "/driver/leave-request", icon: CalendarClock },
        { label: "Danh sách yêu cầu", to: "/driver/requests", icon: ClipboardList },
        { label: "Hồ sơ tài xế", to: "/driver/profile", icon: Users },
    ],

    [ROLES.COORDINATOR]: [
        { label: "Bảng điều khiển", to: "/dispatch", icon: LayoutDashboard, exact: true },
        { label: "Cảnh báo chờ duyệt", to: "/dispatch/notifications-dashboard", icon: Bell },
        { label: "Sự cố chuyến đi", to: "/dispatch/incidents", icon: AlertTriangle },
        { label: "Danh sách đơn", to: "/coordinator/orders", icon: ClipboardList },
        { label: "Danh sách tài xế", to: "/coordinator/drivers", icon: Users },
        { label: "Danh sách xe", to: "/coordinator/vehicles", icon: CarFront },
        { label: "Quản lý yêu cầu", to: "/coordinator/expense-management", icon: DollarSign },
    ],

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

    // ✅ MANAGER – 9 OPTIONS (GIỮ DRIVER)
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

/* ================= IMPORT PAGES ================= */
/* (Giữ nguyên toàn bộ import page như bạn đã gửi – không thay đổi logic) */
/* Vì quá dài, phần này bạn GIỮ Y NGUYÊN như hiện tại trong file */

/* ================= ROUTES – MANAGER FIX ================= */

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
