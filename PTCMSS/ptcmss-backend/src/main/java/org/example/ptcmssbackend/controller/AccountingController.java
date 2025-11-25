package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.dto.response.Accounting.AccountingDashboardResponse;
import org.example.ptcmssbackend.dto.response.Accounting.ExpenseReportResponse;
import org.example.ptcmssbackend.dto.response.Accounting.RevenueReportResponse;
import org.example.ptcmssbackend.dto.response.common.ApiResponse;
import org.example.ptcmssbackend.service.AccountingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;

@Slf4j
@RestController
@RequestMapping("/api/accounting")
@RequiredArgsConstructor
@Tag(name = "Accounting & Reports", description = "APIs for accounting dashboard, revenue reports, expense reports, and statistics")
public class AccountingController {

    private final AccountingService accountingService;

    @Operation(summary = "Accounting Dashboard", description = "Dashboard kế toán với biểu đồ, thống kê, và danh sách chờ duyệt. Period: TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, YTD")
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<AccountingDashboardResponse>> getDashboard(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Kỳ báo cáo: TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER, YTD") @RequestParam(required = false, defaultValue = "THIS_MONTH") String period) {
        
        log.info("[AccountingController] Getting dashboard - branch: {}, period: {}", branchId, period);
        
        try {
            AccountingDashboardResponse response = accountingService.getDashboard(branchId, period);
            return ResponseEntity.ok(ApiResponse.<AccountingDashboardResponse>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting dashboard", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<AccountingDashboardResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Báo cáo doanh thu", description = "Báo cáo doanh thu chi tiết với biểu đồ, top customers, và danh sách invoices. Period: TODAY, 7D, 30D, MONTH, QUARTER, YTD")
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getRevenueReport(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID khách hàng") @RequestParam(required = false) Integer customerId,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Kỳ báo cáo: TODAY, 7D, 30D, MONTH, QUARTER, YTD") @RequestParam(required = false) String period) {
        
        log.info("[AccountingController] Getting revenue report - branch: {}, period: {}", branchId, period);
        
        try {
            RevenueReportRequest request = new RevenueReportRequest();
            request.setBranchId(branchId);
            request.setCustomerId(customerId);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            request.setPeriod(period);
            
            RevenueReportResponse response = accountingService.getRevenueReport(request);
            return ResponseEntity.ok(ApiResponse.<RevenueReportResponse>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting revenue report", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<RevenueReportResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Báo cáo chi phí", description = "Báo cáo chi phí chi tiết với breakdown theo category, vehicle, driver. Expense types: fuel, toll, maintenance, salary, etc.")
    @GetMapping("/expense")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ExpenseReportResponse>> getExpenseReport(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID xe") @RequestParam(required = false) Integer vehicleId,
            @Parameter(description = "ID tài xế") @RequestParam(required = false) Integer driverId,
            @Parameter(description = "Loại chi phí: fuel, toll, maintenance, salary, etc.") @RequestParam(required = false) String expenseType,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("[AccountingController] Getting expense report - branch: {}", branchId);
        
        try {
            ExpenseReportRequest request = new ExpenseReportRequest();
            request.setBranchId(branchId);
            request.setVehicleId(vehicleId);
            request.setDriverId(driverId);
            request.setExpenseType(expenseType);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            
            ExpenseReportResponse response = accountingService.getExpenseReport(request);
            return ResponseEntity.ok(ApiResponse.<ExpenseReportResponse>builder()
                    .success(true)
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting expense report", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<ExpenseReportResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tổng doanh thu", description = "Tính tổng doanh thu trong khoảng thời gian")
    @GetMapping("/stats/revenue")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalRevenue(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Ngày bắt đầu", required = true) @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc", required = true) @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            BigDecimal revenue = accountingService.getTotalRevenue(branchId, startDate, endDate);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(revenue)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting total revenue", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Tổng chi phí", description = "Tính tổng chi phí trong khoảng thời gian")
    @GetMapping("/stats/expense")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalExpense(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Ngày bắt đầu", required = true) @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc", required = true) @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            BigDecimal expense = accountingService.getTotalExpense(branchId, startDate, endDate);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(expense)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting total expense", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Công nợ phải thu", description = "Tính tổng công nợ phải thu (Accounts Receivable)")
    @GetMapping("/stats/ar-balance")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<BigDecimal>> getARBalance(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId) {
        
        try {
            BigDecimal arBalance = accountingService.getARBalance(branchId);
            return ResponseEntity.ok(ApiResponse.<BigDecimal>builder()
                    .success(true)
                    .data(arBalance)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting AR balance", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BigDecimal>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Hóa đơn đến hạn 7 ngày", description = "Đếm số hóa đơn sẽ đến hạn trong 7 ngày tới")
    @GetMapping("/stats/invoices-due")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Integer>> getInvoicesDueIn7Days(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId) {
        
        try {
            int count = accountingService.getInvoicesDueIn7Days(branchId);
            return ResponseEntity.ok(ApiResponse.<Integer>builder()
                    .success(true)
                    .data(count)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting invoices due", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Integer>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    @Operation(summary = "Hóa đơn quá hạn", description = "Đếm số hóa đơn đã quá hạn thanh toán")
    @GetMapping("/stats/overdue")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Integer>> getOverdueInvoices(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId) {
        
        try {
            int count = accountingService.getOverdueInvoices(branchId);
            return ResponseEntity.ok(ApiResponse.<Integer>builder()
                    .success(true)
                    .data(count)
                    .build());
        } catch (Exception e) {
            log.error("[AccountingController] Error getting overdue invoices", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Integer>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }
}

