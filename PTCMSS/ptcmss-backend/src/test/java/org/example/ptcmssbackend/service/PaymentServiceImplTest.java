package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.config.QrPaymentProperties;
import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.NotificationRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private QrPaymentProperties qrPaymentProperties;
    @Mock
    private AppSettingService appSettingService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    // ==================== generateQRCode() Tests ====================

    @Test
    void generateQRCode_whenValidRequest_shouldGenerateQR() {
        // Given
        Integer bookingId = 100;
        BigDecimal amount = new BigDecimal("500000");
        String note = "Test payment";
        Boolean deposit = false;
        Integer employeeId = 1;

        Bookings booking = createTestBooking(bookingId);
        Employees employee = createTestEmployee(employeeId);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(Collections.emptyList());
        when(invoiceRepository.save(any())).thenAnswer(inv -> {
            Invoices invEntity = inv.getArgument(0);
            invEntity.setId(200);
            return invEntity;
        });
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(300);
            ph.setCreatedAt(Instant.now());
            return ph;
        });
        when(appSettingService.getValue(anyString())).thenReturn("PTCMSS");
        when(qrPaymentProperties.getExpiresInMinutes()).thenReturn(15L);
        when(qrPaymentProperties.getProviderUrl()).thenReturn("https://img.vietqr.io/image");
        when(qrPaymentProperties.getTemplate()).thenReturn("compact");
        when(employeeRepository.findByRoleNameAndBranchId(anyString(), anyInt()))
                .thenReturn(Collections.emptyList());
        doNothing().when(webSocketNotificationService).sendGlobalNotification(anyString(), anyString(), anyString());

        // When
        PaymentResponse result = paymentService.generateQRCode(bookingId, amount, note, deposit, employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(bookingId);
        assertThat(result.getAmount()).isEqualTo(amount);
        assertThat(result.getPaymentMethod()).isEqualTo("QR");
        assertThat(result.getQrText()).isNotNull();
        assertThat(result.getQrImageUrl()).isNotNull();
        assertThat(result.getExpiresAt()).isNotNull();
        verify(invoiceRepository).save(any());
        verify(paymentHistoryRepository).save(any());
    }

    @Test
    void generateQRCode_whenAmountZero_shouldThrowException() {
        // Given
        Integer bookingId = 100;
        BigDecimal amount = BigDecimal.ZERO;

        // When & Then
        assertThatThrownBy(() -> paymentService.generateQRCode(bookingId, amount, null, false, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Số tiền phải lớn hơn 0");
    }

    @Test
    void generateQRCode_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        BigDecimal amount = new BigDecimal("500000");

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> paymentService.generateQRCode(bookingId, amount, null, false, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void generateQRCode_whenHasPendingPayment_shouldThrowException() {
        // Given
        Integer bookingId = 100;
        BigDecimal amount = new BigDecimal("500000");
        Bookings booking = createTestBooking(bookingId);
        Invoices invoice = createTestInvoice(200, bookingId);
        PaymentHistory pendingPayment = createTestPaymentHistory(300, invoice);
        pendingPayment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(List.of(pendingPayment));

        // When & Then
        assertThatThrownBy(() -> paymentService.generateQRCode(bookingId, amount, null, false, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đang chờ duyệt");
    }

    // ==================== createDeposit() Tests ====================

    @Test
    void createDeposit_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        Integer bookingId = 100;
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setDeposit(true);
        request.setPaymentMethod("CASH");
        request.setNote("Đặt cọc");

        Bookings booking = createTestBooking(bookingId);
        Employees employee = createTestEmployee(1);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(employeeRepository.findById(1)).thenReturn(Optional.of(employee));
        when(invoiceRepository.save(any())).thenAnswer(inv -> {
            Invoices invEntity = inv.getArgument(0);
            invEntity.setId(200);
            invEntity.setCreatedAt(Instant.now());
            return invEntity;
        });
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(300);
            return ph;
        });
        when(employeeRepository.findByRoleNameAndBranchId(anyString(), anyInt()))
                .thenReturn(Collections.emptyList());
        doNothing().when(webSocketNotificationService).sendGlobalNotification(anyString(), anyString(), anyString());

        // When
        PaymentResponse result = paymentService.createDeposit(bookingId, request, 1);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(bookingId);
        assertThat(result.getAmount()).isEqualTo(new BigDecimal("500000"));
        assertThat(result.isDeposit()).isTrue();
        verify(invoiceRepository).save(any());
        verify(paymentHistoryRepository).save(any());
    }

    @Test
    void createDeposit_whenAmountZero_shouldThrowException() {
        // Given
        Integer bookingId = 100;
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(BigDecimal.ZERO);

        // When & Then
        assertThatThrownBy(() -> paymentService.createDeposit(bookingId, request, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Số tiền phải lớn hơn 0");
    }

    @Test
    void createDeposit_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("500000"));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> paymentService.createDeposit(bookingId, request, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    // ==================== getPaymentHistory() Tests ====================

    @Test
    void getPaymentHistory_whenPaymentsExist_shouldReturnHistory() {
        // Given
        Integer bookingId = 100;
        Invoices invoice = createTestInvoice(200, bookingId);
        PaymentHistory paymentHistory = createTestPaymentHistory(300, invoice);

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(List.of(paymentHistory));

        // When
        List<PaymentResponse> result = paymentService.getPaymentHistory(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
        assertThat(result.get(0).getPaymentId()).isEqualTo(300);
        verify(paymentHistoryRepository).findByInvoice_IdOrderByPaymentDateDesc(200);
    }

    @Test
    void getPaymentHistory_whenNoPayments_shouldReturnEmptyList() {
        // Given
        Integer bookingId = 100;
        Invoices invoice = createTestInvoice(200, bookingId);

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(Collections.emptyList());

        // When
        List<PaymentResponse> result = paymentService.getPaymentHistory(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1); // Returns invoice if no payment history
    }

    // ==================== Helper Methods ====================

    private Bookings createTestBooking(Integer bookingId) {
        Bookings booking = new Bookings();
        booking.setId(bookingId);
        booking.setTotalCost(new BigDecimal("1000000"));
        booking.setDepositAmount(BigDecimal.ZERO);

        Customers customer = new Customers();
        customer.setId(1);
        customer.setFullName("Nguyễn Văn A");
        booking.setCustomer(customer);

        Branches branch = new Branches();
        branch.setId(10);
        branch.setBranchName("Chi nhánh Hà Nội");
        booking.setBranch(branch);

        return booking;
    }

    private Employees createTestEmployee(Integer employeeId) {
        Employees employee = new Employees();
        employee.setEmployeeId(employeeId);
        return employee;
    }

    private Invoices createTestInvoice(Integer invoiceId, Integer bookingId) {
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber("INV-" + invoiceId);
        invoice.setType(InvoiceType.INCOME);
        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setIsDeposit(false);
        invoice.setCreatedAt(Instant.now());

        Bookings booking = new Bookings();
        booking.setId(bookingId);
        invoice.setBooking(booking);

        return invoice;
    }

    private PaymentHistory createTestPaymentHistory(Integer paymentId, Invoices invoice) {
        PaymentHistory paymentHistory = new PaymentHistory();
        paymentHistory.setId(paymentId);
        paymentHistory.setInvoice(invoice);
        paymentHistory.setAmount(new BigDecimal("500000"));
        paymentHistory.setPaymentMethod("QR");
        paymentHistory.setConfirmationStatus(PaymentConfirmationStatus.PENDING);
        paymentHistory.setPaymentDate(Instant.now());
        paymentHistory.setCreatedAt(Instant.now());
        return paymentHistory;
    }
}

