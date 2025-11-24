package org.example.ptcmssbackend.dto.response.Accounting;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class AccountingDashboardResponse {
    // Summary statistics
    private BigDecimal totalRevenue;
    private BigDecimal totalExpense;
    private BigDecimal netProfit;
    private BigDecimal arBalance; // Accounts Receivable
    private BigDecimal apBalance; // Accounts Payable (if needed)
    private Integer invoicesDueIn7Days;
    private Integer overdueInvoices;
    private BigDecimal collectionRate; // Tỷ lệ thu hồi (%)
    private BigDecimal expenseToRevenueRatio; // Tỷ lệ Chi/Doanh thu (%)
    
    // Charts data
    private List<ChartDataPoint> revenueChart; // Revenue by day/month
    private List<ChartDataPoint> expenseChart; // Expense by day/month
    private Map<String, BigDecimal> expenseByCategory; // Expense breakdown
    
    // Pending approvals
    private List<PendingApprovalItem> pendingApprovals;
    
    // Top customers
    private List<TopCustomer> topCustomers;
    
    @Data
    public static class ChartDataPoint {
        private String date;
        private BigDecimal value;
        private BigDecimal previousValue; // For comparison
    }
    
    @Data
    public static class PendingApprovalItem {
        private Integer invoiceId;
        private String invoiceNumber;
        private String type; // INCOME, EXPENSE
        private String customerName;
        private BigDecimal amount;
        private String createdByName;
        private String createdAt;
    }
    
    @Data
    public static class TopCustomer {
        private Integer customerId;
        private String customerName;
        private BigDecimal totalRevenue;
        private Integer invoiceCount;
    }
}

