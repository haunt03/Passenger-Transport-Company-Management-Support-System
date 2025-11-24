package org.example.ptcmssbackend.dto.response.Accounting;

import lombok.Data;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RevenueReportResponse {
    private BigDecimal totalRevenue;
    private BigDecimal totalPaid;
    private BigDecimal totalBalance;
    private Integer totalInvoices;
    
    // Chart data
    private List<ChartDataPoint> revenueByDate; // Revenue by day/month
    private List<ChartDataPoint> comparisonData; // MoM/YoY comparison
    
    // Top customers
    private List<TopCustomer> topCustomers;
    
    // Invoice list
    private List<InvoiceListResponse> invoices;
    
    @Data
    public static class ChartDataPoint {
        private String date;
        private BigDecimal value;
        private BigDecimal previousValue;
        private BigDecimal changePercent;
    }
    
    @Data
    public static class TopCustomer {
        private Integer customerId;
        private String customerName;
        private BigDecimal totalRevenue;
        private Integer invoiceCount;
        private BigDecimal averageInvoiceAmount;
    }
}

