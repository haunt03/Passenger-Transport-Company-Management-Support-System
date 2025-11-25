package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.service.ExportService;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Tag(name = "Export Services", description = "APIs for exporting reports and invoices to Excel, CSV, and PDF formats")
public class ExportController {

    private final ExportService exportService;

    @Operation(summary = "Export báo cáo doanh thu Excel", description = "Xuất báo cáo doanh thu ra file Excel (CSV format)")
    @GetMapping("/revenue/excel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<Resource> exportRevenueReportToExcel(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID khách hàng") @RequestParam(required = false) Integer customerId,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Kỳ báo cáo") @RequestParam(required = false) String period) {
        
        log.info("[ExportController] Exporting revenue report to Excel");
        
        try {
            RevenueReportRequest request = new RevenueReportRequest();
            request.setBranchId(branchId);
            request.setCustomerId(customerId);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            request.setPeriod(period);
            
            Resource resource = exportService.exportRevenueReportToExcel(request);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=revenue_report_" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting revenue report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Export báo cáo chi phí Excel", description = "Xuất báo cáo chi phí ra file Excel (CSV format)")
    @GetMapping("/expense/excel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<Resource> exportExpenseReportToExcel(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID xe") @RequestParam(required = false) Integer vehicleId,
            @Parameter(description = "Loại chi phí") @RequestParam(required = false) String expenseType,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("[ExportController] Exporting expense report to Excel");
        
        try {
            ExpenseReportRequest request = new ExpenseReportRequest();
            request.setBranchId(branchId);
            request.setVehicleId(vehicleId);
            request.setExpenseType(expenseType);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            
            Resource resource = exportService.exportExpenseReportToExcel(request);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=expense_report_" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting expense report", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Export danh sách invoices Excel", description = "Xuất danh sách invoices ra file Excel (CSV format)")
    @GetMapping("/invoices/excel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<Resource> exportInvoiceListToExcel(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "Loại: INCOME, EXPENSE") @RequestParam(required = false) String type,
            @Parameter(description = "Trạng thái: ACTIVE, CANCELLED") @RequestParam(required = false) String status) {
        
        log.info("[ExportController] Exporting invoice list to Excel");
        
        try {
            Resource resource = exportService.exportInvoiceListToExcel(branchId, type, status);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=invoices_" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("application/vnd.ms-excel"))
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting invoice list", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Export invoice PDF", description = "Xuất một hóa đơn ra file PDF")
    @GetMapping("/invoice/{invoiceId}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT','CONSULTANT')")
    public ResponseEntity<Resource> exportInvoiceToPDF(
            @Parameter(description = "ID của invoice", required = true) @PathVariable Integer invoiceId) {
        log.info("[ExportController] Exporting invoice to PDF: {}", invoiceId);
        
        try {
            Resource resource = exportService.exportInvoiceToPDF(invoiceId);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=invoice_" + invoiceId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting invoice to PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Export báo cáo doanh thu CSV", description = "Xuất báo cáo doanh thu ra file CSV")
    @GetMapping("/revenue/csv")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<Resource> exportRevenueReportToCSV(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID khách hàng") @RequestParam(required = false) Integer customerId,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Kỳ báo cáo") @RequestParam(required = false) String period) {
        
        log.info("[ExportController] Exporting revenue report to CSV");
        
        try {
            RevenueReportRequest request = new RevenueReportRequest();
            request.setBranchId(branchId);
            request.setCustomerId(customerId);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            request.setPeriod(period);
            
            Resource resource = exportService.exportRevenueReportToCSV(request);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=revenue_report_" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting revenue report to CSV", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Export báo cáo chi phí CSV", description = "Xuất báo cáo chi phí ra file CSV")
    @GetMapping("/expense/csv")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<Resource> exportExpenseReportToCSV(
            @Parameter(description = "ID chi nhánh") @RequestParam(required = false) Integer branchId,
            @Parameter(description = "ID xe") @RequestParam(required = false) Integer vehicleId,
            @Parameter(description = "Loại chi phí") @RequestParam(required = false) String expenseType,
            @Parameter(description = "Ngày bắt đầu") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Ngày kết thúc") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("[ExportController] Exporting expense report to CSV");
        
        try {
            ExpenseReportRequest request = new ExpenseReportRequest();
            request.setBranchId(branchId);
            request.setVehicleId(vehicleId);
            request.setExpenseType(expenseType);
            request.setStartDate(startDate);
            request.setEndDate(endDate);
            
            Resource resource = exportService.exportExpenseReportToCSV(request);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=expense_report_" + LocalDate.now() + ".csv")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(resource);
        } catch (Exception e) {
            log.error("[ExportController] Error exporting expense report to CSV", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

