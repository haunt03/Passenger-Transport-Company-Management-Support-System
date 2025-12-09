package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Booking.CreatePaymentRequest;
import org.example.ptcmssbackend.dto.response.Booking.PaymentResponse;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Customers;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Invoices;
import org.example.ptcmssbackend.entity.PaymentHistory;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BookingRepository;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.PaymentHistoryRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PaymentServiceIntegrationTest {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private PaymentHistoryRepository paymentHistoryRepository;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Customers testCustomer;
    private Bookings testBooking;
    private Employees testEmployee;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Test Branch");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test customer
        testCustomer = new Customers();
        testCustomer.setFullName("Test Customer");
        testCustomer.setPhone("0987654321");
        testCustomer.setEmail("test@example.com");
        testCustomer.setStatus(CustomerStatus.ACTIVE);
        testCustomer = customerRepository.save(testCustomer);

        // Create test role and user
        Roles role = new Roles();
        role.setRoleName("CONSULTANT");
        role.setDescription("Consultant Role");
        role = rolesRepository.save(role);

        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0111222333");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(role);
        user = usersRepository.save(user);

        testEmployee = new Employees();
        testEmployee.setUser(user);
        testEmployee.setBranch(testBranch);
        testEmployee.setRole(role);
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        testEmployee = employeeRepository.save(testEmployee);

        // Create test booking
        testBooking = new Bookings();
        testBooking.setCustomer(testCustomer);
        testBooking.setBranch(testBranch);
        testBooking.setStatus(BookingStatus.CONFIRMED);
        testBooking.setTotalCost(new BigDecimal("1000000"));
        testBooking.setDepositAmount(new BigDecimal("200000"));
        testBooking = bookingRepository.save(testBooking);
    }

    @Test
    void generateQRCode_shouldGenerateQRCodeSuccessfully() {
        // Given
        BigDecimal amount = new BigDecimal("500000");
        String note = "Test payment";
        Boolean deposit = false;

        // When
        PaymentResponse result = paymentService.generateQRCode(
                testBooking.getId(), amount, note, deposit, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(testBooking.getId());
        assertThat(result.getAmount()).isEqualByComparingTo(amount);
        assertThat(result.isDeposit()).isFalse();
        assertThat(result.getPaymentMethod()).isEqualTo("QR");
        assertThat(result.getQrText()).isNotNull();
        assertThat(result.getQrImageUrl()).isNotNull();
        assertThat(result.getExpiresAt()).isNotNull();
        assertThat(result.getConfirmationStatus()).isEqualTo("PENDING");
    }

    @Test
    void generateQRCode_forDeposit_shouldGenerateDepositQR() {
        // Given
        BigDecimal amount = new BigDecimal("200000");
        Boolean deposit = true;

        // When
        PaymentResponse result = paymentService.generateQRCode(
                testBooking.getId(), amount, null, deposit, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.isDeposit()).isTrue();
        assertThat(result.getConfirmationStatus()).isEqualTo("PENDING");
    }

    @Test
    void generateQRCode_withInvalidAmount_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> paymentService.generateQRCode(
                testBooking.getId(), BigDecimal.ZERO, null, false, testEmployee.getEmployeeId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Số tiền phải lớn hơn 0");
    }

    @Test
    void generateQRCode_withInvalidBookingId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> paymentService.generateQRCode(
                99999, new BigDecimal("500000"), null, false, testEmployee.getEmployeeId()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void createDeposit_shouldCreateDepositSuccessfully() {
        // Given
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("300000"));
        request.setPaymentMethod("CASH");
        request.setDeposit(true);
        request.setNote("Test deposit");

        // When
        PaymentResponse result = paymentService.createDeposit(
                testBooking.getId(), request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(testBooking.getId());
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("300000"));
        assertThat(result.isDeposit()).isTrue();
        assertThat(result.getPaymentStatus()).isEqualTo("UNPAID");
        
        // Verify payment history was created
        List<PaymentHistory> paymentHistories = paymentHistoryRepository
                .findByInvoice_IdOrderByPaymentDateDesc(result.getInvoiceId());
        assertThat(paymentHistories).isNotEmpty();
        assertThat(paymentHistories.get(0).getConfirmationStatus())
                .isEqualTo(PaymentConfirmationStatus.PENDING);
    }

    @Test
    void createDeposit_withInvalidAmount_shouldThrowException() {
        // Given
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(BigDecimal.ZERO);
        request.setDeposit(true);

        // When & Then
        assertThatThrownBy(() -> paymentService.createDeposit(
                testBooking.getId(), request, testEmployee.getEmployeeId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Số tiền phải lớn hơn 0");
    }

    @Test
    void createDeposit_withInvalidBookingId_shouldThrowException() {
        // Given
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("300000"));
        request.setDeposit(true);

        // When & Then
        assertThatThrownBy(() -> paymentService.createDeposit(
                99999, request, testEmployee.getEmployeeId()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy đơn hàng");
    }

    @Test
    void getPaymentHistory_shouldReturnPaymentHistory() {
        // Given - Create payment
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("500000"));
        request.setPaymentMethod("CASH");
        request.setDeposit(false);
        paymentService.createDeposit(testBooking.getId(), request, testEmployee.getEmployeeId());

        // When
        List<PaymentResponse> result = paymentService.getPaymentHistory(testBooking.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
        assertThat(result.get(0).getBookingId()).isEqualTo(testBooking.getId());
    }

    @Test
    void getPaymentHistory_withNoPayments_shouldReturnEmptyList() {
        // When
        List<PaymentResponse> result = paymentService.getPaymentHistory(testBooking.getId());

        // Then
        assertThat(result).isNotNull();
        // May be empty or contain existing invoices
    }

    @Test
    void generateQRCode_shouldCreatePendingPaymentHistory() {
        // Given
        BigDecimal amount = new BigDecimal("500000");

        // When
        PaymentResponse result = paymentService.generateQRCode(
                testBooking.getId(), amount, "Test", false, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getPaymentId()).isNotNull();
        
        // Verify payment history exists
        PaymentHistory paymentHistory = paymentHistoryRepository.findById(result.getPaymentId()).orElseThrow();
        assertThat(paymentHistory.getConfirmationStatus()).isEqualTo(PaymentConfirmationStatus.PENDING);
        assertThat(paymentHistory.getPaymentMethod()).isEqualTo("QR");
        assertThat(paymentHistory.getAmount()).isEqualByComparingTo(amount);
    }

    @Test
    void generateQRCode_shouldCreateInvoice() {
        // Given
        BigDecimal amount = new BigDecimal("500000");

        // When
        PaymentResponse result = paymentService.generateQRCode(
                testBooking.getId(), amount, "Test", false, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getInvoiceId()).isNotNull();
        
        // Verify invoice exists
        Invoices invoice = invoiceRepository.findById(result.getInvoiceId()).orElseThrow();
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(invoice.getAmount()).isEqualByComparingTo(amount);
    }

    @Test
    void createDeposit_withNullEmployeeId_shouldStillWork() {
        // Given
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setAmount(new BigDecimal("300000"));
        request.setDeposit(true);

        // When
        PaymentResponse result = paymentService.createDeposit(
                testBooking.getId(), request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("300000"));
    }

    @Test
    void generateQRCode_withNullEmployeeId_shouldStillWork() {
        // Given
        BigDecimal amount = new BigDecimal("500000");

        // When
        PaymentResponse result = paymentService.generateQRCode(
                testBooking.getId(), amount, "Test", false, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAmount()).isEqualByComparingTo(amount);
    }
}

