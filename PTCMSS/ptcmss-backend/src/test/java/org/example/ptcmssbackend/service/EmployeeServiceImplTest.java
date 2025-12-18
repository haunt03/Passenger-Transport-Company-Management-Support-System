package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Employee.CreateEmployeeRequest;
import org.example.ptcmssbackend.dto.request.Employee.UpdateEmployeeRequest;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.EmployeeServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UsersRepository usersRepository;
    @Mock
    private BranchesRepository branchesRepository;
    @Mock
    private RolesRepository rolesRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    // ==================== findAll() Tests ====================

    @Test
    void findAll_whenEmployeesExist_shouldReturnAllEmployees() {
        // Given
        Employees employee1 = createTestEmployee(1, 100, 10, 1);
        Employees employee2 = createTestEmployee(2, 101, 10, 2);
        List<Employees> employees = List.of(employee1, employee2);

        when(employeeRepository.findAll()).thenReturn(employees);

        // When
        List<Employees> result = employeeService.findAll();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(employeeRepository).findAll();
    }

    @Test
    void findAll_whenNoEmployees_shouldReturnEmptyList() {
        // Given
        when(employeeRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<Employees> result = employeeService.findAll();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
        verify(employeeRepository).findAll();
    }

    // ==================== findById() Tests ====================

    @Test
    void findById_whenEmployeeExists_shouldReturnEmployee() {
        // Given
        Integer employeeId = 1;
        Employees employee = createTestEmployee(employeeId, 100, 10, 1);

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.of(employee));

        // When
        Employees result = employeeService.findById(employeeId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        verify(employeeRepository).findByIdWithDetails(employeeId);
    }

    @Test
    void findById_whenEmployeeNotExists_shouldReturnNull() {
        // Given
        Integer employeeId = 999;

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.empty());

        // When
        Employees result = employeeService.findById(employeeId);

        // Then
        assertThat(result).isNull();
        verify(employeeRepository).findByIdWithDetails(employeeId);
    }

    // ==================== save() Tests ====================

    @Test
    void save_whenValidEmployee_shouldSaveSuccessfully() {
        // Given
        Employees employee = createTestEmployee(1, 100, 10, 1);

        when(employeeRepository.save(employee)).thenAnswer(inv -> inv.getArgument(0));

        // When
        Employees result = employeeService.save(employee);

        // Then
        assertThat(result).isNotNull();
        verify(employeeRepository).save(employee);
    }

    // ==================== delete() Tests ====================

    @Test
    void delete_whenValidEmployee_shouldDeleteSuccessfully() {
        // Given
        Employees employee = createTestEmployee(1, 100, 10, 1);
        doNothing().when(employeeRepository).delete(employee);

        // When
        employeeService.delete(employee);

        // Then
        verify(employeeRepository).delete(employee);
    }

    // ==================== findByRoleName() Tests ====================

    @Test
    void findByRoleName_whenEmployeesExist_shouldReturnEmployees() {
        // Given
        String roleName = "CONSULTANT";
        Employees employee1 = createTestEmployee(1, 100, 10, 1);
        Employees employee2 = createTestEmployee(2, 101, 10, 1);
        List<Employees> employees = List.of(employee1, employee2);

        when(employeeRepository.findByRoleName(roleName)).thenReturn(employees);

        // When
        List<Employees> result = employeeService.findByRoleName(roleName);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(employeeRepository).findByRoleName(roleName);
    }

    @Test
    void findByRoleName_whenNoEmployees_shouldReturnEmptyList() {
        // Given
        String roleName = "ADMIN";

        when(employeeRepository.findByRoleName(roleName)).thenReturn(Collections.emptyList());

        // When
        List<Employees> result = employeeService.findByRoleName(roleName);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
        verify(employeeRepository).findByRoleName(roleName);
    }

    // ==================== findByBranchId() Tests ====================

    @Test
    void findByBranchId_whenEmployeesExist_shouldReturnEmployees() {
        // Given
        Integer branchId = 10;
        Employees employee1 = createTestEmployee(1, 100, branchId, 1);
        Employees employee2 = createTestEmployee(2, 101, branchId, 2);
        List<Employees> employees = List.of(employee1, employee2);

        when(employeeRepository.findByBranchId(branchId)).thenReturn(employees);

        // When
        List<Employees> result = employeeService.findByBranchId(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(employeeRepository).findByBranchId(branchId);
    }

    // ==================== createEmployee() Tests ====================

    @Test
    void createEmployee_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(100);
        request.setBranchId(10);
        request.setRoleId(1);
        request.setStatus("ACTIVE");

        Users user = createTestUser(100);
        Branches branch = createTestBranch(10);
        Roles role = createTestRole(1, "CONSULTANT");

        when(usersRepository.findById(100)).thenReturn(Optional.of(user));
        when(branchesRepository.findById(10)).thenReturn(Optional.of(branch));
        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(employeeRepository.existsByUser_Id(100)).thenReturn(false);
        when(employeeRepository.save(any())).thenAnswer(inv -> {
            Employees emp = inv.getArgument(0);
            emp.setEmployeeId(1);
            return emp;
        });

        // When
        Employees result = employeeService.createEmployee(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeId()).isEqualTo(1);
        assertThat(result.getUser()).isEqualTo(user);
        assertThat(result.getBranch()).isEqualTo(branch);
        assertThat(result.getRole()).isEqualTo(role);
        assertThat(result.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
        verify(employeeRepository).save(any());
    }

    @Test
    void createEmployee_whenUserNotFound_shouldThrowException() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(999);
        request.setBranchId(10);
        request.setRoleId(1);

        when(usersRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }

    @Test
    void createEmployee_whenBranchNotFound_shouldThrowException() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(100);
        request.setBranchId(999);
        request.setRoleId(1);

        Users user = createTestUser(100);

        when(usersRepository.findById(100)).thenReturn(Optional.of(user));
        when(branchesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void createEmployee_whenRoleNotFound_shouldThrowException() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(100);
        request.setBranchId(10);
        request.setRoleId(999);

        Users user = createTestUser(100);
        Branches branch = createTestBranch(10);

        when(usersRepository.findById(100)).thenReturn(Optional.of(user));
        when(branchesRepository.findById(10)).thenReturn(Optional.of(branch));
        when(rolesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy vai trò");
    }

    @Test
    void createEmployee_whenUserAlreadyEmployee_shouldThrowException() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(100);
        request.setBranchId(10);
        request.setRoleId(1);

        Users user = createTestUser(100);
        Branches branch = createTestBranch(10);
        Roles role = createTestRole(1, "CONSULTANT");

        when(usersRepository.findById(100)).thenReturn(Optional.of(user));
        when(branchesRepository.findById(10)).thenReturn(Optional.of(branch));
        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(employeeRepository.existsByUser_Id(100)).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> employeeService.createEmployee(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đã là nhân viên");
    }

    @Test
    void createEmployee_whenStatusNotProvided_shouldSetDefaultActive() {
        // Given
        CreateEmployeeRequest request = new CreateEmployeeRequest();
        request.setUserId(100);
        request.setBranchId(10);
        request.setRoleId(1);
        request.setStatus(null); // No status provided

        Users user = createTestUser(100);
        Branches branch = createTestBranch(10);
        Roles role = createTestRole(1, "CONSULTANT");

        when(usersRepository.findById(100)).thenReturn(Optional.of(user));
        when(branchesRepository.findById(10)).thenReturn(Optional.of(branch));
        when(rolesRepository.findById(1)).thenReturn(Optional.of(role));
        when(employeeRepository.existsByUser_Id(100)).thenReturn(false);
        when(employeeRepository.save(any())).thenAnswer(inv -> {
            Employees emp = inv.getArgument(0);
            emp.setEmployeeId(1);
            return emp;
        });

        // When
        Employees result = employeeService.createEmployee(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(EmployeeStatus.ACTIVE);
    }

    // ==================== updateEmployee() Tests ====================

    @Test
    void updateEmployee_whenValidRequest_shouldUpdateSuccessfully() {
        // Given
        Integer employeeId = 1;
        UpdateEmployeeRequest request = new UpdateEmployeeRequest();
        request.setBranchId(20);
        request.setRoleId(2);
        request.setStatus("INACTIVE");
        request.setFullName("Nguyễn Văn B");
        request.setEmail("newemail@example.com");
        request.setPhone("0987654321");

        Employees existingEmployee = createTestEmployee(employeeId, 100, 10, 1);
        Users user = existingEmployee.getUser();
        user.setEmail("old@example.com");
        user.setPhone("0912345678");

        Branches newBranch = createTestBranch(20);
        Roles newRole = createTestRole(2, "COORDINATOR");

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.of(existingEmployee));
        when(branchesRepository.findById(20)).thenReturn(Optional.of(newBranch));
        when(rolesRepository.findById(2)).thenReturn(Optional.of(newRole));
        when(usersRepository.findByEmail("newemail@example.com")).thenReturn(Optional.empty());
        when(usersRepository.findByPhone("0987654321")).thenReturn(Optional.empty());
        when(usersRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Employees result = employeeService.updateEmployee(employeeId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBranch().getId()).isEqualTo(20);
        assertThat(result.getRole().getId()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(EmployeeStatus.INACTIVE);
        assertThat(result.getUser().getFullName()).isEqualTo("Nguyễn Văn B");
        assertThat(result.getUser().getEmail()).isEqualTo("newemail@example.com");
        assertThat(result.getUser().getPhone()).isEqualTo("0987654321");
        verify(employeeRepository).save(any());
        verify(usersRepository).save(any());
    }

    @Test
    void updateEmployee_whenEmployeeNotFound_shouldThrowException() {
        // Given
        Integer employeeId = 999;
        UpdateEmployeeRequest request = new UpdateEmployeeRequest();

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(employeeId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy nhân viên");
    }

    @Test
    void updateEmployee_whenEmailAlreadyExists_shouldThrowException() {
        // Given
        Integer employeeId = 1;
        UpdateEmployeeRequest request = new UpdateEmployeeRequest();
        request.setEmail("existing@example.com");

        Employees existingEmployee = createTestEmployee(employeeId, 100, 10, 1);
        Users existingUser = createTestUser(200); // Different user with same email

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Test Branch");

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.of(existingEmployee));
        when(branchesRepository.findById(anyInt())).thenReturn(Optional.of(branch));
        when(usersRepository.findByEmail("existing@example.com"))
                .thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(employeeId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email đã tồn tại");
    }

    @Test
    void updateEmployee_whenPhoneAlreadyExists_shouldThrowException() {
        // Given
        Integer employeeId = 1;
        UpdateEmployeeRequest request = new UpdateEmployeeRequest();
        request.setPhone("0987654321");

        Employees existingEmployee = createTestEmployee(employeeId, 100, 10, 1);
        Users existingUser = createTestUser(200); // Different user with same phone

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Test Branch");

        when(employeeRepository.findByIdWithDetails(employeeId))
                .thenReturn(Optional.of(existingEmployee));
        when(branchesRepository.findById(anyInt())).thenReturn(Optional.of(branch));
        when(usersRepository.findByPhone("0987654321"))
                .thenReturn(Optional.of(existingUser));

        // When & Then
        assertThatThrownBy(() -> employeeService.updateEmployee(employeeId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Số điện thoại đã tồn tại");
    }

    // ==================== findByUserId() Tests ====================

    @Test
    void findByUserId_whenEmployeeExists_shouldReturnEmployee() {
        // Given
        Integer userId = 100;
        Employees employee = createTestEmployee(1, userId, 10, 1);

        when(employeeRepository.findByUserId(userId))
                .thenReturn(Optional.of(employee));

        // When
        Employees result = employeeService.findByUserId(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUser().getId()).isEqualTo(userId);
        verify(employeeRepository).findByUserId(userId);
    }

    @Test
    void findByUserId_whenEmployeeNotExists_shouldReturnNull() {
        // Given
        Integer userId = 999;

        when(employeeRepository.findByUserId(userId))
                .thenReturn(Optional.empty());

        // When
        Employees result = employeeService.findByUserId(userId);

        // Then
        assertThat(result).isNull();
        verify(employeeRepository).findByUserId(userId);
    }

    // ==================== findAvailableManagers() Tests ====================

    @Test
    void findAvailableManagers_whenManagersExist_shouldReturnAvailable() {
        // Given
        Employees manager1 = createTestEmployee(1, 100, 10, 1);
        Employees manager2 = createTestEmployee(2, 101, 20, 1);
        List<Employees> allManagers = List.of(manager1, manager2);

        Branches branch1 = createTestBranch(10);
        Branches branch2 = createTestBranch(20);
        List<Branches> branches = List.of(branch1, branch2);

        // manager1 is assigned to branch1, manager2 is not assigned
        branch1.setManager(manager1);

        when(employeeRepository.findByRoleName("Manager")).thenReturn(allManagers);
        when(branchesRepository.findAll()).thenReturn(branches);

        // When
        List<Employees> result = employeeService.findAvailableManagers(null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
        assertThat(result.get(0).getEmployeeId()).isEqualTo(2); // manager2 is available
        verify(employeeRepository).findByRoleName("Manager");
        verify(branchesRepository).findAll();
    }

    @Test
    void findAvailableManagers_whenExcludeBranchId_shouldExcludeCorrectly() {
        // Given
        Employees manager1 = createTestEmployee(1, 100, 10, 1);
        List<Employees> allManagers = List.of(manager1);

        Branches branch1 = createTestBranch(10);
        branch1.setManager(manager1);
        List<Branches> branches = List.of(branch1);

        when(employeeRepository.findByRoleName("Manager")).thenReturn(allManagers);
        when(branchesRepository.findAll()).thenReturn(branches);

        // When - exclude branch1, so manager1 should be available
        List<Employees> result = employeeService.findAvailableManagers(10);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
        assertThat(result.get(0).getEmployeeId()).isEqualTo(1);
    }

    // ==================== Helper Methods ====================

    private Employees createTestEmployee(Integer employeeId, Integer userId, Integer branchId, Integer roleId) {
        Employees emp = new Employees();
        emp.setEmployeeId(employeeId);
        emp.setUser(createTestUser(userId));
        emp.setBranch(createTestBranch(branchId));
        emp.setRole(createTestRole(roleId, "CONSULTANT"));
        emp.setStatus(EmployeeStatus.ACTIVE);
        return emp;
    }

    private Users createTestUser(Integer userId) {
        Users user = new Users();
        user.setId(userId);
        user.setUsername("user" + userId);
        user.setFullName("User " + userId);
        user.setEmail("user" + userId + "@example.com");
        user.setPhone("091234567" + userId);
        return user;
    }

    private Branches createTestBranch(Integer branchId) {
        Branches branch = new Branches();
        branch.setId(branchId);
        branch.setBranchName("Chi nhánh " + branchId);
        return branch;
    }

    private Roles createTestRole(Integer roleId, String roleName) {
        Roles role = new Roles();
        role.setId(roleId);
        role.setRoleName(roleName);
        return role;
    }
}

