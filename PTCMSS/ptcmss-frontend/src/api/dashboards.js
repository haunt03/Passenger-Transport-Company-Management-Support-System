import axiosInstance from "./axiosInstance";

/**
 * API for Module 7: Reporting & Analytics
 * Dashboards for Admin and Manager roles
 */

// ==================== ADMIN DASHBOARD ====================

/**
 * Get Admin Dashboard overview data
 * @param {Object} params - { period: 'TODAY'|'THIS_WEEK'|'THIS_MONTH'|'THIS_QUARTER'|'YTD' }
 * @returns {Promise}
 */
export async function getAdminDashboard(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/dashboard", {
        params,
    });
    return response.data;
}

/**
 * Get revenue & expense trend (12 months)
 * @returns {Promise}
 */
export async function getRevenueTrend(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/analytics/revenue-trend", {
        params,
    });
    return response.data;
}

/**
 * Get branch performance comparison
 * @param {Object} params - { startDate, endDate }
 * @returns {Promise}
 */
export async function getBranchComparison(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/analytics/branch-comparison", {
        params,
    });
    return response.data;
}

/**
 * Get fleet utilization statistics
 * @returns {Promise}
 */
export async function getFleetUtilization(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/analytics/fleet-utilization", {
        params,
    });
    return response.data;
}

/**
 * Get top routes analytics
 * @param {Object} params - { startDate, endDate, limit: 5 }
 * @returns {Promise}
 */
export async function getTopRoutes(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/analytics/top-routes", {
        params: { limit: 5, ...params },
    });
    return response.data;
}

/**
 * Get top vehicle categories by usage
 * @param {Object} params - { period, limit: 5 }
 * @returns {Promise}
 */
export async function getTopVehicleCategories(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/analytics/top-vehicle-categories", {
        params: { limit: 5, ...params },
    });
    return response.data;
}

/**
 * Get system alerts (critical warnings)
 * @param {Object} params - { severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW' }
 * @returns {Promise}
 */
export async function getSystemAlerts(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/alerts", {
        params,
    });
    return response.data;
}

/**
 * Acknowledge/dismiss an alert
 * @param {number} alertId
 * @returns {Promise}
 */
export async function acknowledgeAlert(alertId) {
    const response = await axiosInstance.post(`/api/v1/admin/alerts/${alertId}/acknowledge`);
    return response.data;
}

/**
 * Get pending approvals across all branches
 * @returns {Promise}
 */
export async function getPendingApprovals(params = {}) {
    const response = await axiosInstance.get("/api/v1/admin/approvals/pending", {
        params,
    });
    return response.data;
}

// ==================== MANAGER DASHBOARD ====================

/**
 * Get Manager Dashboard data for specific branch
 * @param {Object} params - { branchId, period }
 * @returns {Promise}
 */
export async function getManagerDashboard(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/dashboard", {
        params,
    });
    return response.data;
}

/**
 * Get branch-specific revenue trend
 * @param {Object} params - { branchId, startDate, endDate }
 * @returns {Promise}
 */
export async function getBranchRevenueTrend(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/analytics/revenue-trend", {
        params,
    });
    return response.data;
}

/**
 * Get driver performance for branch
 * @param {Object} params - { branchId, startDate, endDate, limit: 5 }
 * @returns {Promise}
 */
export async function getBranchDriverPerformance(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/analytics/driver-performance", {
        params: { limit: 5, ...params },
    });
    return response.data;
}

/**
 * Get vehicle booking performance for branch (vehicles ordered by booking count)
 * @param {Object} params - { branchId, period, limit: 5 }
 * @returns {Promise}
 */
export async function getBranchVehicleBookingPerformance(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/analytics/vehicle-booking-performance", {
        params: { limit: 5, ...params },
    });
    return response.data;
}

/**
 * Get vehicle utilization for branch
 * @param {Object} params - { branchId }
 * @returns {Promise}
 */
export async function getBranchVehicleUtilization(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/analytics/vehicle-utilization", {
        params,
    });
    return response.data;
}

/**
 * Get vehicle efficiency (cost per km) for branch
 * @param {Object} params - { branchId, period }
 * @returns {Promise}
 */
export async function getBranchVehicleEfficiency(params = {}) {
    try {
        const response = await axiosInstance.get("/api/v1/manager/analytics/vehicle-efficiency", {
            params,
        });
        return response.data;
    } catch (error) {
        // API not implemented yet - return empty data
        console.warn(`[API] Vehicle efficiency endpoint not implemented for branch ${params.branchId}:`, error.message);
        return [];
    }
}

/**
 * Get expense breakdown by category
 * @param {Object} params - { branchId, startDate, endDate }
 * @returns {Promise}
 */
export async function getBranchExpenseBreakdown(params = {}) {
    try {
        const response = await axiosInstance.get("/api/v1/manager/analytics/expense-breakdown", {
            params,
        });
        return response.data;
    } catch (error) {
        // API not implemented yet - return empty data
        console.warn(`[API] Expense breakdown endpoint not implemented for branch ${params.branchId}:`, error.message);
        return [];
    }
}

/**
 * Get pending approvals for specific branch
 * @param {Object} params - { branchId }
 * @returns {Promise}
 */
export async function getBranchPendingApprovals(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/approvals/pending", {
        params,
    });
    return response.data;
}

/**
 * Get branch alerts
 * @param {Object} params - { branchId, severity }
 * @returns {Promise}
 */
export async function getBranchAlerts(params = {}) {
    const response = await axiosInstance.get("/api/v1/manager/alerts", {
        params,
    });
    return response.data;
}

/**
 * Approve day-off request
 * @param {number} dayOffId
 * @param {Object} data - { note }
 * @returns {Promise}
 */
export async function approveDayOff(dayOffId, data = {}) {
    const response = await axiosInstance.post(`/api/v1/manager/day-off/${dayOffId}/approve`, data);
    return response.data;
}

/**
 * Reject day-off request
 * @param {number} dayOffId
 * @param {Object} data - { reason }
 * @returns {Promise}
 */
export async function rejectDayOff(dayOffId, data = {}) {
    const response = await axiosInstance.post(`/api/v1/manager/day-off/${dayOffId}/reject`, data);
    return response.data;
}

/**
 * Approve expense request
 * @param {number} expenseRequestId
 * @param {Object} data - { note }
 * @returns {Promise}
 */
export async function approveExpenseRequest(expenseRequestId, data = {}) {
    const response = await axiosInstance.post(`/api/v1/manager/expense-requests/${expenseRequestId}/approve`, data);
    return response.data;
}

/**
 * Reject expense request
 * @param {number} expenseRequestId
 * @param {Object} data - { reason }
 * @returns {Promise}
 */
export async function rejectExpenseRequest(expenseRequestId, data = {}) {
    const response = await axiosInstance.post(`/api/v1/manager/expense-requests/${expenseRequestId}/reject`, data);
    return response.data;
}

// ==================== COMMON ANALYTICS ====================

/**
 * Get customer statistics
 * @param {Object} params - { branchId, startDate, endDate, limit: 10 }
 * @returns {Promise}
 */
export async function getCustomerStatistics(params = {}) {
    const response = await axiosInstance.get("/api/v1/analytics/customers", {
        params: { limit: 10, ...params },
    });
    return response.data;
}

/**
 * Export dashboard report to Excel
 * @param {string} dashboardType - 'admin' | 'manager'
 * @param {Object} params
 * @returns {Promise}
 */
export async function exportDashboardReport(dashboardType, params = {}) {
    const response = await axiosInstance.get(`/api/v1/analytics/export/${dashboardType}`, {
        params,
        responseType: "blob",
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${dashboardType}-dashboard-${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response.data;
}
