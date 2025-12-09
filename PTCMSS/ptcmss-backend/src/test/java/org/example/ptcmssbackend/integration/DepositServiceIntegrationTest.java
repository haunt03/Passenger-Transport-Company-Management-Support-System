package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
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
import org.example.ptcmssbackend.enums.InvoiceType;
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
import org.example.ptcmssbackend.service.DepositService;
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
class DepositServiceIntegrationTest {

    @Autowired
    private DepositService depositService;

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
        testBooking = bookingRepository.save(testBooking);
    }

    @Test
    void createDeposit_shouldCreateDepositSuccessfully() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("500000"));
        request.setNote("Test deposit");
        request.setCreatedBy(testEmployee.getEmployeeId());

        // When
        InvoiceResponse result = depositService.createDeposit(testBooking.getId(), request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getInvoiceId()).isNotNull();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("500000"));
        
        // Verify payment history was created with PENDING status
        List<PaymentHistory> paymentHistories = paymentHistoryRepository
                .findByInvoice_IdOrderByPaymentDateDesc(result.getInvoiceId());
        assertThat(paymentHistories).isNotEmpty();
        assertThat(paymentHistories.get(0).getConfirmationStatus())
                .isEqualTo(PaymentConfirmationStatus.PENDING);
    }

    @Test
    void createDeposit_withAmountExceedingRemaining_shouldThrowException() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("2000000")); // Exceeds total cost
        request.setCreatedBy(testEmployee.getEmployeeId());

        // When & Then
        assertThatThrownBy(() -> depositService.createDeposit(testBooking.getId(), request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Số tiền vượt quá");
    }

    @Test
    void createDeposit_withPendingPayment_shouldThrowException() {
        // Given - Create first deposit
        CreateInvoiceRequest request1 = new CreateInvoiceRequest();
        request1.setBranchId(testBranch.getId());
        request1.setBookingId(testBooking.getId());
        request1.setCustomerId(testCustomer.getId());
        request1.setType("INCOME");
        request1.setIsDeposit(true);
        request1.setAmount(new BigDecimal("300000"));
        request1.setCreatedBy(testEmployee.getEmployeeId());
        InvoiceResponse firstDeposit = depositService.createDeposit(testBooking.getId(), request1);

        // Try to create second deposit while first is still PENDING
        CreateInvoiceRequest request2 = new CreateInvoiceRequest();
        request2.setBranchId(testBranch.getId());
        request2.setBookingId(testBooking.getId());
        request2.setCustomerId(testCustomer.getId());
        request2.setType("INCOME");
        request2.setIsDeposit(true);
        request2.setAmount(new BigDecimal("200000"));
        request2.setCreatedBy(testEmployee.getEmployeeId());

        // When & Then
        assertThatThrownBy(() -> depositService.createDeposit(testBooking.getId(), request2))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể tạo yêu cầu thanh toán mới");
    }

    @Test
    void getDepositsByBooking_shouldReturnDeposits() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("500000"));
        request.setCreatedBy(testEmployee.getEmployeeId());
        depositService.createDeposit(testBooking.getId(), request);

        // When
        List<InvoiceResponse> result = depositService.getDepositsByBooking(testBooking.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
        assertThat(result.get(0).getIsDeposit()).isTrue();
    }

    @Test
    void getTotalDepositPaid_shouldReturnZeroWhenNoPaidDeposits() {
        // Given - Create deposit but not paid yet
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("500000"));
        request.setCreatedBy(testEmployee.getEmployeeId());
        depositService.createDeposit(testBooking.getId(), request);

        // When
        BigDecimal result = depositService.getTotalDepositPaid(testBooking.getId());

        // Then
        assertThat(result).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void getTotalDepositPaid_shouldReturnPaidAmount() {
        // Given - Create invoice and mark payment as confirmed
        Invoices invoice = new Invoices();
        invoice.setBooking(testBooking);
        invoice.setCustomer(testCustomer);
        invoice.setBranch(testBranch);
        invoice.setType(InvoiceType.INCOME);
        invoice.setIsDeposit(true);
        invoice.setAmount(new BigDecimal("500000"));
        invoice.setPaymentStatus(PaymentStatus.PAID);
        invoice = invoiceRepository.save(invoice);

        PaymentHistory paymentHistory = new PaymentHistory();
        paymentHistory.setInvoice(invoice);
        paymentHistory.setAmount(new BigDecimal("500000"));
        paymentHistory.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);
        paymentHistoryRepository.save(paymentHistory);

        // When
        BigDecimal result = depositService.getTotalDepositPaid(testBooking.getId());

        // Then
        assertThat(result).isEqualByComparingTo(new BigDecimal("500000"));
    }

    @Test
    void getRemainingAmount_shouldReturnTotalCostWhenNoDeposits() {
        // When
        BigDecimal result = depositService.getRemainingAmount(testBooking.getId());

        // Then
        assertThat(result).isEqualByComparingTo(new BigDecimal("1000000"));
    }

    @Test
    void getRemainingAmount_shouldCalculateCorrectly() {
        // Given - Create paid deposit
        Invoices invoice = new Invoices();
        invoice.setBooking(testBooking);
        invoice.setCustomer(testCustomer);
        invoice.setBranch(testBranch);
        invoice.setType(InvoiceType.INCOME);
        invoice.setIsDeposit(true);
        invoice.setAmount(new BigDecimal("500000"));
        invoice.setPaymentStatus(PaymentStatus.PAID);
        invoice = invoiceRepository.save(invoice);

        PaymentHistory paymentHistory = new PaymentHistory();
        paymentHistory.setInvoice(invoice);
        paymentHistory.setAmount(new BigDecimal("500000"));
        paymentHistory.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);
        paymentHistoryRepository.save(paymentHistory);

        // When
        BigDecimal result = depositService.getRemainingAmount(testBooking.getId());

        // Then
        assertThat(result).isEqualByComparingTo(new BigDecimal("500000"));
    }

    @Test
    void cancelDeposit_shouldCancelDeposit() {
        // Given - Create deposit
        Invoices invoice = new Invoices();
        invoice.setBooking(testBooking);
        invoice.setCustomer(testCustomer);
        invoice.setBranch(testBranch);
        invoice.setType(InvoiceType.INCOME);
        invoice.setIsDeposit(true);
        invoice.setAmount(new BigDecimal("500000"));
        invoice = invoiceRepository.save(invoice);

        // When
        depositService.cancelDeposit(invoice.getId(), "Test cancellation reason");

        // Then
        Invoices cancelled = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertThat(cancelled.getStatus()).isNotNull();
        assertThat(cancelled.getCancellationReason()).isEqualTo("Test cancellation reason");
    }

    @Test
    void cancelDeposit_withNonDepositInvoice_shouldThrowException() {
        // Given - Create non-deposit invoice
        Invoices invoice = new Invoices();
        invoice.setBooking(testBooking);
        invoice.setCustomer(testCustomer);
        invoice.setBranch(testBranch);
        invoice.setType(InvoiceType.INCOME);
        invoice.setIsDeposit(false);
        invoice.setAmount(new BigDecimal("500000"));
        Invoices savedInvoice = invoiceRepository.save(invoice);

        // When & Then
        assertThatThrownBy(() -> depositService.cancelDeposit(savedInvoice.getId(), "Reason"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Hóa đơn không phải là tiền đặt cọc");
    }

    @Test
    void cancelDeposit_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> depositService.cancelDeposit(99999, "Reason"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void generateReceiptNumber_shouldGenerateUniqueNumber() {
        // When
        String receipt1 = depositService.generateReceiptNumber(testBranch.getId());
        String receipt2 = depositService.generateReceiptNumber(testBranch.getId());

        // Then
        assertThat(receipt1).isNotNull();
        assertThat(receipt2).isNotNull();
        assertThat(receipt1).startsWith("REC-");
        assertThat(receipt2).startsWith("REC-");
        // Should be different
        assertThat(receipt1).isNotEqualTo(receipt2);
    }

    @Test
    void createDeposit_shouldCreateInvoiceIfNotExists() {
        // Given - Booking without invoice
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("500000"));
        request.setCreatedBy(testEmployee.getEmployeeId());

        // When
        InvoiceResponse result = depositService.createDeposit(testBooking.getId(), request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getInvoiceId()).isNotNull();
        
        // Verify invoice exists
        Invoices invoice = invoiceRepository.findById(result.getInvoiceId()).orElseThrow();
        assertThat(invoice.getType()).isEqualTo(InvoiceType.INCOME);
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.UNPAID);
    }

    @Test
    void createDeposit_shouldUseExistingInvoiceIfUnpaid() {
        // Given - Create unpaid invoice first
        Invoices existingInvoice = new Invoices();
        existingInvoice.setBooking(testBooking);
        existingInvoice.setCustomer(testCustomer);
        existingInvoice.setBranch(testBranch);
        existingInvoice.setType(InvoiceType.INCOME);
        existingInvoice.setPaymentStatus(PaymentStatus.UNPAID);
        existingInvoice.setAmount(new BigDecimal("1000000"));
        existingInvoice = invoiceRepository.save(existingInvoice);

        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("500000"));
        request.setCreatedBy(testEmployee.getEmployeeId());

        // When
        InvoiceResponse result = depositService.createDeposit(testBooking.getId(), request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getInvoiceId()).isEqualTo(existingInvoice.getId());
    }

    @Test
    void getDepositsByBooking_withNoDeposits_shouldReturnEmptyList() {
        // When
        List<InvoiceResponse> result = depositService.getDepositsByBooking(testBooking.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    @Test
    void createDeposit_withMultipleDeposits_shouldWorkAfterConfirmation() {
        // Given - Create and confirm first deposit
        Invoices invoice1 = new Invoices();
        invoice1.setBooking(testBooking);
        invoice1.setCustomer(testCustomer);
        invoice1.setBranch(testBranch);
        invoice1.setType(InvoiceType.INCOME);
        invoice1.setIsDeposit(true);
        invoice1.setAmount(new BigDecimal("500000"));
        invoice1.setPaymentStatus(PaymentStatus.PAID);
        invoice1 = invoiceRepository.save(invoice1);

        PaymentHistory ph1 = new PaymentHistory();
        ph1.setInvoice(invoice1);
        ph1.setAmount(new BigDecimal("500000"));
        ph1.setConfirmationStatus(PaymentConfirmationStatus.CONFIRMED);
        paymentHistoryRepository.save(ph1);

        // When - Create second deposit
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setBookingId(testBooking.getId());
        request.setCustomerId(testCustomer.getId());
        request.setType("INCOME");
        request.setIsDeposit(true);
        request.setAmount(new BigDecimal("300000"));
        request.setCreatedBy(testEmployee.getEmployeeId());
        InvoiceResponse result = depositService.createDeposit(testBooking.getId(), request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getInvoiceId()).isNotNull();
    }
}

