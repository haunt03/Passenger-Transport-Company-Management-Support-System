package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.service.AnalyticsService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/export")
@RequiredArgsConstructor
@Tag(name = "Analytics Export", description = "APIs for exporting dashboard reports to Excel")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class AnalyticsExportController {

    private final AnalyticsService analyticsService;

    private NumberFormat currencyFormatter;
    private DecimalFormat percentFormatter;
    private DecimalFormat vietnameseCurrencyFormatter;

    @PostConstruct
    public void init() {
        currencyFormatter = NumberFormat.getNumberInstance(Locale.US);
        currencyFormatter.setMinimumFractionDigits(2);
        currencyFormatter.setMaximumFractionDigits(2);
        percentFormatter = new DecimalFormat("#,##0.00");
        // Format tiền Việt Nam: dấu phẩy phân cách hàng nghìn, dấu chấm cho phần thập phân
        vietnameseCurrencyFormatter = new DecimalFormat("#,##0.00");
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "₫ 0.00";
        // Format theo kiểu Việt Nam: ₫ ở đầu, dấu chấm phân cách hàng nghìn, dấu chấm cho phần thập phân
        // Vì CSV dùng dấu phẩy để phân cách cột, ta dùng dấu chấm cho hàng nghìn để tránh conflict
        String formatted = vietnameseCurrencyFormatter.format(amount);
        // DecimalFormat với pattern "#,##0.00" sẽ format: 53981526.76 -> "53,981,526.76"
        // Ta giữ nguyên format này và thêm ₫ ở đầu
        return "₫ " + formatted;
    }

    private String formatPercent(Double value) {
        if (value == null) return "0.00%";
        return percentFormatter.format(value) + "%";
    }

    private String formatNumber(Object value) {
        if (value == null) return "0";
        if (value instanceof Number) {
            return NumberFormat.getNumberInstance(Locale.US).format((Number) value);
        }
        return String.valueOf(value);
    }

    @Operation(summary = "Export dashboard report to Excel", description = "Export admin or manager dashboard data to Excel (CSV format)")
    @GetMapping("/{dashboardType}")
    public ResponseEntity<Resource> exportDashboardReport(
            @Parameter(description = "Dashboard type: 'admin' or 'manager'") @PathVariable String dashboardType,
            @Parameter(description = "Period: TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, YTD") @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @Parameter(description = "Branch ID (required for manager dashboard)") @RequestParam(required = false) Integer branchId) {

        log.info("Exporting {} dashboard report - period: {}, branchId: {}", dashboardType, period, branchId);

        try {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);

            // Header with Vietnamese labels
            String title = "admin".equalsIgnoreCase(dashboardType) ? "BÁO CÁO DASHBOARD ADMIN" : "BÁO CÁO DASHBOARD CHI NHÁNH";
            pw.println(title);
            pw.println();
            pw.println("Kỳ báo cáo: " + translatePeriod(period));
            pw.println("Ngày xuất: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            if (branchId != null) {
                pw.println("Chi nhánh ID: " + branchId);
            }
            pw.println();

            if ("admin".equalsIgnoreCase(dashboardType)) {
                exportAdminDashboard(pw, period);
            } else if ("manager".equalsIgnoreCase(dashboardType)) {
                if (branchId == null) {
                    return ResponseEntity.badRequest().build();
                }
                exportManagerDashboard(pw, branchId, period);
            } else {
                return ResponseEntity.badRequest().build();
            }

            String content = sw.toString();
            // Add UTF-8 BOM for Excel to recognize Vietnamese characters
            byte[] bom = {(byte)0xEF, (byte)0xBB, (byte)0xBF};
            byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
            byte[] bytes = new byte[bom.length + contentBytes.length];
            System.arraycopy(bom, 0, bytes, 0, bom.length);
            System.arraycopy(contentBytes, 0, bytes, bom.length, contentBytes.length);

            ByteArrayResource resource = new ByteArrayResource(bytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=" + dashboardType + "-dashboard-" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                    .contentLength(bytes.length)
                    .body(resource);

        } catch (Exception e) {
            log.error("Error exporting dashboard report", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private String translatePeriod(String period) {
        if (period == null) return "Tùy chỉnh";
        switch (period.toUpperCase()) {
            case "TODAY": return "Hôm nay";
            case "THIS_WEEK": return "Tuần này";
            case "THIS_MONTH": return "Tháng này";
            case "THIS_QUARTER": return "Quý này";
            case "YTD": return "Năm nay";
            default: return period;
        }
    }

    private void exportAdminDashboard(PrintWriter pw, String period) {
        var dashboard = analyticsService.getAdminDashboard(period);

        // Key Performance Indicators
        pw.println("=== CHỈ SỐ HIỆU SUẤT CHÍNH ===");
        pw.println("Chỉ số,Giá trị");
        pw.println("Tổng Doanh Thu," + formatCurrency(dashboard.getTotalRevenue()));
        pw.println("Tổng Chi Phí," + formatCurrency(dashboard.getTotalExpense()));
        pw.println("Lợi Nhuận Ròng," + formatCurrency(dashboard.getNetProfit()));
        pw.println("Tổng Số Chuyến," + formatNumber(dashboard.getTotalTrips()));
        pw.println("Tỷ Lệ Sử Dụng Xe," + formatPercent(dashboard.getFleetUtilization()));
        pw.println();

        // Revenue Trend
        pw.println("=== XU HƯỚNG DOANH THU & CHI PHÍ (12 THÁNG) ===");
        pw.println("Tháng,Doanh Thu (đ),Chi Phí (đ),Lợi Nhuận (đ)");
        List<org.example.ptcmssbackend.dto.analytics.RevenueTrendDTO> trend = analyticsService.getRevenueTrend();
        for (var item : trend) {
            pw.println(item.getMonth() + "," +
                    formatCurrency(item.getRevenue()) + "," +
                    formatCurrency(item.getExpense()) + "," +
                    formatCurrency(item.getNetProfit()));
        }
        pw.println();

        // Branch Comparison
        pw.println("=== SO SÁNH HIỆU SUẤT CHI NHÁNH ===");
        pw.println("Tên Chi Nhánh,Doanh Thu (đ),Chi Phí (đ),Lợi Nhuận (đ),Tổng Chuyến");
        List<org.example.ptcmssbackend.dto.analytics.BranchComparisonDTO> branches = analyticsService.getBranchComparison(period);
        for (var branch : branches) {
            pw.println(branch.getBranchName() + "," +
                    formatCurrency(branch.getRevenue()) + "," +
                    formatCurrency(branch.getExpense()) + "," +
                    formatCurrency(branch.getNetProfit()) + "," +
                    formatNumber(branch.getTotalTrips()));
        }
    }

    private void exportManagerDashboard(PrintWriter pw, Integer branchId, String period) {
        var dashboard = analyticsService.getManagerDashboard(branchId, period);

        // Key Performance Indicators
        pw.println("=== CHỈ SỐ HIỆU SUẤT CHÍNH ===");
        pw.println("Chỉ số,Giá trị");
        pw.println("Tổng Doanh Thu," + formatCurrency(dashboard.getTotalRevenue()));
        pw.println("Tổng Chi Phí," + formatCurrency(dashboard.getTotalExpense()));
        pw.println("Lợi Nhuận Ròng," + formatCurrency(dashboard.getNetProfit()));
        pw.println("Tổng Số Chuyến," + formatNumber(dashboard.getTotalTrips()));
        pw.println("Chuyến Đã Hoàn Thành," + formatNumber(dashboard.getCompletedTrips()));
        pw.println("Tỷ Lệ Sử Dụng Xe," + formatPercent(dashboard.getFleetUtilization()));
        pw.println("Tổng Số Xe," + formatNumber(dashboard.getTotalVehicles()));
        pw.println("Xe Đang Sử Dụng," + formatNumber(dashboard.getVehiclesInUse()));
        pw.println("Tổng Số Tài Xế," + formatNumber(dashboard.getTotalDrivers()));
        pw.println();

        // Revenue Trend
        pw.println("=== XU HƯỚNG DOANH THU & CHI PHÍ (12 THÁNG) ===");
        pw.println("Tháng,Doanh Thu (đ),Chi Phí (đ),Lợi Nhuận (đ)");
        List<org.example.ptcmssbackend.dto.analytics.RevenueTrendDTO> trend = analyticsService.getBranchRevenueTrend(branchId);
        for (var item : trend) {
            pw.println(item.getMonth() + "," +
                    formatCurrency(item.getRevenue()) + "," +
                    formatCurrency(item.getExpense()) + "," +
                    formatCurrency(item.getNetProfit()));
        }
        pw.println();

        // Driver Performance
        pw.println("=== HIỆU SUẤT TÀI XẾ ===");
        pw.println("Tên Tài Xế,Số Chuyến,KM Đã Chạy");
        List<Map<String, Object>> drivers = analyticsService.getDriverPerformance(branchId, 10);
        for (var driver : drivers) {
            pw.println(driver.get("driverName") + "," +
                    formatNumber(driver.get("trips")) + "," +
                    formatNumber(driver.get("kmDriven")));
        }
        pw.println();

        // Expense Breakdown
        pw.println("=== PHÂN TÍCH CHI PHÍ THEO DANH MỤC ===");
        pw.println("Danh Mục,Tổng Số Tiền (đ),Số Lượng");
        List<Map<String, Object>> expenses = analyticsService.getExpenseBreakdown(branchId);
        for (var expense : expenses) {
            Object amount = expense.get("totalAmount");
            BigDecimal amountValue = amount instanceof BigDecimal ? (BigDecimal) amount :
                    amount instanceof Number ? BigDecimal.valueOf(((Number) amount).doubleValue()) :
                            BigDecimal.ZERO;
            pw.println(expense.get("category") + "," +
                    formatCurrency(amountValue) + "," +
                    formatNumber(expense.get("count")));
        }
    }
}
