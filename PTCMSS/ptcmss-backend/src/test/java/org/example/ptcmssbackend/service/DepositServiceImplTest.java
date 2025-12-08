package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.exception.ResourceNotFoundException;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.service.impl.DepositServiceImpl;
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
class DepositServiceImplTest {

    @Mock
    private InvoiceService invoiceService;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private DepositServiceImpl depositService;

    // ==================== createDeposit() Tests ====================

    @Test
    void createDeposit_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        Integer bookingId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setIsDeposit(true);
        request.setNote("Đặt cọc");

        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        Invoices existingInvoice = createTestInvoice(200, bookingId, PaymentStatus.UNPAID);
        InvoiceResponse invoiceResponse = createTestInvoiceResponse(200);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(existingInvoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(Collections.emptyList());
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(300);
            return ph;
        });
        when(invoiceService.getInvoiceById(200)).thenReturn(invoiceResponse);

        // When
        InvoiceResponse result = depositService.createDeposit(bookingId, request);

        // Then
        assertThat(result).isNotNull();
        verify(paymentHistoryRepository).save(any());
        verify(invoiceService).getInvoiceById(200);
    }

    @Test
    void createDeposit_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("500000"));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> depositService.createDeposit(bookingId, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void createDeposit_whenHasPendingPayment_shouldThrowException() {
        // Given
        Integer bookingId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("500000"));

        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        Invoices invoice = createTestInvoice(200, bookingId, PaymentStatus.UNPAID);
        PaymentHistory pendingPayment = new PaymentHistory();
        pendingPayment.setId(300);
        pendingPayment.setAmount(new BigDecimal("200000"));
        pendingPayment.setConfirmationStatus(PaymentConfirmationStatus.PENDING);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(List.of(pendingPayment));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(BigDecimal.ZERO);

        // When & Then
        assertThatThrownBy(() -> depositService.createDeposit(bookingId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đang chờ duyệt");
    }

    @Test
    void createDeposit_whenAmountExceedsRemaining_shouldThrowException() {
        // Given
        Integer bookingId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("1500000")); // Exceeds remaining

        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        Invoices invoice = createTestInvoice(200, bookingId, PaymentStatus.UNPAID);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(invoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(Collections.emptyList());
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(BigDecimal.ZERO);

        // When & Then
        assertThatThrownBy(() -> depositService.createDeposit(bookingId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("vượt quá số tiền còn lại");
    }

    @Test
    void createDeposit_whenNoInvoiceExists_shouldCreateNewInvoice() {
        // Given
        Integer bookingId = 100;
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setIsDeposit(true);

        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        InvoiceResponse newInvoiceResponse = createTestInvoiceResponse(200);
        Invoices newInvoice = createTestInvoice(200, bookingId, PaymentStatus.UNPAID);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(Collections.emptyList());
        when(invoiceService.createInvoice(any())).thenReturn(newInvoiceResponse);
        when(invoiceRepository.findById(200)).thenReturn(Optional.of(newInvoice));
        when(paymentHistoryRepository.findByInvoice_IdOrderByPaymentDateDesc(200))
                .thenReturn(Collections.emptyList());
        when(paymentHistoryRepository.save(any())).thenAnswer(inv -> {
            PaymentHistory ph = inv.getArgument(0);
            ph.setId(300);
            return ph;
        });
        when(invoiceService.getInvoiceById(200)).thenReturn(newInvoiceResponse);

        // When
        InvoiceResponse result = depositService.createDeposit(bookingId, request);

        // Then
        assertThat(result).isNotNull();
        verify(invoiceService).createInvoice(any());
        verify(paymentHistoryRepository).save(any());
    }

    // ==================== getDepositsByBooking() Tests ====================

    @Test
    void getDepositsByBooking_whenDepositsExist_shouldReturnDeposits() {
        // Given
        Integer bookingId = 100;
        Invoices deposit1 = createTestInvoice(200, bookingId, PaymentStatus.PAID);
        deposit1.setIsDeposit(true);
        Invoices deposit2 = createTestInvoice(201, bookingId, PaymentStatus.UNPAID);
        deposit2.setIsDeposit(true);
        Invoices nonDeposit = createTestInvoice(202, bookingId, PaymentStatus.UNPAID);
        nonDeposit.setIsDeposit(false);

        InvoiceResponse response1 = createTestInvoiceResponse(200);
        InvoiceResponse response2 = createTestInvoiceResponse(201);

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(deposit1, deposit2, nonDeposit));
        when(invoiceService.getInvoiceById(200)).thenReturn(response1);
        when(invoiceService.getInvoiceById(201)).thenReturn(response2);

        // When
        List<InvoiceResponse> result = depositService.getDepositsByBooking(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(invoiceService, times(2)).getInvoiceById(anyInt());
    }

    @Test
    void getDepositsByBooking_whenNoDeposits_shouldReturnEmptyList() {
        // Given
        Integer bookingId = 100;

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(Collections.emptyList());

        // When
        List<InvoiceResponse> result = depositService.getDepositsByBooking(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== getTotalDepositPaid() Tests ====================

    @Test
    void getTotalDepositPaid_whenDepositsPaid_shouldReturnTotal() {
        // Given
        Integer bookingId = 100;
        Invoices deposit1 = createTestInvoice(200, bookingId, PaymentStatus.PAID);
        deposit1.setIsDeposit(true);
        Invoices deposit2 = createTestInvoice(201, bookingId, PaymentStatus.PAID);
        deposit2.setIsDeposit(true);

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(deposit1, deposit2));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(new BigDecimal("300000"));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(201))
                .thenReturn(new BigDecimal("200000"));

        // When
        BigDecimal result = depositService.getTotalDepositPaid(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(new BigDecimal("500000"));
    }

    @Test
    void getTotalDepositPaid_whenNoDeposits_shouldReturnZero() {
        // Given
        Integer bookingId = 100;

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(Collections.emptyList());

        // When
        BigDecimal result = depositService.getTotalDepositPaid(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    @Test
    void getTotalDepositPaid_whenOnlyUnpaidDeposits_shouldReturnZero() {
        // Given
        Integer bookingId = 100;
        Invoices deposit = createTestInvoice(200, bookingId, PaymentStatus.UNPAID);
        deposit.setIsDeposit(true);

        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(deposit));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal result = depositService.getTotalDepositPaid(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== getRemainingAmount() Tests ====================

    @Test
    void getRemainingAmount_whenValidBooking_shouldReturnRemaining() {
        // Given
        Integer bookingId = 100;
        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        Invoices deposit = createTestInvoice(200, bookingId, PaymentStatus.PAID);
        deposit.setIsDeposit(true);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(deposit));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(new BigDecimal("300000"));

        // When
        BigDecimal result = depositService.getRemainingAmount(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(new BigDecimal("700000")); // 1000000 - 300000
    }

    @Test
    void getRemainingAmount_whenBookingNotFound_shouldThrowException() {
        // Given
        Integer bookingId = 999;

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> depositService.getRemainingAmount(bookingId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Booking not found");
    }

    @Test
    void getRemainingAmount_whenFullyPaid_shouldReturnZero() {
        // Given
        Integer bookingId = 100;
        Bookings booking = createTestBooking(bookingId, new BigDecimal("1000000"));
        Invoices deposit = createTestInvoice(200, bookingId, PaymentStatus.PAID);
        deposit.setIsDeposit(true);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoiceRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId))
                .thenReturn(List.of(deposit));
        when(paymentHistoryRepository.sumConfirmedByInvoiceId(200))
                .thenReturn(new BigDecimal("1000000"));

        // When
        BigDecimal result = depositService.getRemainingAmount(bookingId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(BigDecimal.ZERO);
    }

    // ==================== cancelDeposit() Tests ====================

    @Test
    void cancelDeposit_whenValidDeposit_shouldCancelSuccessfully() {
        // Given
        Integer depositId = 200;
        String reason = "Khách hàng hủy";
        Invoices deposit = createTestInvoice(depositId, 100, PaymentStatus.UNPAID);
        deposit.setIsDeposit(true);

        when(invoiceRepository.findById(depositId)).thenReturn(Optional.of(deposit));
        when(invoiceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        depositService.cancelDeposit(depositId, reason);

        // Then
        assertThat(deposit.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(deposit.getCancellationReason()).isEqualTo(reason);
        verify(invoiceRepository).save(deposit);
    }

    @Test
    void cancelDeposit_whenDepositNotFound_shouldThrowException() {
        // Given
        Integer depositId = 999;
        String reason = "Test";

        when(invoiceRepository.findById(depositId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> depositService.cancelDeposit(depositId, reason))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Deposit not found");
    }

    @Test
    void cancelDeposit_whenNotDeposit_shouldThrowException() {
        // Given
        Integer depositId = 200;
        String reason = "Test";
        Invoices invoice = createTestInvoice(depositId, 100, PaymentStatus.UNPAID);
        invoice.setIsDeposit(false); // Not a deposit

        when(invoiceRepository.findById(depositId)).thenReturn(Optional.of(invoice));

        // When & Then
        assertThatThrownBy(() -> depositService.cancelDeposit(depositId, reason))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("không phải là tiền đặt cọc");
    }

    // ==================== generateReceiptNumber() Tests ====================

    @Test
    void generateReceiptNumber_whenValidBranch_shouldGenerateNumber() {
        // Given
        Integer branchId = 10;
        LocalDate today = LocalDate.now();
        String expectedPattern = "REC-" + today.getYear() + 
                String.format("%02d", today.getMonthValue()) + 
                String.format("%02d", today.getDayOfMonth()) + "-%";

        when(invoiceRepository.findMaxSequenceNumber(branchId, expectedPattern))
                .thenReturn(null);

        // When
        String result = depositService.generateReceiptNumber(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).startsWith("REC-");
        assertThat(result).contains(String.valueOf(today.getYear()));
        verify(invoiceRepository).findMaxSequenceNumber(eq(branchId), anyString());
    }

    @Test
    void generateReceiptNumber_whenHasExistingSequence_shouldIncrement() {
        // Given
        Integer branchId = 10;
        LocalDate today = LocalDate.now();
        String expectedPattern = "REC-" + today.getYear() + 
                String.format("%02d", today.getMonthValue()) + 
                String.format("%02d", today.getDayOfMonth()) + "-%";

        when(invoiceRepository.findMaxSequenceNumber(branchId, expectedPattern))
                .thenReturn(5); // Max sequence is 5

        // When
        String result = depositService.generateReceiptNumber(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).contains("-0006"); // Should be 6 (5 + 1)
        verify(invoiceRepository).findMaxSequenceNumber(eq(branchId), anyString());
    }

    // ==================== Helper Methods ====================

    private Bookings createTestBooking(Integer bookingId, BigDecimal totalCost) {
        Bookings booking = new Bookings();
        booking.setId(bookingId);
        booking.setTotalCost(totalCost);
        
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

    private Invoices createTestInvoice(Integer invoiceId, Integer bookingId, PaymentStatus paymentStatus) {
        Invoices invoice = new Invoices();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber("INV-" + invoiceId);
        invoice.setType(InvoiceType.INCOME);
        invoice.setPaymentStatus(paymentStatus);
        invoice.setStatus(InvoiceStatus.ACTIVE);
        invoice.setAmount(new BigDecimal("1000000"));
        invoice.setIsDeposit(false);
        
        Bookings booking = new Bookings();
        booking.setId(bookingId);
        invoice.setBooking(booking);
        
        return invoice;
    }

    private InvoiceResponse createTestInvoiceResponse(Integer invoiceId) {
        InvoiceResponse response = new InvoiceResponse();
        response.setInvoiceId(invoiceId);
        response.setInvoiceNumber("INV-" + invoiceId);
        response.setAmount(new BigDecimal("1000000"));
        response.setPaymentStatus("UNPAID");
        return response;
    }
}

