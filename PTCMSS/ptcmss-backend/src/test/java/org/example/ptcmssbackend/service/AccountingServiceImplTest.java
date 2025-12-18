package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Accounting.ExpenseReportRequest;
import org.example.ptcmssbackend.dto.request.Accounting.RevenueReportRequest;
import org.example.ptcmssbackend.dto.response.Accounting.AccountingDashboardResponse;
import org.example.ptcmssbackend.dto.response.Accounting.ExpenseReportResponse;
import org.example.ptcmssbackend.dto.response.Accounting.RevenueReportResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.repository.ExpenseRequestRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.impl.AccountingServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountingServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private ExpenseRequestRepository expenseRequestRepository;
    @Mock
    private InvoiceService invoiceService;

    @InjectMocks
    private AccountingServiceImpl accountingService;

    // ==================== getTotalRevenue() Tests ====================

    @Test
    void getTotalRevenue_whenValidRequest_shouldReturnTotal() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(new BigDecimal("5000000"));

        // When
        BigDecimal result = accountingService.getTotalRevenue(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(new BigDecimal("5000000"));
        verify(invoiceRepository).sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end);
    }

    @Test
    void getTotalRevenue_whenNoRevenue_shouldReturnZero() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal result = accountingService.getTotalRevenue(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getTotalExpense() Tests ====================

    @Test
    void getTotalExpense_whenValidRequest_shouldReturnTotal() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.EXPENSE, start, end))
                .thenReturn(new BigDecimal("2000000"));

        // When
        BigDecimal result = accountingService.getTotalExpense(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(new BigDecimal("2000000"));
        verify(invoiceRepository).sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.EXPENSE, start, end);
    }

    // ==================== getARBalance() Tests ====================

    @Test
    void getARBalance_whenUnpaidInvoicesExist_shouldReturnBalance() {
        // Given
        Integer branchId = 10;
        Invoices invoice1 = createTestInvoice(100, PaymentStatus.UNPAID);
        Invoices invoice2 = createTestInvoice(101, PaymentStatus.OVERDUE);
        List<Invoices> invoices = List.of(invoice1, invoice2);

        when(invoiceRepository.findUnpaidInvoices(branchId)).thenReturn(invoices);
        when(invoiceService.calculateBalance(100)).thenReturn(new BigDecimal("500000"));
        when(invoiceService.calculateBalance(101)).thenReturn(new BigDecimal("300000"));

        // When
        BigDecimal result = accountingService.getARBalance(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(new BigDecimal("800000"));
        verify(invoiceService, times(2)).calculateBalance(anyInt());
    }

    @Test
    void getARBalance_whenNoUnpaidInvoices_shouldReturnZero() {
        // Given
        Integer branchId = 10;

        when(invoiceRepository.findUnpaidInvoices(branchId)).thenReturn(Collections.emptyList());

        // When
        BigDecimal result = accountingService.getARBalance(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getAPBalance() Tests ====================

    @Test
    void getAPBalance_shouldReturnZero() {
        // Given
        Integer branchId = 10;

        // When
        BigDecimal result = accountingService.getAPBalance(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getInvoicesDueIn7Days() Tests ====================

    @Test
    void getInvoicesDueIn7Days_whenInvoicesExist_shouldReturnCount() {
        // Given
        Integer branchId = 10;
        Invoices invoice1 = createTestInvoice(100, PaymentStatus.UNPAID);
        Invoices invoice2 = createTestInvoice(101, PaymentStatus.UNPAID);
        List<Invoices> invoices = List.of(invoice1, invoice2);

        when(invoiceRepository.findInvoicesDueInRange(any(), any(), eq(branchId)))
                .thenReturn(invoices);

        // When
        int result = accountingService.getInvoicesDueIn7Days(branchId);

        // Then
        assertThat(result).isEqualTo(2);
        verify(invoiceRepository).findInvoicesDueInRange(any(), any(), eq(branchId));
    }

    @Test
    void getInvoicesDueIn7Days_whenNoInvoices_shouldReturnZero() {
        // Given
        Integer branchId = 10;

        when(invoiceRepository.findInvoicesDueInRange(any(), any(), eq(branchId)))
                .thenReturn(Collections.emptyList());

        // When
        int result = accountingService.getInvoicesDueIn7Days(branchId);

        // Then
        assertThat(result).isEqualTo(0);
    }

    // ==================== getOverdueInvoices() Tests ====================

    @Test
    void getOverdueInvoices_whenOverdueExist_shouldReturnCount() {
        // Given
        Integer branchId = 10;
        Invoices invoice1 = createTestInvoice(100, PaymentStatus.OVERDUE);
        Invoices invoice2 = createTestInvoice(101, PaymentStatus.OVERDUE);
        List<Invoices> invoices = List.of(invoice1, invoice2);

        when(invoiceRepository.findOverdueInvoices(branchId)).thenReturn(invoices);

        // When
        int result = accountingService.getOverdueInvoices(branchId);

        // Then
        assertThat(result).isEqualTo(2);
        verify(invoiceRepository).findOverdueInvoices(branchId);
    }

    @Test
    void getOverdueInvoices_whenNoOverdue_shouldReturnZero() {
        // Given
        Integer branchId = 10;

        when(invoiceRepository.findOverdueInvoices(branchId)).thenReturn(Collections.emptyList());

        // When
        int result = accountingService.getOverdueInvoices(branchId);

        // Then
        assertThat(result).isEqualTo(0);
    }

    // ==================== getCollectionRate() Tests ====================

    @Test
    void getCollectionRate_whenValidData_shouldCalculateRate() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        Invoices invoice = createTestInvoice(100, PaymentStatus.PAID);

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(new BigDecimal("1000000"));
        when(invoiceRepository.findInvoicesWithFilters(eq(branchId), eq(InvoiceType.INCOME), 
                eq(InvoiceStatus.ACTIVE), eq(start), eq(end), isNull(), eq(PaymentStatus.PAID)))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100))
                .thenReturn(new BigDecimal("800000"));

        // When
        BigDecimal result = accountingService.getCollectionRate(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        // 800000 / 1000000 * 100 = 80%
        assertThat(result).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    void getCollectionRate_whenNoRevenue_shouldReturnZero() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal result = accountingService.getCollectionRate(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getExpenseToRevenueRatio() Tests ====================

    @Test
    void getExpenseToRevenueRatio_whenValidData_shouldCalculateRatio() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(new BigDecimal("1000000"));
        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.EXPENSE, start, end))
                .thenReturn(new BigDecimal("300000"));

        // When
        BigDecimal result = accountingService.getExpenseToRevenueRatio(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        // 300000 / 1000000 * 100 = 30%
        assertThat(result).isEqualByComparingTo(new BigDecimal("30.00"));
    }

    @Test
    void getExpenseToRevenueRatio_whenNoRevenue_shouldReturnZero() {
        // Given
        Integer branchId = 10;
        LocalDate startDate = LocalDate.of(2025, 1, 1);
        LocalDate endDate = LocalDate.of(2025, 1, 31);
        Instant start = startDate.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = endDate.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(branchId, InvoiceType.INCOME, start, end))
                .thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal result = accountingService.getExpenseToRevenueRatio(branchId, startDate, endDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getDashboard() Tests ====================

    @Test
    void getDashboard_whenValidRequest_shouldReturnDashboard() {
        // Given
        Integer branchId = 10;
        String period = "THIS_MONTH";

        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(anyInt(), any(), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.findUnpaidInvoices(anyInt())).thenReturn(Collections.emptyList());
        when(invoiceRepository.findOverdueInvoices(anyInt())).thenReturn(Collections.emptyList());
        when(invoiceRepository.findInvoicesDueInRange(any(), any(), anyInt())).thenReturn(Collections.emptyList());
        when(invoiceRepository.findInvoicesWithFilters(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        // When
        AccountingDashboardResponse result = accountingService.getDashboard(branchId, period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalRevenue()).isNotNull();
        assertThat(result.getTotalExpense()).isNotNull();
        assertThat(result.getNetProfit()).isNotNull();
        assertThat(result.getArBalance()).isNotNull();
        assertThat(result.getApBalance()).isNotNull();
    }

    // ==================== getRevenueReport() Tests ====================

    @Test
    void getRevenueReport_whenValidRequest_shouldReturnReport() {
        // Given
        RevenueReportRequest request = new RevenueReportRequest();
        request.setBranchId(10);
        request.setPeriod("THIS_MONTH");

        Invoices invoice1 = createTestInvoice(100, PaymentStatus.PAID);
        invoice1.setAmount(new BigDecimal("500000"));
        Invoices invoice2 = createTestInvoice(101, PaymentStatus.UNPAID);
        invoice2.setAmount(new BigDecimal("300000"));
        List<Invoices> invoices = List.of(invoice1, invoice2);

        when(invoiceRepository.findInvoicesWithFilters(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(invoices);
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100))
                .thenReturn(new BigDecimal("500000"));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(101))
                .thenReturn(BigDecimal.ZERO);
        when(invoiceService.calculateBalance(anyInt())).thenReturn(BigDecimal.ZERO);
        // Mock for comparison data (previous period)
        when(invoiceRepository.sumAmountByBranchAndTypeAndDateRange(any(), any(), any(), any()))
                .thenReturn(BigDecimal.ZERO);

        // When
        RevenueReportResponse result = accountingService.getRevenueReport(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalRevenue()).isEqualTo(new BigDecimal("800000"));
        assertThat(result.getTotalInvoices()).isEqualTo(2);
    }

    // ==================== getExpenseReport() Tests ====================

    @Test
    void getExpenseReport_whenValidRequest_shouldReturnReport() {
        // Given
        ExpenseReportRequest request = new ExpenseReportRequest();
        request.setBranchId(10);
        request.setStartDate(LocalDate.of(2025, 1, 1));
        request.setEndDate(LocalDate.of(2025, 1, 31));

        Invoices expense1 = createTestInvoice(100, PaymentStatus.PAID);
        expense1.setType(InvoiceType.EXPENSE);
        expense1.setAmount(new BigDecimal("200000"));
        expense1.setCostType("FUEL");

        List<Invoices> expenses = List.of(expense1);
        List<ExpenseRequests> expenseRequests = Collections.emptyList();

        when(invoiceRepository.findInvoicesWithFilters(any(), eq(InvoiceType.EXPENSE), any(), any(), any(), any(), any()))
                .thenReturn(expenses);
        when(expenseRequestRepository.findByStatusAndBranch_Id(any(), anyInt()))
                .thenReturn(expenseRequests);

        // When
        ExpenseReportResponse result = accountingService.getExpenseReport(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalExpense()).isEqualTo(new BigDecimal("200000"));
        assertThat(result.getTotalExpenseRequests()).isEqualTo(1);
    }

    // ==================== Helper Methods ====================

    private Invoices createTestInvoice(Integer invoiceId, PaymentStatus paymentStatus) {
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber("INV-" + invoiceId);
        invoice.setType(InvoiceType.INCOME);
        invoice.setPaymentStatus(paymentStatus);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setInvoiceDate(Instant.now());

        Branches branch = new Branches();
        branch.setId(10);
        branch.setBranchName("Chi nhánh Hà Nội");
        invoice.setBranch(branch);

        Customers customer = new Customers();
        customer.setId(1);
        customer.setFullName("Nguyễn Văn A");
        invoice.setCustomer(customer);

        return invoice;
    }
}

