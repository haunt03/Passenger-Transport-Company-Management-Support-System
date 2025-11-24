package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.dto.response.Accounting.ExpenseReportResponse;
import org.example.ptcmssbackend.dto.response.Accounting.RevenueReportResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.service.AccountingService;
import org.example.ptcmssbackend.service.ExportService;
import org.example.ptcmssbackend.service.InvoiceService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportServiceImpl implements ExportService {

    private final AccountingService accountingService;
    private final InvoiceService invoiceService;

    @Override
    public Resource exportRevenueReportToExcel(RevenueReportRequest request) {
        log.info("[ExportService] Exporting revenue report to Excel");
        try {
            RevenueReportResponse report = accountingService.getRevenueReport(request);
            
            // Simple CSV format (can be enhanced with Apache POI for real Excel)
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            
            // Header
            pw.println("Revenue Report");
            pw.println("Period: " + (request.getPeriod() != null ? request.getPeriod() : "Custom"));
            pw.println("Generated: " + LocalDate.now().format(DateTimeFormatter.ISO_DATE));
            pw.println();
            
            // Summary
            pw.println("Total Revenue," + report.getTotalRevenue());
            pw.println("Total Paid," + report.getTotalPaid());
            pw.println("Total Balance," + report.getTotalBalance());
            pw.println("Total Invoices," + report.getTotalInvoices());
            pw.println();
            
            // Chart data
            pw.println("Date,Revenue");
            if (report.getRevenueByDate() != null) {
                for (RevenueReportResponse.ChartDataPoint point : report.getRevenueByDate()) {
                    pw.println(point.getDate() + "," + point.getValue());
                }
            }
            
            pw.close();
            byte[] bytes = sw.toString().getBytes(StandardCharsets.UTF_8);
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("[ExportService] Error exporting revenue report to Excel", e);
            throw new RuntimeException("Failed to export revenue report", e);
        }
    }

    @Override
    public Resource exportExpenseReportToExcel(ExpenseReportRequest request) {
        log.info("[ExportService] Exporting expense report to Excel");
        try {
            ExpenseReportResponse report = accountingService.getExpenseReport(request);
            
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            
            // Header
            pw.println("Expense Report");
            pw.println("Generated: " + LocalDate.now().format(DateTimeFormatter.ISO_DATE));
            pw.println();
            
            // Summary
            pw.println("Total Expense," + report.getTotalExpense());
            pw.println("Total Expense Requests," + report.getTotalExpenseRequests());
            pw.println();
            
            // Expense by category
            pw.println("Category,Amount");
            if (report.getExpenseByCategory() != null) {
                report.getExpenseByCategory().forEach((category, amount) -> {
                    pw.println(category + "," + amount);
                });
            }
            
            pw.close();
            byte[] bytes = sw.toString().getBytes(StandardCharsets.UTF_8);
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("[ExportService] Error exporting expense report to Excel", e);
            throw new RuntimeException("Failed to export expense report", e);
        }
    }

    @Override
    public Resource exportInvoiceListToExcel(Integer branchId, String type, String status) {
        log.info("[ExportService] Exporting invoice list to Excel");
        try {
            Pageable pageable = PageRequest.of(0, 10000); // Get all
            Page<InvoiceListResponse> invoices = invoiceService.getInvoices(
                    branchId, type, status, null, null, null, null, pageable);
            
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            
            // Header
            pw.println("Invoice Number,Customer,Amount,Paid Amount,Balance,Due Date,Payment Status");
            
            // Data
            for (InvoiceListResponse invoice : invoices.getContent()) {
                pw.println(
                    invoice.getInvoiceNumber() + "," +
                    (invoice.getCustomerName() != null ? invoice.getCustomerName() : "") + "," +
                    invoice.getAmount() + "," +
                    invoice.getPaidAmount() + "," +
                    invoice.getBalance() + "," +
                    (invoice.getDueDate() != null ? invoice.getDueDate().toString() : "") + "," +
                    invoice.getPaymentStatus()
                );
            }
            
            pw.close();
            byte[] bytes = sw.toString().getBytes(StandardCharsets.UTF_8);
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("[ExportService] Error exporting invoice list to Excel", e);
            throw new RuntimeException("Failed to export invoice list", e);
        }
    }

    @Override
    public Resource exportInvoiceToPDF(Integer invoiceId) {
        log.info("[ExportService] Exporting invoice to PDF");
        try {
            InvoiceResponse invoice = invoiceService.getInvoiceById(invoiceId);
            
            // Simple text format (can be enhanced with iText for real PDF)
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            
            pw.println("INVOICE");
            pw.println("Invoice Number: " + invoice.getInvoiceNumber());
            pw.println("Date: " + (invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().toString() : ""));
            pw.println("Customer: " + (invoice.getCustomerName() != null ? invoice.getCustomerName() : ""));
            pw.println("Amount: " + invoice.getAmount());
            pw.println("Paid: " + invoice.getPaidAmount());
            pw.println("Balance: " + invoice.getBalance());
            pw.println("Status: " + invoice.getPaymentStatus());
            
            pw.close();
            byte[] bytes = sw.toString().getBytes(StandardCharsets.UTF_8);
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("[ExportService] Error exporting invoice to PDF", e);
            throw new RuntimeException("Failed to export invoice", e);
        }
    }

    @Override
    public Resource exportRevenueReportToPDF(RevenueReportRequest request) {
        // Similar to Excel but formatted for PDF
        return exportRevenueReportToExcel(request);
    }

    @Override
    public Resource exportExpenseReportToPDF(ExpenseReportRequest request) {
        // Similar to Excel but formatted for PDF
        return exportExpenseReportToExcel(request);
    }

    @Override
    public Resource exportRevenueReportToCSV(RevenueReportRequest request) {
        return exportRevenueReportToExcel(request);
    }

    @Override
    public Resource exportExpenseReportToCSV(ExpenseReportRequest request) {
        return exportExpenseReportToExcel(request);
    }
}

