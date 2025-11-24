package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.springframework.core.io.Resource;

public interface ExportService {
    
    // Excel export
    Resource exportRevenueReportToExcel(RevenueReportRequest request);
    Resource exportExpenseReportToExcel(ExpenseReportRequest request);
    Resource exportInvoiceListToExcel(Integer branchId, String type, String status);
    
    // PDF export
    Resource exportInvoiceToPDF(Integer invoiceId);
    Resource exportRevenueReportToPDF(RevenueReportRequest request);
    Resource exportExpenseReportToPDF(ExpenseReportRequest request);
    
    // CSV export
    Resource exportRevenueReportToCSV(RevenueReportRequest request);
    Resource exportExpenseReportToCSV(ExpenseReportRequest request);
}

