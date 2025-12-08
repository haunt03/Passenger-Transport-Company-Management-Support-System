package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.RecordPaymentRequest;
import org.example.ptcmssbackend.dto.request.Invoice.SendInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.VoidInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.Invoice.PaymentHistoryResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.InvoiceServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private BranchesRepository branchesRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private org.example.ptcmssbackend.service.EmailService emailService;
    @Mock
    private org.example.ptcmssbackend.repository.NotificationRepository notificationRepository;
    @Mock
    private org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;

    @InjectMocks
    private InvoiceServiceImpl invoiceService;

    // ==================== createInvoice() Tests ====================

    @Test
    void createInvoice_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(1);
        request.setType("INCOME");
        request.setAmount(new BigDecimal("1000000"));
        request.setSubtotal(new BigDecimal("1000000"));
        request.setIsDeposit(false);

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");

        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(customerRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(bookingRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(employeeRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(invoiceRepository.save(any())).thenAnswer(inv -> {
            Invoices invEntity = inv.getArgument(0);
            invEntity.setId(100);
            invEntity.setInvoiceNumber("INV-2025-001");
            invEntity.setBranch(branch);
            invEntity.setType(InvoiceType.INCOME);
            invEntity.setAmount(new BigDecimal("1000000"));
            invEntity.setStatus(InvoiceStatus.ACTIVE);
            invEntity.setPaymentStatus(PaymentStatus.UNPAID);
            return invEntity;
        });
        when(invoiceRepository.findById(100)).thenAnswer(inv -> {
            Invoices invEntity = new Invoices();
            invEntity.setId(100);
            invEntity.setInvoiceNumber("INV-2025-001");
            invEntity.setBranch(branch);
            invEntity.setType(InvoiceType.INCOME);
            invEntity.setAmount(new BigDecimal("1000000"));
            invEntity.setStatus(InvoiceStatus.ACTIVE);
            invEntity.setPaymentStatus(PaymentStatus.UNPAID);
            return Optional.of(invEntity);
        });
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(BigDecimal.ZERO);

        // When
        InvoiceResponse response = invoiceService.createInvoice(request);

        // Then
        assertThat(response).isNotNull();
        verify(invoiceRepository).save(any());
    }

    @Test
    void createInvoice_whenBranchNotFound_shouldThrowException() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(999);
        request.setType("INCOME");
        request.setAmount(new BigDecimal("1000000"));

        when(branchesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.createInvoice(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Branch not found");
    }

    @Test
    void createInvoice_whenInvalidType_shouldThrowException() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(1);
        request.setType("INVALID_TYPE");
        request.setAmount(new BigDecimal("1000000"));

        Branches branch = new Branches();
        branch.setId(1);

        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));

        // When & Then
        assertThatThrownBy(() -> invoiceService.createInvoice(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Loại hóa đơn không hợp lệ");
    }

    @Test
    void createInvoice_whenWithBooking_shouldLinkBooking() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(1);
        request.setBookingId(10);
        request.setType("INCOME");
        request.setAmount(new BigDecimal("1000000"));
        request.setSubtotal(new BigDecimal("1000000"));

        Branches branch = new Branches();
        branch.setId(1);

        Bookings booking = new Bookings();
        booking.setId(10);

        when(branchesRepository.findById(1)).thenReturn(Optional.of(branch));
        when(bookingRepository.findById(10)).thenReturn(Optional.of(booking));
        when(invoiceRepository.save(any())).thenAnswer(inv -> {
            Invoices invEntity = inv.getArgument(0);
            invEntity.setId(100);
            invEntity.setInvoiceNumber("INV-2025-001");
            invEntity.setBranch(branch);
            invEntity.setType(InvoiceType.INCOME);
            invEntity.setAmount(new BigDecimal("1000000"));
            invEntity.setStatus(InvoiceStatus.ACTIVE);
            invEntity.setPaymentStatus(PaymentStatus.UNPAID);
            return invEntity;
        });
        when(invoiceRepository.findById(100)).thenAnswer(inv -> {
            Invoices invEntity = new Invoices();
            invEntity.setId(100);
            invEntity.setInvoiceNumber("INV-2025-001");
            invEntity.setBranch(branch);
            invEntity.setType(InvoiceType.INCOME);
            invEntity.setAmount(new BigDecimal("1000000"));
            invEntity.setStatus(InvoiceStatus.ACTIVE);
            invEntity.setPaymentStatus(PaymentStatus.UNPAID);
            return Optional.of(invEntity);
        });
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(BigDecimal.ZERO);

        // When
        InvoiceResponse response = invoiceService.createInvoice(request);

        // Then
        assertThat(response).isNotNull();
        verify(bookingRepository).findById(10);
    }

    // ==================== recordPayment() Tests ====================

    @Test
    void recordPayment_whenValidRequest_shouldRecordSuccessfully() {
        // Given
        Integer invoiceId = 100;
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setPaymentMethod("CASH");
        request.setNote("Test payment");

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        Branches branch = new Branches();
        branch.setId(1);
        invoice.setBranch(branch);

        PaymentHistory payment = new PaymentHistory();
        payment.setId(200);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("500000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(employeeRepository.findByRoleNameAndBranchId(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(200);
            return ph;
        });
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        PaymentHistoryResponse response = invoiceService.recordPayment(invoiceId, request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualTo(new BigDecimal("500000"));
        verify(paymentHistoryRepository).save(any());
    }

    @Test
    void recordPayment_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setAmount(new BigDecimal("500000"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.recordPayment(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== confirmPayment() Tests ====================

    @Test
    void confirmPayment_whenValidRequest_shouldConfirmSuccessfully() {
        // Given
        Integer paymentId = 200;
        String status = "CONFIRMED";

        Invoices invoice = new Invoices();
        invoice.setId(100);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setBooking(null); // Không có booking để đơn giản hóa test

        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("500000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(100)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(new BigDecimal("500000"));

        // When
        PaymentHistoryResponse response = invoiceService.confirmPayment(paymentId, status);

        // Then
        assertThat(response).isNotNull();
        assertThat(payment.getConfirmationStatus()).isEqualTo(PaymentConfirmationStatus.CONFIRMED);
        verify(paymentHistoryRepository).save(payment);
    }

    @Test
    void confirmPayment_whenPaymentNotFound_shouldThrowException() {
        // Given
        Integer paymentId = 999;
        String status = "CONFIRMED";

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.confirmPayment(paymentId, status))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy thanh toán");
    }

    @Test
    void confirmPayment_whenRejectPayment_shouldUpdateStatus() {
        // Given
        Integer paymentId = 200;
        String status = "REJECTED";

        Invoices invoice = new Invoices();
        invoice.setId(100);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("500000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(100)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(BigDecimal.ZERO);

        // When
        PaymentHistoryResponse response = invoiceService.confirmPayment(paymentId, status);

        // Then
        assertThat(response).isNotNull();
        assertThat(payment.getConfirmationStatus()).isEqualTo(PaymentConfirmationStatus.REJECTED);
        verify(paymentHistoryRepository).save(payment);
    }

    @Test
    void confirmPayment_whenInvalidStatus_shouldThrowException() {
        // Given
        Integer paymentId = 200;
        String status = "INVALID_STATUS";

        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        // When & Then
        assertThatThrownBy(() -> invoiceService.confirmPayment(paymentId, status))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Trạng thái xác nhận không hợp lệ");
    }

    @Test
    void confirmPayment_whenPaymentFullyPaid_shouldMarkInvoiceAsPaid() {
        // Given
        Integer paymentId = 200;
        String status = "CONFIRMED";

        Invoices invoice = new Invoices();
        invoice.setId(100);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("1000000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(100)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(new BigDecimal("1000000"));

        // When
        invoiceService.confirmPayment(paymentId, status);

        // Then
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        verify(invoiceRepository).save(invoice);
    }

    // ==================== getInvoiceById() Tests ====================

    @Test
    void getInvoiceById_whenValidId_shouldReturnInvoice() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber("INV-2025-001");
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        invoice.setBranch(branch);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setType(InvoiceType.INCOME);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentHistoryRepository.countPendingPaymentsByInvoiceId(invoiceId)).thenReturn(0);

        // When
        InvoiceResponse response = invoiceService.getInvoiceById(invoiceId);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getInvoiceId()).isEqualTo(invoiceId);
        assertThat(response.getInvoiceNumber()).isEqualTo("INV-2025-001");
    }

    @Test
    void getInvoiceById_whenNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.getInvoiceById(invoiceId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== getInvoices() Tests ====================

    @Test
    void getInvoices_whenNoFilters_shouldReturnAllInvoices() {
        // Given
        Invoices invoice1 = createTestInvoice(100, "INV-001", PaymentStatus.UNPAID);
        Invoices invoice2 = createTestInvoice(101, "INV-002", PaymentStatus.PAID);
        List<Invoices> invoices = List.of(invoice1, invoice2);

        when(invoiceRepository.findInvoicesWithFilters(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(invoices);
        when(invoiceRepository.findById(anyInt())).thenAnswer(inv -> {
            Integer id = inv.getArgument(0);
            return invoices.stream().filter(inv -> inv.getId().equals(id)).findFirst();
        });
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(paymentHistoryRepository.countPendingPaymentsByInvoiceId(anyInt())).thenReturn(0);

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // When
        org.springframework.data.domain.Page<org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse> result =
                invoiceService.getInvoices(null, null, null, null, null, null, null, null, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    void getInvoices_whenWithFilters_shouldFilterCorrectly() {
        // Given
        Invoices invoice = createTestInvoice(100, "INV-001", PaymentStatus.UNPAID);
        List<Invoices> invoices = List.of(invoice);

        when(invoiceRepository.findInvoicesWithFilters(eq(1), eq(InvoiceType.INCOME), 
                eq(InvoiceStatus.ACTIVE), any(), any(), any(), eq(PaymentStatus.UNPAID)))
                .thenReturn(invoices);
        when(invoiceRepository.findById(anyInt())).thenAnswer(inv -> {
            Integer id = inv.getArgument(0);
            return invoices.stream().filter(inv -> inv.getId().equals(id)).findFirst();
        });
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(paymentHistoryRepository.countPendingPaymentsByInvoiceId(anyInt())).thenReturn(0);

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // When
        org.springframework.data.domain.Page<org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse> result =
                invoiceService.getInvoices(1, "INCOME", "ACTIVE", "UNPAID", null, null, null, null, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void getInvoices_whenWithKeyword_shouldFilterByKeyword() {
        // Given
        Invoices invoice = createTestInvoice(100, "INV-001", PaymentStatus.UNPAID);
        Customers customer = new Customers();
        customer.setFullName("Nguyễn Văn A");
        invoice.setCustomer(customer);
        List<Invoices> invoices = List.of(invoice);

        when(invoiceRepository.findInvoicesWithFilters(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(invoices);
        when(invoiceRepository.findById(anyInt())).thenAnswer(inv -> {
            Integer id = inv.getArgument(0);
            return invoices.stream().filter(inv -> inv.getId().equals(id)).findFirst();
        });
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(anyInt())).thenReturn(BigDecimal.ZERO);
        when(paymentHistoryRepository.countPendingPaymentsByInvoiceId(anyInt())).thenReturn(0);

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);

        // When
        org.springframework.data.domain.Page<org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse> result =
                invoiceService.getInvoices(null, null, null, null, null, null, null, "Nguyễn", pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ==================== updateInvoice() Tests ====================

    @Test
    void updateInvoice_whenValidRequest_shouldUpdateSuccessfully() {
        // Given
        Integer invoiceId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("2000000"));
        request.setNote("Updated note");

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        Branches branch = new Branches();
        branch.setId(1);
        invoice.setBranch(branch);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);
        when(paymentHistoryRepository.countPendingPaymentsByInvoiceId(invoiceId)).thenReturn(0);

        // When
        InvoiceResponse response = invoiceService.updateInvoice(invoiceId, request);

        // Then
        assertThat(response).isNotNull();
        assertThat(invoice.getAmount()).isEqualTo(new BigDecimal("2000000"));
        assertThat(invoice.getNote()).isEqualTo("Updated note");
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void updateInvoice_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        CreateInvoiceRequest request = new CreateInvoiceRequest();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.updateInvoice(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    @Test
    void updateInvoice_whenInvoiceAlreadyPaid_shouldThrowException() {
        // Given
        Integer invoiceId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setPaymentStatus(PaymentStatus.PAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When & Then
        assertThatThrownBy(() -> invoiceService.updateInvoice(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Cannot update paid invoice");
    }

    // ==================== voidInvoice() Tests ====================

    @Test
    void voidInvoice_whenValidRequest_shouldVoidSuccessfully() {
        // Given
        Integer invoiceId = 100;
        VoidInvoiceRequest request = new VoidInvoiceRequest();
        request.setCancellationReason("Customer cancelled");
        request.setCancelledBy(1);

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setInvoiceNumber("INV-001");

        Employees employee = new Employees();
        employee.setEmployeeId(1);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(employeeRepository.findById(1)).thenReturn(Optional.of(employee));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        invoiceService.voidInvoice(invoiceId, request);

        // Then
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(invoice.getCancellationReason()).isEqualTo("Customer cancelled");
        assertThat(invoice.getCancelledAt()).isNotNull();
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void voidInvoice_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        VoidInvoiceRequest request = new VoidInvoiceRequest();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.voidInvoice(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    @Test
    void voidInvoice_whenAlreadyCancelled_shouldThrowException() {
        // Given
        Integer invoiceId = 100;
        VoidInvoiceRequest request = new VoidInvoiceRequest();

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setStatus(InvoiceStatus.CANCELLED);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When & Then
        assertThatThrownBy(() -> invoiceService.voidInvoice(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice already cancelled");
    }

    // ==================== recordPayment() Additional Tests ====================

    @Test
    void recordPayment_whenPaymentExceedsBalance_shouldThrowException() {
        // Given
        Integer invoiceId = 100;
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setAmount(new BigDecimal("2000000")); // Exceeds invoice amount

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        Branches branch = new Branches();
        branch.setId(1);
        invoice.setBranch(branch);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);

        // When & Then
        assertThatThrownBy(() -> invoiceService.recordPayment(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("exceeds balance");
    }

    @Test
    void recordPayment_whenInvoiceCancelled_shouldThrowException() {
        // Given
        Integer invoiceId = 100;
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setAmount(new BigDecimal("500000"));

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setStatus(InvoiceStatus.CANCELLED);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When & Then
        assertThatThrownBy(() -> invoiceService.recordPayment(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Cannot record payment for cancelled invoice");
    }

    @Test
    void recordPayment_whenPaymentMakesInvoiceFullyPaid_shouldUpdateStatus() {
        // Given
        Integer invoiceId = 100;
        RecordPaymentRequest request = new RecordPaymentRequest();
        request.setAmount(new BigDecimal("1000000"));
        request.setPaymentMethod("CASH");
        request.setConfirmationStatus("CONFIRMED"); // Auto-confirmed

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        Branches branch = new Branches();
        branch.setId(1);
        invoice.setBranch(branch);

        PaymentHistory payment = new PaymentHistory();
        payment.setId(200);
        payment.setInvoice(invoice);
        payment.setAmount(new BigDecimal("1000000"));
        payment.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId))
                .thenReturn(BigDecimal.ZERO) // Before payment
                .thenReturn(new BigDecimal("1000000")); // After payment
        when(employeeRepository.findByRoleNameAndBranchId(anyString(), anyInt())).thenReturn(Collections.emptyList());
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(200);
            ph.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);
            return ph;
        });
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        PaymentHistoryResponse response = invoiceService.recordPayment(invoiceId, request);

        // Then
        assertThat(response).isNotNull();
        // Note: The status update happens in calculateBalance, which is called after save
        verify(invoiceRepository).save(any());
    }

    // ==================== getPaymentHistory() Tests ====================

    @Test
    void getPaymentHistory_whenValidInvoiceId_shouldReturnPayments() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);

        PaymentHistory payment1 = new PaymentHistory();
        payment1.setId(200);
        payment1.setInvoice(invoice);
        payment1.setAmount(new BigDecimal("500000"));
        payment1.setPaymentMethod("CASH");

        PaymentHistory payment2 = new PaymentHistory();
        payment2.setId(201);
        payment2.setInvoice(invoice);
        payment2.setAmount(new BigDecimal("300000"));
        payment2.setPaymentMethod("BANK_TRANSFER");

        when(paymentHistoryRepository.findAllByInvoiceId(invoiceId))
                .thenReturn(List.of(payment1, payment2));

        // When
        List<PaymentHistoryResponse> result = invoiceService.getPaymentHistory(invoiceId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
    }

    @Test
    void getPaymentHistory_whenNoPayments_shouldReturnEmptyList() {
        // Given
        Integer invoiceId = 100;

        when(paymentHistoryRepository.findAllByInvoiceId(invoiceId))
                .thenReturn(Collections.emptyList());

        // When
        List<PaymentHistoryResponse> result = invoiceService.getPaymentHistory(invoiceId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== calculateBalance() Tests ====================

    @Test
    void calculateBalance_whenNoPayments_shouldReturnFullAmount() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal balance = invoiceService.calculateBalance(invoiceId);

        // Then
        assertThat(balance).isEqualTo(new BigDecimal("1000000"));
    }

    @Test
    void calculateBalance_whenPartialPayment_shouldReturnRemainingBalance() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setAmount(new BigDecimal("1000000"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(invoiceId)).thenReturn(new BigDecimal("300000"));

        // When
        BigDecimal balance = invoiceService.calculateBalance(invoiceId);

        // Then
        assertThat(balance).isEqualTo(new BigDecimal("700000"));
    }

    @Test
    void calculateBalance_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.calculateBalance(invoiceId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== markAsPaid() Tests ====================

    @Test
    void markAsPaid_whenValidInvoice_shouldUpdateStatus() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        invoiceService.markAsPaid(invoiceId);

        // Then
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void markAsPaid_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.markAsPaid(invoiceId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== markAsOverdue() Tests ====================

    @Test
    void markAsOverdue_whenValidInvoice_shouldUpdateStatus() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        invoiceService.markAsOverdue(invoiceId);

        // Then
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.OVERDUE);
        verify(invoiceRepository).save(invoice);
    }

    // ==================== isOverdue() Tests ====================

    @Test
    void isOverdue_whenDueDatePassed_shouldReturnTrue() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setDueDate(LocalDate.now().minusDays(1));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When
        boolean result = invoiceService.isOverdue(invoiceId);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void isOverdue_whenDueDateNotPassed_shouldReturnFalse() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setDueDate(LocalDate.now().plusDays(1));
        invoice.setPaymentStatus(PaymentStatus.UNPAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When
        boolean result = invoiceService.isOverdue(invoiceId);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    void isOverdue_whenAlreadyPaid_shouldReturnFalse() {
        // Given
        Integer invoiceId = 100;
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setDueDate(LocalDate.now().minusDays(1));
        invoice.setPaymentStatus(PaymentStatus.PAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        // When
        boolean result = invoiceService.isOverdue(invoiceId);

        // Then
        assertThat(result).isFalse();
    }

    // ==================== sendInvoice() Tests ====================

    @Test
    void sendInvoice_whenValidRequest_shouldSendEmail() throws Exception {
        // Given
        Integer invoiceId = 100;
        SendInvoiceRequest request = new SendInvoiceRequest();
        request.setEmail("customer@example.com");
        request.setMessage("Please find attached invoice");

        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber("INV-001");
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setDueDate(LocalDate.now().plusDays(7));
        Customers customer = new Customers();
        customer.setFullName("Nguyễn Văn A");
        invoice.setCustomer(customer);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(emailService).sendInvoiceEmail(anyString(), anyString(), anyString(), 
                anyString(), anyString(), anyString(), anyString());

        // When
        invoiceService.sendInvoice(invoiceId, request);

        // Then
        assertThat(invoice.getSentAt()).isNotNull();
        assertThat(invoice.getSentToEmail()).isEqualTo("customer@example.com");
        verify(emailService).sendInvoiceEmail(anyString(), anyString(), anyString(), 
                anyString(), anyString(), anyString(), anyString());
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void sendInvoice_whenInvoiceNotFound_shouldThrowException() {
        // Given
        Integer invoiceId = 999;
        SendInvoiceRequest request = new SendInvoiceRequest();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.sendInvoice(invoiceId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    // ==================== deletePayment() Tests ====================

    @Test
    void deletePayment_whenPendingPayment_shouldDeleteSuccessfully() {
        // Given
        Integer paymentId = 200;
        Invoices invoice = new Invoices();
        invoice.setId(100);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(PaymentStatus.PAID);

        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setInvoice(invoice);
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(invoiceRepository.findById(100)).thenReturn(Optional.of(invoice));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(100)).thenReturn(BigDecimal.ZERO);
        doNothing().when(paymentHistoryRepository).delete(payment);
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        invoiceService.deletePayment(paymentId);

        // Then
        verify(paymentHistoryRepository).delete(payment);
    }

    @Test
    void deletePayment_whenPaymentNotFound_shouldThrowException() {
        // Given
        Integer paymentId = 999;

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> invoiceService.deletePayment(paymentId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy thanh toán");
    }

    @Test
    void deletePayment_whenPaymentConfirmed_shouldThrowException() {
        // Given
        Integer paymentId = 200;
        PaymentHistory payment = new PaymentHistory();
        payment.setId(paymentId);
        payment.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);

        when(paymentHistoryRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        // When & Then
        assertThatThrownBy(() -> invoiceService.deletePayment(paymentId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Chỉ được xóa payment request có trạng thái PENDING");
    }

    // ==================== getPendingPayments() Tests ====================

    @Test
    void getPendingPayments_whenValidBranchId_shouldReturnPendingPayments() {
        // Given
        Integer branchId = 1;
        Invoices invoice = new Invoices();
        invoice.setId(100);
        invoice.setInvoiceNumber("INV-001");

        PaymentHistory payment = new PaymentHistory();
        payment.setId(200);
        payment.setInvoice(invoice);
        payment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(paymentHistoryRepository.findPendingPayments(branchId))
                .thenReturn(List.of(payment));

        // When
        List<PaymentHistoryResponse> result = invoiceService.getPendingPayments(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
    }

    // ==================== countPendingPayments() Tests ====================

    @Test
    void countPendingPayments_whenValidBranchId_shouldReturnCount() {
        // Given
        Integer branchId = 1;

        when(paymentHistoryRepository.countPendingPayments(branchId)).thenReturn(5L);

        // When
        Long count = invoiceService.countPendingPayments(branchId);

        // Then
        assertThat(count).isEqualTo(5L);
    }

    // ==================== Helper Methods ====================

    private Invoices createTestInvoice(Integer id, String invoiceNumber, PaymentStatus paymentStatus) {
        Invoices invoice = new Invoices();
        invoice.setId(id);
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setPaymentStatus(paymentStatus);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        invoice.setBranch(branch);
        invoice.setType(InvoiceType.INCOME);
        return invoice;
    }
}

