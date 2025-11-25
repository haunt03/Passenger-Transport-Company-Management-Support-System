package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.dto.response.Accounting.AccountingDashboardResponse;
import org.example.ptcmssbackend.dto.response.Accounting.ExpenseReportResponse;
import org.example.ptcmssbackend.dto.response.Accounting.RevenueReportResponse;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface AccountingService {
    
    // Dashboard
    AccountingDashboardResponse getDashboard(Integer branchId, String period);
    
    // Reports
    RevenueReportResponse getRevenueReport(RevenueReportRequest request);
    ExpenseReportResponse getExpenseReport(ExpenseReportRequest request);
    
    // Statistics
    BigDecimal getTotalRevenue(Integer branchId, LocalDate startDate, LocalDate endDate);
    BigDecimal getTotalExpense(Integer branchId, LocalDate startDate, LocalDate endDate);
    BigDecimal getARBalance(Integer branchId);
    BigDecimal getAPBalance(Integer branchId);
    int getInvoicesDueIn7Days(Integer branchId);
    int getOverdueInvoices(Integer branchId);
    BigDecimal getCollectionRate(Integer branchId, LocalDate startDate, LocalDate endDate);
    BigDecimal getExpenseToRevenueRatio(Integer branchId, LocalDate startDate, LocalDate endDate);
}

