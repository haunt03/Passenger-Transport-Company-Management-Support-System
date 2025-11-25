package org.example.ptcmssbackend.dto.response.Accounting;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ExpenseReportResponse {
    private BigDecimal totalExpense;
    private Integer totalExpenseRequests;
    
    // Expense breakdown by category
    private Map<String, BigDecimal> expenseByCategory; // fuel, toll, maintenance, etc.
    private Map<String, BigDecimal> expenseByVehicle;
    private Map<String, BigDecimal> expenseByDriver;
    
    // Chart data
    private List<ChartDataPoint> expenseByDate;
    private List<DonutChartData> expenseByCategoryDonut;
    
    // Top items
    private List<TopExpenseItem> topExpenseItems;
    private List<TopExpenseVehicle> topExpenseVehicles;
    
    // Optional: Cost per km
    private BigDecimal averageCostPerKm;
    private Map<String, BigDecimal> costPerKmByVehicle;
    
    // List of expenses for table display
    private List<ExpenseItem> expenses;
    
    @Data
    public static class ChartDataPoint {
        private String date;
        private BigDecimal value;
    }
    
    @Data
    public static class DonutChartData {
        private String category;
        private BigDecimal amount;
        private BigDecimal percentage;
    }
    
    @Data
    public static class TopExpenseItem {
        private String expenseType;
        private BigDecimal totalAmount;
        private Integer count;
    }
    
    @Data
    public static class TopExpenseVehicle {
        private Integer vehicleId;
        private String licensePlate;
        private BigDecimal totalExpense;
        private Integer tripCount;
    }
    
    @Data
    public static class ExpenseItem {
        private Integer invoiceId;
        private String invoiceDate;
        private String branchName;
        private String vehicleLicensePlate;
        private String costType;
        private BigDecimal amount;
        private String note;
    }
}

