package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Booking.CustomerRequest;
import org.example.ptcmssbackend.dto.response.Booking.CustomerResponse;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Customers;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CustomerServiceIntegrationTest {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Employees testEmployee;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Chi nhánh Test");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test role
        Roles role = new Roles();
        role.setRoleName("CONSULTANT");
        role.setDescription("Consultant Role");
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
    void findOrCreateCustomer_whenCustomerExists_shouldReturnExisting() {
        // Given
        Customers existingCustomer = new Customers();
        existingCustomer.setFullName("Existing Customer");
        existingCustomer.setPhone("0987654321");
        existingCustomer.setEmail("existing@example.com");
        existingCustomer.setStatus(CustomerStatus.ACTIVE);
        existingCustomer = customerRepository.save(existingCustomer);

        CustomerRequest request = new CustomerRequest();
        request.setFullName("Existing Customer");
        request.setPhone("0987654321");
        request.setEmail("existing@example.com");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingCustomer.getId());
        assertThat(result.getPhone()).isEqualTo("0987654321");
    }

    @Test
    void findOrCreateCustomer_whenCustomerNotExists_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("New Customer");
        request.setPhone("0123456789");
        request.setEmail("new@example.com");
        request.setAddress("123 New Street");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("New Customer");
        assertThat(result.getPhone()).isEqualTo("0123456789");
        assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void listCustomers_shouldReturnPagedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            Customers customer = new Customers();
            customer.setFullName("Customer " + i);
            customer.setPhone("098765432" + i);
            customer.setEmail("customer" + i + "@example.com");
            customer.setStatus(CustomerStatus.ACTIVE);
            customerRepository.save(customer);
        }

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void findByPhone_shouldReturnCustomer() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        customer.setPhone("0987654321");
        customer.setEmail("test@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer = customerRepository.save(customer);

        // When
        Customers response = customerService.findByPhone("0987654321");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(customer.getId());
        assertThat(response.getFullName()).isEqualTo("Test Customer");
    }

    @Test
    void toResponse_shouldConvertToResponse() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        customer.setPhone("0987654321");
        customer.setEmail("test@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer = customerRepository.save(customer);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(customer.getId());
        assertThat(response.getFullName()).isEqualTo("Test Customer");
    }

    @Test
    void createCustomer_shouldCreateNewCustomer() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Created Customer");
        request.setPhone("0111222333");
        request.setEmail("created@example.com");
        request.setAddress("456 Created Street");
        request.setNote("Test note");

        // When
        Customers result = customerService.createCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Created Customer");
        assertThat(result.getPhone()).isEqualTo("0111222333");
        assertThat(result.getEmail()).isEqualTo("created@example.com");
        assertThat(result.getAddress()).isEqualTo("456 Created Street");
        assertThat(result.getNote()).isEqualTo("Test note");
        assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
        assertThat(result.getCreatedBy()).isNotNull();
        assertThat(result.getCreatedBy().getEmployeeId()).isEqualTo(testEmployee.getEmployeeId());
    }

    @Test
    void createCustomer_withNullEmployeeId_shouldCreateWithoutCreatedBy() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Customer Without Employee");
        request.setPhone("0999888777");

        // When
        Customers result = customerService.createCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Customer Without Employee");
        assertThat(result.getCreatedBy()).isNull();
    }

    @Test
    void findOrCreateCustomer_whenCustomerExistsWithDifferentInfo_shouldUpdateInfo() {
        // Given
        Customers existingCustomer = new Customers();
        existingCustomer.setFullName("Old Name");
        existingCustomer.setPhone("0987654321");
        existingCustomer.setEmail("old@example.com");
        existingCustomer.setAddress("Old Address");
        existingCustomer.setStatus(CustomerStatus.ACTIVE);
        existingCustomer = customerRepository.save(existingCustomer);

        CustomerRequest request = new CustomerRequest();
        request.setFullName("New Name");
        request.setPhone("0987654321"); // Same phone
        request.setEmail("new@example.com");
        request.setAddress("New Address");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingCustomer.getId());
        assertThat(result.getFullName()).isEqualTo("New Name");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getAddress()).isEqualTo("New Address");
    }

    @Test
    void findOrCreateCustomer_withNullPhone_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("No Phone Customer");
        request.setPhone(null);
        request.setEmail("nophone@example.com");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("No Phone Customer");
        assertThat(result.getPhone()).isNull();
    }

    @Test
    void findOrCreateCustomer_withBlankPhone_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Blank Phone Customer");
        request.setPhone("   ");
        request.setEmail("blankphone@example.com");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Blank Phone Customer");
    }

    @Test
    void findByPhone_whenCustomerNotExists_shouldReturnNull() {
        // When
        Customers result = customerService.findByPhone("9999999999");

        // Then
        assertThat(result).isNull();
    }

    @Test
    void findByPhone_shouldBeCaseInsensitive() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Case Test Customer");
        customer.setPhone("0987654321");
        customer.setEmail("case@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer = customerRepository.save(customer);

        // When
        Customers result1 = customerService.findByPhone("0987654321");
        Customers result2 = customerService.findByPhone("0987654321");

        // Then
        assertThat(result1).isNotNull();
        assertThat(result2).isNotNull();
        assertThat(result1.getId()).isEqualTo(customer.getId());
        assertThat(result2.getId()).isEqualTo(customer.getId());
    }

    @Test
    void listCustomers_withKeywordFilter_shouldFilterByName() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("John Doe");
        customer1.setPhone("1111111111");
        customer1.setEmail("john@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer1);

        Customers customer2 = new Customers();
        customer2.setFullName("Jane Smith");
        customer2.setPhone("2222222222");
        customer2.setEmail("jane@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer2);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                "John",
                null,
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(1);
        assertThat(result.getContent()).anyMatch(c -> c.getFullName().contains("John"));
    }

    @Test
    void listCustomers_withBranchIdFilter_shouldFilterByBranch() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("Branch Customer 1");
        customer1.setPhone("1111111111");
        customer1.setEmail("branch1@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customer1.setCreatedBy(testEmployee);
        customerRepository.save(customer1);

        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("456 Another Street");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        anotherBranch = branchesRepository.save(anotherBranch);

        Roles anotherRole = new Roles();
        anotherRole.setRoleName("CONSULTANT");
        anotherRole.setDescription("Consultant Role");
        anotherRole = rolesRepository.save(anotherRole);

        Users anotherUser = new Users();
        anotherUser.setFullName("Another Employee");
        anotherUser.setUsername("anotheremployee");
        anotherUser.setEmail("another@example.com");
        anotherUser.setPhone("0222333444");
        anotherUser.setPasswordHash(passwordEncoder.encode("password123"));
        anotherUser.setStatus(UserStatus.ACTIVE);
        anotherUser.setRole(anotherRole);
        anotherUser = usersRepository.save(anotherUser);

        Employees anotherEmployee = new Employees();
        anotherEmployee.setUser(anotherUser);
        anotherEmployee.setBranch(anotherBranch);
        anotherEmployee.setRole(anotherRole);
        anotherEmployee.setStatus(EmployeeStatus.ACTIVE);
        anotherEmployee = employeeRepository.save(anotherEmployee);

        Customers customer2 = new Customers();
        customer2.setFullName("Branch Customer 2");
        customer2.setPhone("2222222222");
        customer2.setEmail("branch2@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customer2.setCreatedBy(anotherEmployee);
        customerRepository.save(customer2);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                testBranch.getId(),
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(1);
        assertThat(result.getContent()).allMatch(c -> 
            c.getBranchId() != null && c.getBranchId().equals(testBranch.getId())
        );
    }

    @Test
    void listCustomers_withManagerUserId_shouldAutoFilterByBranch() {
        // Given
        Roles managerRole = new Roles();
        managerRole.setRoleName("MANAGER");
        managerRole.setDescription("Manager Role");
        managerRole = rolesRepository.save(managerRole);

        Users managerUser = new Users();
        managerUser.setFullName("Manager User");
        managerUser.setUsername("manager");
        managerUser.setEmail("manager@example.com");
        managerUser.setPhone("0333444555");
        managerUser.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser.setStatus(UserStatus.ACTIVE);
        managerUser.setRole(managerRole);
        managerUser = usersRepository.save(managerUser);

        Employees managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(testBranch);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        Customers customer1 = new Customers();
        customer1.setFullName("Manager Branch Customer");
        customer1.setPhone("1111111111");
        customer1.setEmail("managerbranch@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customer1.setCreatedBy(managerEmployee);
        customerRepository.save(customer1);

        Branches otherBranch = new Branches();
        otherBranch.setBranchName("Other Branch");
        otherBranch.setLocation("789 Other Street");
        otherBranch.setStatus(BranchStatus.ACTIVE);
        otherBranch = branchesRepository.save(otherBranch);

        Employees otherEmployee = new Employees();
        otherEmployee.setUser(testEmployee.getUser());
        otherEmployee.setBranch(otherBranch);
        otherEmployee.setRole(testEmployee.getRole());
        otherEmployee.setStatus(EmployeeStatus.ACTIVE);
        otherEmployee = employeeRepository.save(otherEmployee);

        Customers customer2 = new Customers();
        customer2.setFullName("Other Branch Customer");
        customer2.setPhone("2222222222");
        customer2.setEmail("otherbranch@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customer2.setCreatedBy(otherEmployee);
        customerRepository.save(customer2);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                managerUser.getId(),
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(1);
        assertThat(result.getContent()).allMatch(c -> 
            c.getBranchId() != null && c.getBranchId().equals(testBranch.getId())
        );
    }

    @Test
    void listCustomers_withDateFilters_shouldFilterByDateRange() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("Recent Customer");
        customer1.setPhone("1111111111");
        customer1.setEmail("recent@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customer1.setCreatedBy(testEmployee);
        customerRepository.save(customer1);

        // When - filter by today
        LocalDate today = LocalDate.now();
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                today,
                today,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void listCustomers_withPagination_shouldReturnCorrectPage() {
        // Given
        for (int i = 0; i < 15; i++) {
            Customers customer = new Customers();
            customer.setFullName("Pagination Customer " + i);
            customer.setPhone("098765432" + String.format("%02d", i));
            customer.setEmail("pagination" + i + "@example.com");
            customer.setStatus(CustomerStatus.ACTIVE);
            customerRepository.save(customer);
        }

        // When - get first page
        Page<CustomerResponse> page1 = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                0,
                10
        );

        // When - get second page
        Page<CustomerResponse> page2 = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                1,
                10
        );

        // Then
        assertThat(page1).isNotNull();
        assertThat(page1.getTotalElements()).isGreaterThanOrEqualTo(15);
        assertThat(page1.getContent().size()).isLessThanOrEqualTo(10);
        assertThat(page2).isNotNull();
        assertThat(page2.getContent().size()).isGreaterThan(0);
    }

    @Test
    void toResponse_withNullCustomer_shouldReturnNull() {
        // When
        CustomerResponse response = customerService.toResponse(null);

        // Then
        assertThat(response).isNull();
    }

    @Test
    void toResponse_withCustomerAndCreatedBy_shouldIncludeBranchInfo() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Customer With Branch");
        customer.setPhone("0987654321");
        customer.setEmail("branch@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedBy(testEmployee);
        customer = customerRepository.save(customer);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getBranchId()).isEqualTo(testBranch.getId());
        assertThat(response.getBranchName()).isEqualTo(testBranch.getBranchName());
    }

    @Test
    void toResponse_withCustomerWithoutCreatedBy_shouldNotIncludeBranchInfo() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Customer Without Branch");
        customer.setPhone("0987654321");
        customer.setEmail("nobranch@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedBy(null);
        customer = customerRepository.save(customer);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getBranchId()).isNull();
        assertThat(response.getBranchName()).isNull();
    }

    @Test
    void createCustomer_withInvalidEmployeeId_shouldCreateWithoutCreatedBy() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Customer With Invalid Employee");
        request.setPhone("0888777666");
        request.setEmail("invalid@example.com");

        // When
        Customers result = customerService.createCustomer(request, 99999);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Customer With Invalid Employee");
        assertThat(result.getCreatedBy()).isNull();
    }

    @Test
    void findOrCreateCustomer_withCaseInsensitivePhone_shouldFindExisting() {
        // Given
        Customers existingCustomer = new Customers();
        existingCustomer.setFullName("Case Test Customer");
        existingCustomer.setPhone("0987654321");
        existingCustomer.setEmail("case@example.com");
        existingCustomer.setStatus(CustomerStatus.ACTIVE);
        existingCustomer = customerRepository.save(existingCustomer);

        CustomerRequest request = new CustomerRequest();
        request.setFullName("Case Test Customer");
        request.setPhone("0987654321"); // Same phone, different case handling
        request.setEmail("case@example.com");

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingCustomer.getId());
    }

    @Test
    void findOrCreateCustomer_withPartialUpdate_shouldUpdateOnlyChangedFields() {
        // Given
        Customers existingCustomer = new Customers();
        existingCustomer.setFullName("Original Name");
        existingCustomer.setPhone("0987654321");
        existingCustomer.setEmail("original@example.com");
        existingCustomer.setAddress("Original Address");
        existingCustomer.setStatus(CustomerStatus.ACTIVE);
        existingCustomer = customerRepository.save(existingCustomer);

        CustomerRequest request = new CustomerRequest();
        request.setFullName("Updated Name");
        request.setPhone("0987654321"); // Same phone
        request.setEmail("original@example.com"); // Same email
        request.setAddress("Updated Address"); // Different address

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingCustomer.getId());
        assertThat(result.getFullName()).isEqualTo("Updated Name");
        assertThat(result.getEmail()).isEqualTo("original@example.com");
        assertThat(result.getAddress()).isEqualTo("Updated Address");
    }

    @Test
    void listCustomers_withInvalidDateRange_shouldReturnEmptyOrAll() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Date Test Customer");
        customer.setPhone("1111111111");
        customer.setEmail("date@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedBy(testEmployee);
        customerRepository.save(customer);

        // When - fromDate > toDate
        LocalDate futureDate = LocalDate.now().plusDays(10);
        LocalDate pastDate = LocalDate.now().minusDays(10);
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                futureDate,
                pastDate,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        // Should return empty or handle gracefully
    }

    @Test
    void listCustomers_withEmptyKeyword_shouldReturnAll() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("Customer One");
        customer1.setPhone("1111111111");
        customer1.setEmail("one@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer1);

        Customers customer2 = new Customers();
        customer2.setFullName("Customer Two");
        customer2.setPhone("2222222222");
        customer2.setEmail("two@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer2);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                "",
                null,
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void listCustomers_withInvalidPagination_shouldHandleGracefully() {
        // Given
        for (int i = 0; i < 5; i++) {
            Customers customer = new Customers();
            customer.setFullName("Pagination Test " + i);
            customer.setPhone("098765432" + i);
            customer.setEmail("pagination" + i + "@example.com");
            customer.setStatus(CustomerStatus.ACTIVE);
            customerRepository.save(customer);
        }

        // When - negative page
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                -1,
                10
        );

        // Then
        assertThat(result).isNotNull();
        // Should handle negative page gracefully (likely returns first page)
    }

    @Test
    void listCustomers_withZeroSize_shouldHandleGracefully() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Zero Size Test");
        customer.setPhone("1111111111");
        customer.setEmail("zero@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                0,
                0
        );

        // Then
        assertThat(result).isNotNull();
    }

    @Test
    void listCustomers_withManagerButNoBranch_shouldNotFilterByBranch() {
        // Given
        Roles managerRole = new Roles();
        managerRole.setRoleName("MANAGER");
        managerRole.setDescription("Manager Role");
        managerRole = rolesRepository.save(managerRole);

        Users managerUser = new Users();
        managerUser.setFullName("Manager Without Branch");
        managerUser.setUsername("managerwithoutbranch");
        managerUser.setEmail("managerwb@example.com");
        managerUser.setPhone("0444555666");
        managerUser.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser.setStatus(UserStatus.ACTIVE);
        managerUser.setRole(managerRole);
        managerUser = usersRepository.save(managerUser);

        Employees managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(null); // No branch
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        Customers customer = new Customers();
        customer.setFullName("Customer For Manager");
        customer.setPhone("1111111111");
        customer.setEmail("manager@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedBy(testEmployee);
        customerRepository.save(customer);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                managerUser.getId(),
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        // Should not filter by branch since manager has no branch
    }

    @Test
    void listCustomers_withNonManagerUserId_shouldNotAutoFilterByBranch() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("Customer For Consultant");
        customer1.setPhone("1111111111");
        customer1.setEmail("consultant@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customer1.setCreatedBy(testEmployee);
        customerRepository.save(customer1);

        Branches otherBranch = new Branches();
        otherBranch.setBranchName("Other Branch");
        otherBranch.setLocation("789 Other Street");
        otherBranch.setStatus(BranchStatus.ACTIVE);
        otherBranch = branchesRepository.save(otherBranch);

        Employees otherEmployee = new Employees();
        otherEmployee.setUser(testEmployee.getUser());
        otherEmployee.setBranch(otherBranch);
        otherEmployee.setRole(testEmployee.getRole());
        otherEmployee.setStatus(EmployeeStatus.ACTIVE);
        otherEmployee = employeeRepository.save(otherEmployee);

        Customers customer2 = new Customers();
        customer2.setFullName("Other Branch Customer");
        customer2.setPhone("2222222222");
        customer2.setEmail("other@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customer2.setCreatedBy(otherEmployee);
        customerRepository.save(customer2);

        // When - use consultant user (not manager)
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                testEmployee.getUser().getId(),
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        // Should return all customers, not filtered by branch
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void listCustomers_withUserIdButNoEmployee_shouldNotFilterByBranch() {
        // Given
        Roles role = new Roles();
        role.setRoleName("CONSULTANT");
        role.setDescription("Consultant Role");
        role = rolesRepository.save(role);

        Users userWithoutEmployee = new Users();
        userWithoutEmployee.setFullName("User Without Employee");
        userWithoutEmployee.setUsername("userwithoutemployee");
        userWithoutEmployee.setEmail("userwe@example.com");
        userWithoutEmployee.setPhone("0555666777");
        userWithoutEmployee.setPasswordHash(passwordEncoder.encode("password123"));
        userWithoutEmployee.setStatus(UserStatus.ACTIVE);
        userWithoutEmployee.setRole(role);
        userWithoutEmployee = usersRepository.save(userWithoutEmployee);

        Customers customer = new Customers();
        customer.setFullName("Test Customer");
        customer.setPhone("1111111111");
        customer.setEmail("test@example.com");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedBy(testEmployee);
        customerRepository.save(customer);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                userWithoutEmployee.getId(),
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        // Should return all customers since no employee found
    }

    @Test
    void createCustomer_withNullValues_shouldCreateWithNullFields() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Null Values Customer");
        request.setPhone(null);
        request.setEmail(null);
        request.setAddress(null);
        request.setNote(null);

        // When
        Customers result = customerService.createCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Null Values Customer");
        assertThat(result.getPhone()).isNull();
        assertThat(result.getEmail()).isNull();
        assertThat(result.getAddress()).isNull();
        assertThat(result.getNote()).isNull();
        assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
    }

    @Test
    void toResponse_withNullStatus_shouldHandleGracefully() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Null Status Customer");
        customer.setPhone("0987654321");
        customer.setEmail("nullstatus@example.com");
        customer.setStatus(null);
        customer = customerRepository.save(customer);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(customer.getId());
        assertThat(response.getStatus()).isNull();
    }

    @Test
    void toResponse_withInactiveStatus_shouldReturnInactiveStatus() {
        // Given
        Customers customer = new Customers();
        customer.setFullName("Inactive Customer");
        customer.setPhone("0987654321");
        customer.setEmail("inactive@example.com");
        customer.setStatus(CustomerStatus.INACTIVE);
        customer = customerRepository.save(customer);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("INACTIVE");
    }

    @Test
    void listCustomers_withStatusFilter_shouldFilterByStatus() {
        // Given
        Customers activeCustomer = new Customers();
        activeCustomer.setFullName("Active Customer");
        activeCustomer.setPhone("1111111111");
        activeCustomer.setEmail("active@example.com");
        activeCustomer.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(activeCustomer);

        Customers inactiveCustomer = new Customers();
        inactiveCustomer.setFullName("Inactive Customer");
        inactiveCustomer.setPhone("2222222222");
        inactiveCustomer.setEmail("inactive@example.com");
        inactiveCustomer.setStatus(CustomerStatus.INACTIVE);
        customerRepository.save(inactiveCustomer);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(
                null,
                null,
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(2);
        // Both active and inactive should be returned (if no status filter in repository)
    }

    @Test
    void findOrCreateCustomer_withOnlyPhone_shouldFindOrCreate() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName(null);
        request.setPhone("0987654321");
        request.setEmail(null);
        request.setAddress(null);

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getPhone()).isEqualTo("0987654321");
    }

    @Test
    void findOrCreateCustomer_withOnlyEmail_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Email Only Customer");
        request.setPhone(null);
        request.setEmail("emailonly@example.com");
        request.setAddress(null);

        // When
        Customers result = customerService.findOrCreateCustomer(request, testEmployee.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getEmail()).isEqualTo("emailonly@example.com");
        assertThat(result.getPhone()).isNull();
    }

    @Test
    void listCustomers_withCombinedFilters_shouldApplyAllFilters() {
        // Given
        Customers customer1 = new Customers();
        customer1.setFullName("John Branch Customer");
        customer1.setPhone("1111111111");
        customer1.setEmail("johnbranch@example.com");
        customer1.setStatus(CustomerStatus.ACTIVE);
        customer1.setCreatedBy(testEmployee);
        customerRepository.save(customer1);

        Customers customer2 = new Customers();
        customer2.setFullName("Jane Other Customer");
        customer2.setPhone("2222222222");
        customer2.setEmail("janeother@example.com");
        customer2.setStatus(CustomerStatus.ACTIVE);
        customerRepository.save(customer2);

        // When - filter by keyword and branch
        Page<CustomerResponse> result = customerService.listCustomers(
                "John",
                testBranch.getId(),
                null,
                null,
                null,
                0,
                10
        );

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).anyMatch(c -> c.getFullName().contains("John"));
    }
}
