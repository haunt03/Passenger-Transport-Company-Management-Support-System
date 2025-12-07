package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Booking.CustomerRequest;
import org.example.ptcmssbackend.dto.response.Booking.CustomerResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.CustomerStatus;
import org.example.ptcmssbackend.repository.CustomerRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.service.impl.CustomerServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private CustomerServiceImpl customerService;

    // ==================== findOrCreateCustomer() Tests ====================

    @Test
    void findOrCreateCustomer_whenCustomerExistsByPhone_shouldReturnExisting() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone("0912345678");
        request.setFullName("Nguyễn Văn A");
        request.setEmail("test@example.com");

        Customers existingCustomer = new Customers();
        existingCustomer.setId(100);
        existingCustomer.setPhone("0912345678");
        existingCustomer.setFullName("Nguyễn Văn A");
        existingCustomer.setEmail("old@example.com");

        when(customerRepository.findByPhoneIgnoreCase("0912345678"))
                .thenReturn(Optional.of(existingCustomer));
        when(customerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Customers result = customerService.findOrCreateCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100);
        assertThat(result.getPhone()).isEqualTo("0912345678");
        // Email should be updated
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(customerRepository).findByPhoneIgnoreCase("0912345678");
        verify(customerRepository).save(existingCustomer);
    }

    @Test
    void findOrCreateCustomer_whenCustomerNotExists_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone("0912345678");
        request.setFullName("Nguyễn Văn A");
        request.setEmail("test@example.com");
        request.setAddress("123 Đường ABC");

        when(customerRepository.findByPhoneIgnoreCase("0912345678"))
                .thenReturn(Optional.empty());
        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.findOrCreateCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(200);
        assertThat(result.getPhone()).isEqualTo("0912345678");
        assertThat(result.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getAddress()).isEqualTo("123 Đường ABC");
        assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
        verify(customerRepository).findByPhoneIgnoreCase("0912345678");
        verify(customerRepository).save(any());
    }

    @Test
    void findOrCreateCustomer_whenPhoneIsNull_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone(null);
        request.setFullName("Nguyễn Văn A");

        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.findOrCreateCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(200);
        assertThat(result.getFullName()).isEqualTo("Nguyễn Văn A");
        verify(customerRepository, never()).findByPhoneIgnoreCase(anyString());
        verify(customerRepository).save(any());
    }

    @Test
    void findOrCreateCustomer_whenPhoneIsBlank_shouldCreateNew() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone("   ");
        request.setFullName("Nguyễn Văn A");

        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.findOrCreateCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(200);
        verify(customerRepository, never()).findByPhoneIgnoreCase(anyString());
        verify(customerRepository).save(any());
    }

    @Test
    void findOrCreateCustomer_whenExistingCustomerNoChanges_shouldNotUpdate() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone("0912345678");
        request.setFullName("Nguyễn Văn A");
        request.setEmail("test@example.com");

        Customers existingCustomer = new Customers();
        existingCustomer.setId(100);
        existingCustomer.setPhone("0912345678");
        existingCustomer.setFullName("Nguyễn Văn A");
        existingCustomer.setEmail("test@example.com");

        when(customerRepository.findByPhoneIgnoreCase("0912345678"))
                .thenReturn(Optional.of(existingCustomer));

        // When
        Customers result = customerService.findOrCreateCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100);
        verify(customerRepository).findByPhoneIgnoreCase("0912345678");
        verify(customerRepository, never()).save(any());
    }

    @Test
    void findOrCreateCustomer_whenWithCreatedByEmployee_shouldSetCreatedBy() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setPhone("0912345678");
        request.setFullName("Nguyễn Văn A");

        Employees employee = new Employees();
        employee.setEmployeeId(1);

        when(customerRepository.findByPhoneIgnoreCase("0912345678"))
                .thenReturn(Optional.empty());
        when(employeeRepository.findById(1)).thenReturn(Optional.of(employee));
        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.findOrCreateCustomer(request, 1);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCreatedBy()).isNotNull();
        assertThat(result.getCreatedBy().getEmployeeId()).isEqualTo(1);
        verify(employeeRepository).findById(1);
    }

    // ==================== findByPhone() Tests ====================

    @Test
    void findByPhone_whenCustomerExists_shouldReturnCustomer() {
        // Given
        String phone = "0912345678";
        Customers customer = new Customers();
        customer.setId(100);
        customer.setPhone(phone);
        customer.setFullName("Nguyễn Văn A");

        when(customerRepository.findByPhoneIgnoreCase(phone))
                .thenReturn(Optional.of(customer));

        // When
        Customers result = customerService.findByPhone(phone);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100);
        assertThat(result.getPhone()).isEqualTo(phone);
        verify(customerRepository).findByPhoneIgnoreCase(phone);
    }

    @Test
    void findByPhone_whenCustomerNotExists_shouldReturnNull() {
        // Given
        String phone = "0912345678";

        when(customerRepository.findByPhoneIgnoreCase(phone))
                .thenReturn(Optional.empty());

        // When
        Customers result = customerService.findByPhone(phone);

        // Then
        assertThat(result).isNull();
        verify(customerRepository).findByPhoneIgnoreCase(phone);
    }

    @Test
    void findByPhone_whenCaseInsensitive_shouldFindCustomer() {
        // Given
        String phone = "0912345678";
        Customers customer = new Customers();
        customer.setId(100);
        customer.setPhone("0912345678");

        when(customerRepository.findByPhoneIgnoreCase(phone))
                .thenReturn(Optional.of(customer));

        // When
        Customers result = customerService.findByPhone(phone);

        // Then
        assertThat(result).isNotNull();
        verify(customerRepository).findByPhoneIgnoreCase(phone);
    }

    // ==================== createCustomer() Tests ====================

    @Test
    void createCustomer_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Nguyễn Văn A");
        request.setPhone("0912345678");
        request.setEmail("test@example.com");
        request.setAddress("123 Đường ABC");
        request.setNote("Khách hàng VIP");

        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.createCustomer(request, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(200);
        assertThat(result.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(result.getPhone()).isEqualTo("0912345678");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getAddress()).isEqualTo("123 Đường ABC");
        assertThat(result.getNote()).isEqualTo("Khách hàng VIP");
        assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
        verify(customerRepository).save(any());
    }

    @Test
    void createCustomer_whenWithCreatedByEmployee_shouldSetCreatedBy() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Nguyễn Văn A");
        request.setPhone("0912345678");

        Employees employee = new Employees();
        employee.setEmployeeId(1);

        when(employeeRepository.findById(1)).thenReturn(Optional.of(employee));
        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.createCustomer(request, 1);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCreatedBy()).isNotNull();
        assertThat(result.getCreatedBy().getEmployeeId()).isEqualTo(1);
        verify(employeeRepository).findById(1);
    }

    @Test
    void createCustomer_whenEmployeeNotFound_shouldCreateWithoutCreatedBy() {
        // Given
        CustomerRequest request = new CustomerRequest();
        request.setFullName("Nguyễn Văn A");
        request.setPhone("0912345678");

        when(employeeRepository.findById(999)).thenReturn(Optional.empty());
        when(customerRepository.save(any())).thenAnswer(inv -> {
            Customers customer = inv.getArgument(0);
            customer.setId(200);
            return customer;
        });

        // When
        Customers result = customerService.createCustomer(request, 999);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCreatedBy()).isNull();
        verify(employeeRepository).findById(999);
    }

    // ==================== toResponse() Tests ====================

    @Test
    void toResponse_whenValidCustomer_shouldMapCorrectly() {
        // Given
        Customers customer = new Customers();
        customer.setId(100);
        customer.setFullName("Nguyễn Văn A");
        customer.setPhone("0912345678");
        customer.setEmail("test@example.com");
        customer.setAddress("123 Đường ABC");
        customer.setNote("Note");
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedAt(Instant.now());

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(100);
        assertThat(response.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(response.getPhone()).isEqualTo("0912345678");
        assertThat(response.getEmail()).isEqualTo("test@example.com");
        assertThat(response.getAddress()).isEqualTo("123 Đường ABC");
        assertThat(response.getNote()).isEqualTo("Note");
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void toResponse_whenCustomerIsNull_shouldReturnNull() {
        // When
        CustomerResponse response = customerService.toResponse(null);

        // Then
        assertThat(response).isNull();
    }

    @Test
    void toResponse_whenCustomerWithBranch_shouldIncludeBranchInfo() {
        // Given
        Customers customer = new Customers();
        customer.setId(100);
        customer.setFullName("Nguyễn Văn A");

        Employees employee = new Employees();
        employee.setEmployeeId(1);
        Branches branch = new Branches();
        branch.setId(10);
        branch.setBranchName("Chi nhánh Hà Nội");
        employee.setBranch(branch);
        customer.setCreatedBy(employee);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getBranchId()).isEqualTo(10);
        assertThat(response.getBranchName()).isEqualTo("Chi nhánh Hà Nội");
    }

    @Test
    void toResponse_whenCustomerWithoutBranch_shouldNotIncludeBranchInfo() {
        // Given
        Customers customer = new Customers();
        customer.setId(100);
        customer.setFullName("Nguyễn Văn A");
        customer.setStatus(CustomerStatus.ACTIVE);

        // When
        CustomerResponse response = customerService.toResponse(customer);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getBranchId()).isNull();
        assertThat(response.getBranchName()).isNull();
    }

    // ==================== listCustomers() Tests ====================

    @Test
    void listCustomers_whenNoFilters_shouldReturnAllCustomers() {
        // Given
        Customers customer1 = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        Customers customer2 = createTestCustomer(101, "Trần Thị B", "0987654321");
        List<Customers> customers = List.of(customer1, customer2);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 2);

        when(customerRepository.findWithFilters(null, null, null, null, pageable))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, null, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent().size()).isEqualTo(2);
        verify(customerRepository).findWithFilters(null, null, null, null, pageable);
    }

    @Test
    void listCustomers_whenWithKeyword_shouldFilterByKeyword() {
        // Given
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(customerRepository.findWithFilters(eq("Nguyễn"), any(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers("Nguyễn", null, null, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(customerRepository).findWithFilters(eq("Nguyễn"), any(), any(), any(), any());
    }

    @Test
    void listCustomers_whenWithBranchId_shouldFilterByBranch() {
        // Given
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(customerRepository.findWithFilters(any(), eq(10), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, 10, null, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(customerRepository).findWithFilters(any(), eq(10), any(), any(), any());
    }

    @Test
    void listCustomers_whenWithDateRange_shouldFilterByDates() {
        // Given
        LocalDate fromDate = LocalDate.of(2025, 1, 1);
        LocalDate toDate = LocalDate.of(2025, 1, 31);
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(customerRepository.findWithFilters(any(), any(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, null, fromDate, toDate, 0, 10);

        // Then
        assertThat(result).isNotNull();
        verify(customerRepository).findWithFilters(any(), any(), any(), any(), any());
    }

    @Test
    void listCustomers_whenManagerUser_shouldAutoFilterByBranch() {
        // Given
        Integer userId = 100;
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        Employees employee = new Employees();
        employee.setEmployeeId(1);
        Branches branch = new Branches();
        branch.setId(10);
        branch.setBranchName("Chi nhánh Hà Nội");
        employee.setBranch(branch);

        Users user = new Users();
        user.setId(userId);
        Roles role = new Roles();
        role.setRoleName("MANAGER");
        user.setRole(role);
        employee.setUser(user);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));
        when(customerRepository.findWithFilters(any(), eq(10), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, userId, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(employeeRepository).findByUserId(userId);
        verify(customerRepository).findWithFilters(any(), eq(10), any(), any(), any());
    }

    @Test
    void listCustomers_whenNonManagerUser_shouldNotAutoFilter() {
        // Given
        Integer userId = 100;
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        Employees employee = new Employees();
        employee.setEmployeeId(1);
        Branches branch = new Branches();
        branch.setId(10);
        employee.setBranch(branch);

        Users user = new Users();
        user.setId(userId);
        Roles role = new Roles();
        role.setRoleName("CONSULTANT"); // Not MANAGER
        user.setRole(role);
        employee.setUser(user);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));
        when(customerRepository.findWithFilters(any(), isNull(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, userId, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        verify(employeeRepository).findByUserId(userId);
        verify(customerRepository).findWithFilters(any(), isNull(), any(), any(), any());
    }

    @Test
    void listCustomers_whenUserNotFound_shouldNotAutoFilter() {
        // Given
        Integer userId = 999;
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 1);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(customerRepository.findWithFilters(any(), isNull(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, userId, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        verify(employeeRepository).findByUserId(userId);
        verify(customerRepository).findWithFilters(any(), isNull(), any(), any(), any());
    }

    @Test
    void listCustomers_whenEmptyResult_shouldReturnEmptyPage() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(customerRepository.findWithFilters(any(), any(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, null, null, null, 0, 10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(0);
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void listCustomers_whenWithPagination_shouldReturnCorrectPage() {
        // Given
        Customers customer = createTestCustomer(100, "Nguyễn Văn A", "0912345678");
        List<Customers> customers = List.of(customer);

        PageRequest pageable = PageRequest.of(1, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Customers> customersPage = new PageImpl<>(customers, pageable, 10);

        when(customerRepository.findWithFilters(any(), any(), any(), any(), any()))
                .thenReturn(customersPage);

        // When
        Page<CustomerResponse> result = customerService.listCustomers(null, null, null, null, null, 1, 5);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(5);
        assertThat(result.getTotalElements()).isEqualTo(10);
    }

    // ==================== Helper Methods ====================

    private Customers createTestCustomer(Integer id, String fullName, String phone) {
        Customers customer = new Customers();
        customer.setId(id);
        customer.setFullName(fullName);
        customer.setPhone(phone);
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedAt(Instant.now());
        return customer;
    }
}


