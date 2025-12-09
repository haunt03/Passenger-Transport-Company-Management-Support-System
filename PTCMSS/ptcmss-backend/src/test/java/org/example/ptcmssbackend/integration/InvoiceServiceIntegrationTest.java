package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Invoice.CreateInvoiceRequest;
import org.example.ptcmssbackend.dto.request.Invoice.RecordPaymentRequest;
import org.example.ptcmssbackend.dto.response.Invoice.InvoiceResponse;
import org.example.ptcmssbackend.dto.response.Invoice.PaymentHistoryResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Customers;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentConfirmationStatus;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.InvoiceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InvoiceServiceIntegrationTest {

    @Autowired
    private InvoiceService invoiceService;

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
    private Employees testEmployee;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Chi nhánh Test");
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

        // Create test role
        Roles role = new Roles();
        role.setRoleName("ACCOUNTANT");
        role.setDescription("Accountant Role");
        role = rolesRepository.save(role);

        // Create test user
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0111222333");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(role);
        user = usersRepository.save(user);

        // Create test employee
        testEmployee = new Employees();
        testEmployee.setUser(user);
        testEmployee.setBranch(testBranch);
        testEmployee.setRole(role);
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        testEmployee = employeeRepository.save(testEmployee);
    }

    @Test
    void createInvoice_shouldCreateInvoiceSuccessfully() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(testBranch.getId());
        request.setType("INCOME");
        request.setAmount(new BigDecimal("1000000"));
        request.setSubtotal(new BigDecimal("1000000"));
        request.setVatAmount(new BigDecimal("100000"));
        request.setIsDeposit(false);
        request.setCustomerId(testCustomer.getId());
        request.setCreatedBy(testEmployee.getEmployeeId());

        // When
        InvoiceResponse response = invoiceService.createInvoice(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getInvoiceId()).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("1000000"));
        assertThat(response.getType()).isEqualTo(InvoiceType.INCOME.name());
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.UNPAID.name());
        assertThat(response.getInvoiceNumber()).isNotBlank();
    }

    @Test
    void createInvoice_withInvalidBranch_shouldThrowException() {
        // Given
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setBranchId(99999);
        request.setType("INCOME");
        request.setAmount(new BigDecimal("1000000"));

        // When & Then
        assertThatThrownBy(() -> invoiceService.createInvoice(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Branch not found");
    }

    @Test
    void getInvoiceById_shouldReturnInvoice() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse created = invoiceService.createInvoice(createRequest);

        // When
        InvoiceResponse response = invoiceService.getInvoiceById(created.getInvoiceId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getInvoiceId()).isEqualTo(created.getInvoiceId());
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("1000000"));
    }

    @Test
    void getInvoiceById_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> invoiceService.getInvoiceById(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invoice not found");
    }

    @Test
    void recordPayment_shouldRecordPaymentSuccessfully() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse invoice = invoiceService.createInvoice(createRequest);

        RecordPaymentRequest paymentRequest = new RecordPaymentRequest();
        paymentRequest.setAmount(new BigDecimal("500000"));
        paymentRequest.setPaymentMethod("CASH");
        paymentRequest.setNote("Test payment");
        paymentRequest.setCreatedBy(testEmployee.getEmployeeId());

        // When
        PaymentHistoryResponse response = invoiceService.recordPayment(invoice.getInvoiceId(), paymentRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(response.getPaymentMethod()).isEqualTo("CASH");
        assertThat(response.getConfirmationStatus()).isEqualTo(PaymentConfirmationStatus.PENDING.name());
    }

    @Test
    void recordPayment_withAmountExceedingBalance_shouldThrowException() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse invoice = invoiceService.createInvoice(createRequest);

        RecordPaymentRequest paymentRequest = new RecordPaymentRequest();
        paymentRequest.setAmount(new BigDecimal("2000000")); // Exceeds balance
        paymentRequest.setPaymentMethod("CASH");

        // When & Then
        assertThatThrownBy(() -> invoiceService.recordPayment(invoice.getInvoiceId(), paymentRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Payment amount exceeds");
    }

    @Test
    void getInvoices_shouldReturnPagedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            CreateInvoiceRequest request = new CreateInvoiceRequest();
            request.setBranchId(testBranch.getId());
            request.setType("INCOME");
            request.setAmount(new BigDecimal("1000000"));
            request.setSubtotal(new BigDecimal("1000000"));
            invoiceService.createInvoice(request);
        }

        // When
        Page<org.example.ptcmssbackend.dto.response.Invoice.InvoiceListResponse> result = 
                invoiceService.getInvoices(
                        testBranch.getId(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        org.springframework.data.domain.PageRequest.of(0, 10)
                );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void calculateBalance_shouldCalculateCorrectBalance() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse invoice = invoiceService.createInvoice(createRequest);

        // Record partial payment
        RecordPaymentRequest paymentRequest = new RecordPaymentRequest();
        paymentRequest.setAmount(new BigDecimal("300000"));
        paymentRequest.setPaymentMethod("CASH");
        invoiceService.recordPayment(invoice.getInvoiceId(), paymentRequest);

        // When
        BigDecimal balance = invoiceService.calculateBalance(invoice.getInvoiceId());

        // Then
        assertThat(balance).isEqualByComparingTo(new BigDecimal("700000"));
    }

    @Test
    void confirmPayment_shouldConfirmPaymentSuccessfully() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse invoice = invoiceService.createInvoice(createRequest);

        RecordPaymentRequest paymentRequest = new RecordPaymentRequest();
        paymentRequest.setAmount(new BigDecimal("1000000"));
        paymentRequest.setPaymentMethod("CASH");
        PaymentHistoryResponse payment = invoiceService.recordPayment(invoice.getInvoiceId(), paymentRequest);

        // When
        PaymentHistoryResponse response = invoiceService.confirmPayment(payment.getPaymentId(), "CONFIRMED");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getConfirmationStatus()).isEqualTo(PaymentConfirmationStatus.CONFIRMED.name());
    }

    @Test
    void updateInvoice_shouldUpdateInvoiceSuccessfully() {
        // Given
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest();
        createRequest.setBranchId(testBranch.getId());
        createRequest.setType("INCOME");
        createRequest.setAmount(new BigDecimal("1000000"));
        createRequest.setSubtotal(new BigDecimal("1000000"));
        
        InvoiceResponse invoice = invoiceService.createInvoice(createRequest);

        CreateInvoiceRequest updateRequest = new CreateInvoiceRequest();
        updateRequest.setBranchId(testBranch.getId());
        updateRequest.setType("INCOME");
        updateRequest.setAmount(new BigDecimal("1500000"));
        updateRequest.setSubtotal(new BigDecimal("1500000"));
        updateRequest.setVatAmount(new BigDecimal("150000"));

        // When
        InvoiceResponse response = invoiceService.updateInvoice(invoice.getInvoiceId(), updateRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("1500000"));
    }
}
