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

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.text.NumberFormat;
import java.util.Locale;

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

    /**
     * Remove Vietnamese accents/diacritics
     */
    private String removeVietnameseAccents(String str) {
        if (str == null) return "";

        String[][] accents = {
                {"à", "á", "ả", "ã", "ạ", "ă", "ằ", "ắ", "ẳ", "ẵ", "ặ", "â", "ầ", "ấ", "ẩ", "ẫ", "ậ"},
                {"è", "é", "ẻ", "ẽ", "ẹ", "ê", "ề", "ế", "ể", "ễ", "ệ"},
                {"ì", "í", "ỉ", "ĩ", "ị"},
                {"ò", "ó", "ỏ", "õ", "ọ", "ô", "ồ", "ố", "ổ", "ỗ", "ộ", "ơ", "ờ", "ớ", "ở", "ỡ", "ợ"},
                {"ù", "ú", "ủ", "ũ", "ụ", "ư", "ừ", "ứ", "ử", "ữ", "ự"},
                {"ỳ", "ý", "ỷ", "ỹ", "ỵ"},
                {"đ"},
                {"À", "Á", "Ả", "Ã", "Ạ", "Ă", "Ằ", "Ắ", "Ẳ", "Ẵ", "Ặ", "Â", "Ầ", "Ấ", "Ẩ", "Ẫ", "Ậ"},
                {"È", "É", "Ẻ", "Ẽ", "Ẹ", "Ê", "Ề", "Ế", "Ể", "Ễ", "Ệ"},
                {"Ì", "Í", "Ỉ", "Ĩ", "Ị"},
                {"Ò", "Ó", "Ỏ", "Õ", "Ọ", "Ô", "Ồ", "Ố", "Ổ", "Ỗ", "Ộ", "Ơ", "Ờ", "Ớ", "Ở", "Ỡ", "Ợ"},
                {"Ù", "Ú", "Ủ", "Ũ", "Ụ", "Ư", "Ừ", "Ứ", "Ử", "Ữ", "Ự"},
                {"Ỳ", "Ý", "Ỷ", "Ỹ", "Ỵ"},
                {"Đ"}
        };

        String[] replacements = {"a", "e", "i", "o", "u", "y", "d", "A", "E", "I", "O", "U", "Y", "D"};

        for (int i = 0; i < accents.length; i++) {
            for (String accent : accents[i]) {
                str = str.replace(accent, replacements[i]);
            }
        }

        return str;
    }

    @Override
    public Resource exportInvoiceToPDF(Integer invoiceId) {
        log.info("[ExportService] Exporting invoice to PDF: {}", invoiceId);
        try {
            InvoiceResponse invoice = invoiceService.getInvoiceById(invoiceId);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            // Use standard fonts (Helvetica supports basic Latin characters)
            PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            // Number formatter
            NumberFormat currencyFormat = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
                    .withZone(java.time.ZoneId.systemDefault());

            // Title
            Paragraph title = new Paragraph("HOA DON / INVOICE")
                    .setFont(boldFont)
                    .setFontSize(22)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30);
            document.add(title);

            // Company info
            document.add(new Paragraph("TranspoManager")
                    .setFont(boldFont)
                    .setFontSize(16)
                    .setMarginBottom(5));
            document.add(new Paragraph("Passenger Transport Company Management System")
                    .setFont(font)
                    .setFontSize(10)
                    .setMarginBottom(25));

            // Invoice info section
            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                    .useAllAvailableWidth()
                    .setMarginBottom(20);

            // Left column
            infoTable.addCell(new Paragraph("Invoice Number: " + (invoice.getInvoiceNumber() != null ? removeVietnameseAccents(invoice.getInvoiceNumber()) : "N/A"))
                    .setFont(font)
                    .setFontSize(11)
                    .setBorder(null));

            // Right column
            infoTable.addCell(new Paragraph("Date: " + (invoice.getInvoiceDate() != null ? dateFormatter.format(invoice.getInvoiceDate()) : "N/A"))
                    .setFont(font)
                    .setFontSize(11)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(null));

            infoTable.addCell(new Paragraph("Customer: " + (invoice.getCustomerName() != null ? removeVietnameseAccents(invoice.getCustomerName()) : "N/A"))
                    .setFont(font)
                    .setFontSize(11)
                    .setBorder(null));

            infoTable.addCell(new Paragraph("Due Date: " + (invoice.getDueDate() != null ? dateFormatter.format(invoice.getDueDate()) : "N/A"))
                    .setFont(font)
                    .setFontSize(11)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(null));

            document.add(infoTable);

            // Booking reference if available
            if (invoice.getBookingId() != null) {
                document.add(new Paragraph("Booking Reference: ORD-" + invoice.getBookingId())
                        .setFont(font)
                        .setFontSize(10)
                        .setMarginBottom(20));
            }

            // Items table
            Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{3, 2}))
                    .useAllAvailableWidth()
                    .setMarginBottom(20);

            // Header
            Cell headerCell1 = new Cell().add(new Paragraph("Description")
                            .setFont(boldFont)
                            .setFontSize(11))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY);
            itemsTable.addHeaderCell(headerCell1);

            Cell headerCell2 = new Cell().add(new Paragraph("Amount")
                            .setFont(boldFont)
                            .setFontSize(11)
                            .setTextAlignment(TextAlignment.RIGHT))
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY);
            itemsTable.addHeaderCell(headerCell2);

            // Service description
            String serviceDesc = invoice.getNote() != null && !invoice.getNote().isEmpty()
                    ? removeVietnameseAccents(invoice.getNote())
                    : "Transportation Service";
            itemsTable.addCell(new Paragraph(serviceDesc)
                    .setFont(font)
                    .setFontSize(10));
            itemsTable.addCell(new Paragraph(currencyFormat.format(invoice.getAmount()) + " VND")
                    .setFont(font)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.RIGHT));

            document.add(itemsTable);

            // Summary table
            Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{3, 2}))
                    .useAllAvailableWidth()
                    .setMarginBottom(20);

            summaryTable.addCell(new Paragraph("Total Amount")
                    .setFont(boldFont)
                    .setFontSize(11)
                    .setBorder(null));
            summaryTable.addCell(new Paragraph(currencyFormat.format(invoice.getAmount()) + " VND")
                    .setFont(boldFont)
                    .setFontSize(11)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(null));

            summaryTable.addCell(new Paragraph("Paid Amount")
                    .setFont(font)
                    .setFontSize(10)
                    .setBorder(null));
            summaryTable.addCell(new Paragraph(currencyFormat.format(invoice.getPaidAmount()) + " VND")
                    .setFont(font)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(null));

            summaryTable.addCell(new Paragraph("Balance Due")
                    .setFont(boldFont)
                    .setFontSize(12)
                    .setBorder(null)
                    .setMarginTop(5));
            summaryTable.addCell(new Paragraph(currencyFormat.format(invoice.getBalance()) + " VND")
                    .setFont(boldFont)
                    .setFontSize(12)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBorder(null)
                    .setMarginTop(5));

            document.add(summaryTable);

            // Payment status
            String statusText = "Payment Status: ";
            if (invoice.getPaymentStatus() != null) {
                switch (invoice.getPaymentStatus().toString()) {
                    case "PAID":
                        statusText += "PAID";
                        break;
                    case "UNPAID":
                        statusText += "UNPAID";
                        break;
                    case "OVERDUE":
                        statusText += "OVERDUE";
                        break;
                    default:
                        statusText += invoice.getPaymentStatus().toString();
                }
            } else {
                statusText += "N/A";
            }

            document.add(new Paragraph(statusText)
                    .setFont(boldFont)
                    .setFontSize(11)
                    .setMarginTop(15)
                    .setMarginBottom(30));

            // Footer
            document.add(new Paragraph("Thank you for your business!")
                    .setFont(font)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(40));

            document.add(new Paragraph("This is a computer-generated invoice.")
                    .setFont(font)
                    .setFontSize(8)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(5));

            document.close();

            byte[] bytes = baos.toByteArray();
            log.info("[ExportService] Successfully generated PDF for invoice {}, size: {} bytes", invoiceId, bytes.length);
            return new ByteArrayResource(bytes);
        } catch (Exception e) {
            log.error("[ExportService] Error exporting invoice to PDF: {}", invoiceId, e);
            throw new RuntimeException("Failed to export invoice to PDF: " + e.getMessage(), e);
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

