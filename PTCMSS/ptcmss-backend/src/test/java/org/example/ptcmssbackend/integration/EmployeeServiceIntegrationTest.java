package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeRequest;
import org.example.ptcmssbackend.dto.request.Employee.UpdateEmployeeRequest;
import org.example.ptcmssbackend.entity.Branches;
import org.example.ptcmssbackend.entity.Employees;
import org.example.ptcmssbackend.entity.Roles;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.enums.UserStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.RolesRepository;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.EmployeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeServiceIntegrationTest {

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private BranchesRepository branchesRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private RolesRepository rolesRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Branches testBranch;
    private Roles testRole;

    @BeforeEach
    void setUp() {
        // Create test branch
        testBranch = new Branches();
        testBranch.setBranchName("Chi nhánh Test");
        testBranch.setLocation("123 Test Street");
        testBranch.setStatus(BranchStatus.ACTIVE);
        testBranch = branchesRepository.save(testBranch);

        // Create test role
        testRole = new Roles();
        testRole.setRoleName("CONSULTANT");
        testRole.setDescription("Consultant Role");
        testRole = rolesRepository.save(testRole);
    }

    @Test
    void createEmployee_shouldCreateEmployeeSuccessfully() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");

        // When
        Employees result = employeeService.createEmployee(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isNotNull();
        assertThat(result.getUser().getId()).isEqualTo(user.getId());
        assertThat(result.getBranch().getId()).isEqualTo(testBranch.getId());
        assertThat(result.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
    }

    @Test
    void createEmployee_withInvalidUserId_shouldThrowException() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(99999); // Invalid user ID
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void findAll_shouldReturnAllEmployees() {
        // Given
        Users user1 = new Users();
        user1.setFullName("Employee 1");
        user1.setUsername("employee1");
        user1.setEmail("emp1@example.com");
        user1.setPhone("0111111111");
        user1.setPasswordHash(passwordEncoder.encode("password123"));
        user1.setStatus(UserStatus.ACTIVE);
        user1.setRole(testRole);
        user1 = usersRepository.save(user1);

        Users user2 = new Users();
        user2.setFullName("Employee 2");
        user2.setUsername("employee2");
        user2.setEmail("emp2@example.com");
        user2.setPhone("0222222222");
        user2.setPasswordHash(passwordEncoder.encode("password123"));
        user2.setStatus(UserStatus.ACTIVE);
        user2.setRole(testRole);
        user2 = usersRepository.save(user2);

        CreateEmployeeRequest request1 = new CreateEmployeeRequest();
        request1.setUserId(user1.getId());
        request1.setBranchId(testBranch.getId());
        request1.setRoleId(testRole.getId());
        request1.setStatus("ACTIVE");
        employeeService.createEmployee(request1);

        CreateEmployeeRequest request2 = new CreateEmployeeRequest();
        request2.setUserId(user2.getId());
        request2.setBranchId(testBranch.getId());
        request2.setRoleId(testRole.getId());
        request2.setStatus("ACTIVE");
        employeeService.createEmployee(request2);

        // When
        List<Employees> result = employeeService.findAll();

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void findById_shouldReturnEmployee() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(request);

        // When
        Employees result = employeeService.findById(created.getEmployeeId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(created.getEmployeeId());
        assertThat(result.getUser().getFullName()).isEqualTo("Test Employee");
    }

    @Test
    void findById_withInvalidId_shouldReturnNull() {
        // When
        Employees result = employeeService.findById(99999);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void findByBranchId_shouldReturnEmployeesInBranch() {
        // Given
        Users user1 = new Users();
        user1.setFullName("Employee 1");
        user1.setUsername("employee1");
        user1.setEmail("emp1@example.com");
        user1.setPhone("0111111111");
        user1.setPasswordHash(passwordEncoder.encode("password123"));
        user1.setStatus(UserStatus.ACTIVE);
        user1.setRole(testRole);
        user1 = usersRepository.save(user1);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user1.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");
        employeeService.createEmployee(request);

        // When
        List<Employees> result = employeeService.findByBranchId(testBranch.getId());

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void updateEmployee_shouldUpdateEmployeeSuccessfully() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest createRequest = new CreateEmployeeRequest();
        createRequest.setUserId(user.getId());
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRoleId(testRole.getId());
        createRequest.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(createRequest);

        UpdateEmployeeRequest updateRequest = new UpdateEmployeeRequest();
        updateRequest.setBranchId(testBranch.getId());
        updateRequest.setRoleId(testRole.getId());
        updateRequest.setStatus("INACTIVE");
        updateRequest.setFullName("Updated Employee");
        updateRequest.setEmail("updated@example.com");
        updateRequest.setPhone("0999999999");

        // When
        Employees result = employeeService.updateEmployee(created.getEmployeeId(), updateRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(EmployeeStatus.INACTIVE);
        assertThat(result.getUser().getFullName()).isEqualTo("Updated Employee");
        assertThat(result.getUser().getEmail()).isEqualTo("updated@example.com");
    }

    @Test
    void findByRoleName_shouldReturnEmployeesWithRole() {
        // Given
        Roles driverRole = new Roles();
        driverRole.setRoleName("DRIVER");
        driverRole.setDescription("Driver Role");
        driverRole = rolesRepository.save(driverRole);

        Users user = new Users();
        user.setFullName("Driver Employee");
        user.setUsername("driver");
        user.setEmail("driver@example.com");
        user.setPhone("0888888888");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(driverRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(driverRole.getId());
        request.setStatus("ACTIVE");
        employeeService.createEmployee(request);

        // When
        List<Employees> result = employeeService.findByRoleName("DRIVER");

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void delete_shouldDeleteEmployee() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(request);

        // When
        employeeService.delete(created);

        // Then
        Employees result = employeeService.findById(created.getEmployeeId());
        assertThat(result).isNull();
    }

    @Test
    void findByUserId_shouldReturnEmployee() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(user.getId());
        request.setBranchId(testBranch.getId());
        request.setRoleId(testRole.getId());
        request.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(request);

        // When
        Employees result = employeeService.findByUserId(user.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(created.getEmployeeId());
        assertThat(result.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void findByUserId_withInvalidUserId_shouldReturnNull() {
        // When
        Employees result = employeeService.findByUserId(99999);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void findAvailableManagers_shouldReturnManagersWithoutBranch() {
        // Given
        Roles managerRole = new Roles();
        managerRole.setRoleName("MANAGER");
        managerRole.setDescription("Manager Role");
        managerRole = rolesRepository.save(managerRole);

        Users managerUser1 = new Users();
        managerUser1.setFullName("Available Manager 1");
        managerUser1.setUsername("availmanager1");
        managerUser1.setEmail("avail1@example.com");
        managerUser1.setPhone("0111111111");
        managerUser1.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser1.setStatus(UserStatus.ACTIVE);
        managerUser1.setRole(managerRole);
        Users savedManagerUser1 = usersRepository.save(managerUser1);

        Users managerUser2 = new Users();
        managerUser2.setFullName("Assigned Manager");
        managerUser2.setUsername("assignedmanager");
        managerUser2.setEmail("assigned@example.com");
        managerUser2.setPhone("0222222222");
        managerUser2.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser2.setStatus(UserStatus.ACTIVE);
        managerUser2.setRole(managerRole);
        Users savedManagerUser2 = usersRepository.save(managerUser2);

        // Create available manager (no branch assigned)
        CreateEmployeeRequest availableRequest = new CreateEmployeeRequest();
        availableRequest.setUserId(savedManagerUser1.getId());
        availableRequest.setBranchId(null);
        availableRequest.setRoleId(managerRole.getId());
        availableRequest.setStatus("ACTIVE");
        Employees availableManager = new Employees();
        availableManager.setUser(savedManagerUser1);
        availableManager.setBranch(null);
        availableManager.setRole(managerRole);
        availableManager.setStatus(EmployeeStatus.ACTIVE);
        employeeRepository.save(availableManager);

        // Create assigned manager (with branch)
        CreateEmployeeRequest assignedRequest = new CreateEmployeeRequest();
        assignedRequest.setUserId(savedManagerUser2.getId());
        assignedRequest.setBranchId(testBranch.getId());
        assignedRequest.setRoleId(managerRole.getId());
        assignedRequest.setStatus("ACTIVE");
        employeeService.createEmployee(assignedRequest);

        // When
        List<Employees> result = employeeService.findAvailableManagers(null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(e -> e.getUser().getId().equals(savedManagerUser1.getId()));
        assertThat(result).noneMatch(e -> e.getUser().getId().equals(savedManagerUser2.getId()));
    }

    @Test
    void findAvailableManagers_withExcludeBranchId_shouldExcludeCurrentBranch() {
        // Given
        Roles managerRole = new Roles();
        managerRole.setRoleName("MANAGER");
        managerRole.setDescription("Manager Role");
        managerRole = rolesRepository.save(managerRole);

        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("Another Location");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        Branches savedAnotherBranch = branchesRepository.save(anotherBranch);

        Users managerUser1 = new Users();
        managerUser1.setFullName("Manager 1");
        managerUser1.setUsername("manager1");
        managerUser1.setEmail("mgr1@example.com");
        managerUser1.setPhone("0111111111");
        managerUser1.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser1.setStatus(UserStatus.ACTIVE);
        managerUser1.setRole(managerRole);
        Users savedManagerUser1 = usersRepository.save(managerUser1);

        Users managerUser2 = new Users();
        managerUser2.setFullName("Manager 2");
        managerUser2.setUsername("manager2");
        managerUser2.setEmail("mgr2@example.com");
        managerUser2.setPhone("0222222222");
        managerUser2.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser2.setStatus(UserStatus.ACTIVE);
        managerUser2.setRole(managerRole);
        Users savedManagerUser2 = usersRepository.save(managerUser2);

        // Manager assigned to testBranch
        CreateEmployeeRequest request1 = new CreateEmployeeRequest();
        request1.setUserId(savedManagerUser1.getId());
        request1.setBranchId(testBranch.getId());
        request1.setRoleId(managerRole.getId());
        request1.setStatus("ACTIVE");
        employeeService.createEmployee(request1);

        // Manager assigned to anotherBranch
        CreateEmployeeRequest request2 = new CreateEmployeeRequest();
        request2.setUserId(savedManagerUser2.getId());
        request2.setBranchId(savedAnotherBranch.getId());
        request2.setRoleId(managerRole.getId());
        request2.setStatus("ACTIVE");
        employeeService.createEmployee(request2);

        // When - exclude testBranch
        List<Employees> result = employeeService.findAvailableManagers(testBranch.getId());

        // Then - should include manager from anotherBranch
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(e -> e.getUser().getId().equals(savedManagerUser2.getId()));
    }

    @Test
    void save_shouldSaveEmployee() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        Employees employee = new Employees();
        employee.setUser(user);
        employee.setBranch(testBranch);
        employee.setRole(testRole);
        employee.setStatus(EmployeeStatus.ACTIVE);

        // When
        Employees result = employeeService.save(employee);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isNotNull();
        assertThat(result.getUser().getId()).isEqualTo(user.getId());
        assertThat(result.getBranch().getId()).isEqualTo(testBranch.getId());
    }

    @Test
    void createEmployee_withDuplicateUserId_shouldThrowException() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest request1 = new CreateEmployeeRequest();
        request1.setUserId(user.getId());
        request1.setBranchId(testBranch.getId());
        request1.setRoleId(testRole.getId());
        request1.setStatus("ACTIVE");
        employeeService.createEmployee(request1);

        CreateEmployeeRequest request2 = new CreateEmployeeRequest();
        request2.setUserId(user.getId());
        request2.setBranchId(testBranch.getId());
        request2.setRoleId(testRole.getId());
        request2.setStatus("ACTIVE");

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request2))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Người dùng này đã là nhân viên");
    }

    @Test
    void updateEmployee_withInvalidBranchId_shouldThrowException() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest createRequest = new CreateEmployeeRequest();
        createRequest.setUserId(user.getId());
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRoleId(testRole.getId());
        createRequest.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(createRequest);

        UpdateEmployeeRequest updateRequest = new UpdateEmployeeRequest();
        updateRequest.setBranchId(99999); // Invalid branch ID
        updateRequest.setRoleId(testRole.getId());
        updateRequest.setStatus("ACTIVE");

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(created.getEmployeeId(), updateRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void updateEmployee_withInvalidRoleId_shouldThrowException() {
        // Given
        Users user = new Users();
        user.setFullName("Test Employee");
        user.setUsername("testemployee");
        user.setEmail("employee@example.com");
        user.setPhone("0987654321");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(testRole);
        user = usersRepository.save(user);

        CreateEmployeeRequest createRequest = new CreateEmployeeRequest();
        createRequest.setUserId(user.getId());
        createRequest.setBranchId(testBranch.getId());
        createRequest.setRoleId(testRole.getId());
        createRequest.setStatus("ACTIVE");
        Employees created = employeeService.createEmployee(createRequest);

        UpdateEmployeeRequest updateRequest = new UpdateEmployeeRequest();
        updateRequest.setBranchId(testBranch.getId());
        updateRequest.setRoleId(99999); // Invalid role ID
        updateRequest.setStatus("ACTIVE");

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(created.getEmployeeId(), updateRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
    }
}
