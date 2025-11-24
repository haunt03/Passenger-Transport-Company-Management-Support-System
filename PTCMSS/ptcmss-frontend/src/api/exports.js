import { apiFetch } from "./http";

/**
 * Export API
 * Module 6 - Export endpoints (Excel, CSV, PDF)
 */

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:8080";

function getAccessToken() {
    try {
        return localStorage.getItem("access_token") || "";
    } catch {
        return "";
    }
}

// Helper to download file from blob response
async function downloadFile(url, filename) {
    try {
        const token = getAccessToken();
        const response = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to download file");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error("Download error:", error);
        throw error;
    }
}

// Export revenue report to Excel
export async function exportRevenueReportToExcel({
                                                     branchId,
                                                     customerId,
                                                     startDate,
                                                     endDate,
                                                     period,
                                                 } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    const url = `${API_BASE}/api/export/revenue/excel${qs ? `?${qs}` : ""}`;
    await downloadFile(url, `revenue-report-${Date.now()}.xlsx`);
}

// Export expense report to Excel
export async function exportExpenseReportToExcel({
                                                     branchId,
                                                     costType,
                                                     vehicleId,
                                                     startDate,
                                                     endDate,
                                                     period,
                                                 } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (costType) params.append("costType", costType);
    if (vehicleId != null) params.append("vehicleId", String(vehicleId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    const url = `${API_BASE}/api/export/expense/excel${qs ? `?${qs}` : ""}`;
    await downloadFile(url, `expense-report-${Date.now()}.xlsx`);
}

// Export invoice list to Excel
export async function exportInvoiceListToExcel({
                                                   branchId,
                                                   customerId,
                                                   paymentStatus,
                                                   startDate,
                                                   endDate,
                                               } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (paymentStatus) params.append("paymentStatus", paymentStatus);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const qs = params.toString();
    const url = `${API_BASE}/api/export/invoices/excel${qs ? `?${qs}` : ""}`;
    await downloadFile(url, `invoice-list-${Date.now()}.xlsx`);
}

// Export invoice to PDF
export async function exportInvoiceToPdf(invoiceId) {
    const url = `${API_BASE}/api/export/invoice/${invoiceId}/pdf`;
    await downloadFile(url, `invoice-${invoiceId}-${Date.now()}.pdf`);
}

// Export revenue report to CSV
export async function exportRevenueReportToCsv({
                                                   branchId,
                                                   customerId,
                                                   startDate,
                                                   endDate,
                                                   period,
                                               } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (customerId != null) params.append("customerId", String(customerId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    const url = `${API_BASE}/api/export/revenue/csv${qs ? `?${qs}` : ""}`;
    await downloadFile(url, `revenue-report-${Date.now()}.csv`);
}

// Export expense report to CSV
export async function exportExpenseReportToCsv({
                                                   branchId,
                                                   costType,
                                                   vehicleId,
                                                   startDate,
                                                   endDate,
                                                   period,
                                               } = {}) {
    const params = new URLSearchParams();
    if (branchId != null) params.append("branchId", String(branchId));
    if (costType) params.append("costType", costType);
    if (vehicleId != null) params.append("vehicleId", String(vehicleId));
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (period) params.append("period", period);
    const qs = params.toString();
    const url = `${API_BASE}/api/export/expense/csv${qs ? `?${qs}` : ""}`;
    await downloadFile(url, `expense-report-${Date.now()}.csv`);
}
