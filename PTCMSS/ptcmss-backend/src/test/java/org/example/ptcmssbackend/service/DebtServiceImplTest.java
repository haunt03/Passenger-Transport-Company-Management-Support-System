package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Debt.SendDebtReminderRequest;
import org.example.ptcmssbackend.dto.request.Debt.UpdateDebtInfoRequest;
import org.example.ptcmssbackend.dto.response.Debt.AgingBucketResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtReminderHistoryResponse;
import org.example.ptcmssbackend.dto.response.Debt.DebtSummaryResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.DebtReminderHistoryRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.impl.DebtServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private DebtReminderHistoryRepository debtReminderHistoryRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private InvoiceService invoiceService;
    @Mock
    private org.example.ptcmssbackend.service.EmailService emailService;

    @InjectMocks
    private DebtServiceImpl debtService;

    // ==================== getDebts() Tests ====================

    @Test
    void getDebts_whenNoFilters_shouldReturnAllUnpaidInvoices() {
        // Given
        Invoices invoice1 = createTestInvoice(100, PaymentStatus.UNPAID);
        Invoices invoice2 = createTestInvoice(101, PaymentStatus.OVERDUE);
        List<Invoices> invoices = new ArrayList<>(List.of(invoice1, invoice2));

        Pageable pageable = PageRequest.of(0, 10);

        when(invoiceRepository.findUnpaidInvoices(null)).thenReturn(invoices);
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(invoiceService.calculateBalance(anyInt())).thenReturn(new BigDecimal("1000000"));
        when(debtReminderHistoryRepository.findLatestByInvoiceId(anyInt())).thenReturn(Optional.empty());

        // When
        Page<DebtSummaryResponse> result = debtService.getDebts(null, false, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(2);
        verify(invoiceRepository).findUnpaidInvoices(null);
    }

    @Test
    void getDebts_whenOverdueOnly_shouldReturnOnlyOverdue() {
        // Given
        Invoices overdueInvoice = createTestInvoice(100, PaymentStatus.OVERDUE);
        List<Invoices> invoices = new ArrayList<>(List.of(overdueInvoice));

        Pageable pageable = PageRequest.of(0, 10);

        when(invoiceRepository.findOverdueInvoices(null)).thenReturn(invoices);
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(invoiceService.calculateBalance(anyInt())).thenReturn(new BigDecimal("1000000"));
        when(debtReminderHistoryRepository.findLatestByInvoiceId(anyInt())).thenReturn(Optional.empty());

        // When
        Page<DebtSummaryResponse> result = debtService.getDebts(null, true, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(invoiceRepository).findOverdueInvoices(null);
    }

    @Test
    void getDebts_whenWithBranchId_shouldFilterByBranch() {
        // Given
        Integer branchId = 10;
        Invoices invoice = createTestInvoice(100, PaymentStatus.UNPAID);
        invoice.getBranch().setId(branchId);
        List<Invoices> invoices = List.of(invoice);

        Pageable pageable = PageRequest.of(0, 10);

        when(invoiceRepository.findUnpaidInvoices(branchId)).thenReturn(invoices);
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(invoiceService.calculateBalance(anyInt())).thenReturn(new BigDecimal("1000000"));
        when(debtReminderHistoryRepository.findLatestByInvoiceId(anyInt())).thenReturn(Optional.empty());

        // When
        Page<DebtSummaryResponse> result = debtService.getDebts(branchId, false, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(invoiceRepository).findUnpaidInvoices(branchId);
    }

    @Test
    void getDebts_whenEmpty_shouldReturnEmptyPage() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);

        when(invoiceRepository.findUnpaidInvoices(null)).thenReturn(Collections.emptyList());

        // When
        Page<DebtSummaryResponse> result = debtService.getDebts(null, false, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(0);
        assertThat(result.getContent()).isEmpty();
    }

    // ==================== getAgingBuckets() Tests ====================

    @Test
    void getAgingBuckets_whenValidInvoices_shouldCalculateBuckets() {
        // Given
        LocalDate asOfDate = LocalDate.now();
        Invoices invoice0_30 = createTestInvoice(100, PaymentStatus.UNPAID);
        invoice0_30.setDueDate(asOfDate.minusDays(15)); // 15 days overdue

        Invoices invoice31_60 = createTestInvoice(101, PaymentStatus.UNPAID);
        invoice31_60.setDueDate(asOfDate.minusDays(45)); // 45 days overdue

        Invoices invoice61_90 = createTestInvoice(102, PaymentStatus.UNPAID);
        invoice61_90.setDueDate(asOfDate.minusDays(75)); // 75 days overdue

        Invoices invoiceOver90 = createTestInvoice(103, PaymentStatus.UNPAID);
        invoiceOver90.setDueDate(asOfDate.minusDays(120)); // 120 days overdue

        List<Invoices> invoices = List.of(invoice0_30, invoice31_60, invoice61_90, invoiceOver90);

        when(invoiceRepository.findUnpaidInvoices(null)).thenReturn(invoices);
        when(invoiceService.calculateBalance(100)).thenReturn(new BigDecimal("100000"));
        when(invoiceService.calculateBalance(101)).thenReturn(new BigDecimal("200000"));
        when(invoiceService.calculateBalance(102)).thenReturn(new BigDecimal("300000"));
        when(invoiceService.calculateBalance(103)).thenReturn(new BigDecimal("400000"));

        // When
        AgingBucketResponse result = debtService.getAgingBuckets(null, asOfDate);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBucket0_30()).isEqualTo(new BigDecimal("100000"));
        assertThat(result.getBucket31_60()).isEqualTo(new BigDecimal("200000"));
        assertThat(result.getBucket61_90()).isEqualTo(new BigDecimal("300000"));
        assertThat(result.getBucketOver90()).isEqualTo(new BigDecimal("400000"));
        assertThat(result.getTotal()).isEqualTo(new BigDecimal("1000000"));
    }

    @Test
    void getAgingBuckets_whenNoInvoices_shouldReturnZeroBuckets() {
        // Given
        when(invoiceRepository.findUnpaidInvoices(null)).thenReturn(Collections.emptyList());

        // When
        AgingBucketResponse result = debtService.getAgingBuckets(null, LocalDate.now());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBucket0_30()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getBucket31_60()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getBucket61_90()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getBucketOver90()).isEqualTo(BigDecimal.ZERO);
        assertThat(result.getTotal()).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getAgingBuckets_whenAsOfDateNull_shouldUseToday() {
        // Given
        Invoices invoice = createTestInvoice(100, PaymentStatus.UNPAID);
        invoice.setDueDate(LocalDate.now().minusDays(15));
        List<Invoices> invoices = List.of(invoice);

        when(invoiceRepository.findUnpaidInvoices(null)).thenReturn(invoices);
        when(invoiceService.calculateBalance(100)).thenReturn(new BigDecimal("100000"));

        // When
        AgingBucketResponse result = debtService.getAgingBuckets(null, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBucket0_30()).isEqualTo(new BigDecimal("100000"));
    }

    // ==================== sendDebtReminder() Tests ====================

    @Test
    void sendDebtReminder_whenValidRequest_shouldSendEmail() throws Exception {
        // Given
        Integer invoiceId = 100;
        SendDebtReminderRequest request = new SendDebtReminderRequest();
        request.setReminderType("EMAIL");
        request.setRecipient("customer@example.com");
        request.setMessage("Vui lòng thanh toán");

        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.OVERDUE);
        Customers customer = new Customers();
        customer.setEmail("customer@example.com");
        customer.setFullName("Nguyễn Văn A");
        invoice.setCustomer(customer);

        DebtReminderHistory reminder = new DebtReminderHistory();
        reminder.setId(200);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(debtReminderHistoryRepository.save(any())).thenAnswer(inv -> {
            DebtReminderHistory r = inv.getArgument(0);
            r.setId(200);
            return r;
        });
        doNothing().when(emailService).sendDebtReminderEmail(anyString(), anyString(), anyString(), 
                anyString(), anyString(), anyInt(), anyString());

        // When
        debtService.sendDebtReminder(invoiceId, request);

        // Then
        verify(debtReminderHistoryRepository).save(any());
        verify(emailService).sendDebtReminderEmail(anyString(), anyString(), anyString(), 
                anyString(), anyString(), anyInt(), anyString());
    }

    @Test
    void sendDebtReminder_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        SendDebtReminderRequest request = new SendDebtReminderRequest();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> debtService.sendDebtReminder(invoiceId, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Invoice not found");
    }

    @Test
    void sendDebtReminder_whenSMS_shouldSendSMS() throws Exception {
        // Given
        Integer invoiceId = 100;
        SendDebtReminderRequest request = new SendDebtReminderRequest();
        request.setReminderType("SMS");
        request.setRecipient("0912345678");

        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.OVERDUE);
        Customers customer = new Customers();
        customer.setPhone("0912345678");
        invoice.setCustomer(customer);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(debtReminderHistoryRepository.save(any())).thenAnswer(inv -> {
            DebtReminderHistory r = inv.getArgument(0);
            r.setId(200);
            return r;
        });
        doNothing().when(emailService).sendDebtReminderSMS(anyString(), anyString(), anyString());

        // When
        debtService.sendDebtReminder(invoiceId, request);

        // Then
        verify(debtReminderHistoryRepository).save(any());
        verify(emailService).sendDebtReminderSMS(anyString(), anyString(), anyString());
    }

    // ==================== getReminderHistory() Tests ====================

    @Test
    void getReminderHistory_whenRemindersExist_shouldReturnHistory() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.UNPAID);
        
        DebtReminderHistory reminder1 = new DebtReminderHistory();
        reminder1.setId(200);
        reminder1.setInvoice(invoice);
        reminder1.setReminderType("EMAIL");
        reminder1.setReminderDate(Instant.now());

        DebtReminderHistory reminder2 = new DebtReminderHistory();
        reminder2.setId(201);
        reminder2.setInvoice(invoice);
        reminder2.setReminderType("SMS");
        reminder2.setReminderDate(Instant.now());

        when(debtReminderHistoryRepository.findAllByInvoiceId(invoiceId))
                .thenReturn(List.of(reminder1, reminder2));

        // When
        List<DebtReminderHistoryResponse> result = debtService.getReminderHistory(invoiceId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(debtReminderHistoryRepository).findAllByInvoiceId(invoiceId);
    }

    @Test
    void getReminderHistory_whenNoReminders_shouldReturnEmptyList() {
        // Given
        Integer invoiceId = 100;

        when(debtReminderHistoryRepository.findAllByInvoiceId(invoiceId))
                .thenReturn(Collections.emptyList());

        // When
        List<DebtReminderHistoryResponse> result = debtService.getReminderHistory(invoiceId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== updateDebtInfo() Tests ====================

    @Test
    void updateDebtInfo_whenValidRequest_shouldUpdateSuccessfully() {
        // Given
        Integer invoiceId = 100;
        UpdateDebtInfoRequest request = new UpdateDebtInfoRequest();
        request.setPromiseToPayDate(LocalDate.now().plusDays(7));
        request.setDebtLabel("Khách hàng VIP");
        request.setContactNote("Đã liên hệ, hẹn thanh toán");

        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.OVERDUE);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        debtService.updateDebtInfo(invoiceId, request);

        // Then
        assertThat(invoice.getPromiseToPayDate()).isEqualTo(request.getPromiseToPayDate());
        assertThat(invoice.getDebtLabel()).isEqualTo("Khách hàng VIP");
        assertThat(invoice.getContactNote()).isEqualTo("Đã liên hệ, hẹn thanh toán");
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void updateDebtInfo_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        UpdateDebtInfoRequest request = new UpdateDebtInfoRequest();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> debtService.updateDebtInfo(invoiceId, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== setPromiseToPay() Tests ====================

    @Test
    void setPromiseToPay_whenValidRequest_shouldSetDate() {
        // Given
        Integer invoiceId = 100;
        LocalDate promiseDate = LocalDate.now().plusDays(7);
        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.OVERDUE);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        debtService.setPromiseToPay(invoiceId, promiseDate);

        // Then
        assertThat(invoice.getPromiseToPayDate()).isEqualTo(promiseDate);
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void setPromiseToPay_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        LocalDate promiseDate = LocalDate.now().plusDays(7);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> debtService.setPromiseToPay(invoiceId, promiseDate))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== setDebtLabel() Tests ====================

    @Test
    void setDebtLabel_whenValidRequest_shouldSetLabel() {
        // Given
        Integer invoiceId = 100;
        String label = "Khách hàng VIP";
        Invoices invoice = createTestInvoice(invoiceId, PaymentStatus.OVERDUE);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        debtService.setDebtLabel(invoiceId, label);

        // Then
        assertThat(invoice.getDebtLabel()).isEqualTo(label);
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void setDebtLabel_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        String label = "Test";

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> debtService.setDebtLabel(invoiceId, label))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Invoice not found");
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
        invoice.setDueDate(LocalDate.now().minusDays(10));

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


