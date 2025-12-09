package org.example.ptcmssbackend.integration;

import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.dto.response.Branch.ManagerDashboardStatsResponse;
import org.example.ptcmssbackend.dto.response.common.PageResponse;
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
import org.example.ptcmssbackend.service.BranchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BranchServiceIntegrationTest {

    @Autowired
    private BranchService branchService;

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

    private Roles managerRole;
    private Roles consultantRole;
    private Users managerUser;
    private Employees managerEmployee;
    private Branches existingBranch;

    @BeforeEach
    void setUp() {
        // Create manager role
        managerRole = new Roles();
        managerRole.setRoleName("MANAGER");
        managerRole.setDescription("Manager Role");
        managerRole = rolesRepository.save(managerRole);

        // Create consultant role
        consultantRole = new Roles();
        consultantRole.setRoleName("CONSULTANT");
        consultantRole.setDescription("Consultant Role");
        consultantRole = rolesRepository.save(consultantRole);

        // Create manager user
        managerUser = new Users();
        managerUser.setFullName("Test Manager");
        managerUser.setUsername("testmanager");
        managerUser.setEmail("manager@example.com");
        managerUser.setPhone("0987654321");
        managerUser.setPasswordHash(passwordEncoder.encode("password123"));
        managerUser.setStatus(UserStatus.ACTIVE);
        managerUser.setRole(managerRole);
        managerUser = usersRepository.save(managerUser);

        // Create existing branch for some tests
        existingBranch = new Branches();
        existingBranch.setBranchName("Existing Branch");
        existingBranch.setLocation("123 Existing Street");
        existingBranch.setStatus(BranchStatus.ACTIVE);
        existingBranch = branchesRepository.save(existingBranch);
    }

    @Test
    void createBranch_shouldCreateBranchSuccessfully() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("New Branch");
        request.setLocation("456 New Street");

        // When
        BranchResponse result = branchService.createBranch(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getBranchName()).isEqualTo("New Branch");
        assertThat(result.getLocation()).isEqualTo("456 New Street");
        assertThat(result.getStatus()).isEqualTo(BranchStatus.ACTIVE.name());
        assertThat(result.getManagerId()).isNull();
    }

    @Test
    void createBranch_withManager_shouldCreateBranchWithManager() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(null);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Branch With Manager");
        request.setLocation("789 Manager Street");
        request.setManagerId(managerUser.getId());

        // When
        BranchResponse result = branchService.createBranch(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNotNull();
        assertThat(result.getBranchName()).isEqualTo("Branch With Manager");
        assertThat(result.getManagerId()).isEqualTo(managerUser.getId());
        assertThat(result.getManagerName()).isEqualTo("Test Manager");
        assertThat(result.getPhone()).isEqualTo("0987654321");
    }

    @Test
    void createBranch_withDuplicateName_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Existing Branch");
        request.setLocation("Different Location");

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên chi nhánh đã tồn tại");
    }

    @Test
    void createBranch_withDuplicateNameCaseInsensitive_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("EXISTING BRANCH");
        request.setLocation("Different Location");

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên chi nhánh đã tồn tại");
    }

    @Test
    void createBranch_withManagerAlreadyAssigned_shouldThrowException() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(existingBranch);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        existingBranch.setManager(managerEmployee);
        branchesRepository.save(existingBranch);

        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Another Branch");
        request.setLocation("Another Location");
        request.setManagerId(managerUser.getId());

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Quản lý này đã được gán cho chi nhánh");
    }

    @Test
    void createBranch_withInvalidManagerId_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Branch With Invalid Manager");
        request.setLocation("Some Location");
        request.setManagerId(99999);

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy employee");
    }

    @Test
    void updateBranch_shouldUpdateBranchSuccessfully() {
        // Given
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("Updated Branch Name");
        request.setLocation("Updated Location");

        // When
        Integer result = branchService.updateBranch(existingBranch.getId(), request);

        // Then
        assertThat(result).isEqualTo(existingBranch.getId());
        Branches updated = branchesRepository.findById(existingBranch.getId()).orElseThrow();
        assertThat(updated.getBranchName()).isEqualTo("Updated Branch Name");
        assertThat(updated.getLocation()).isEqualTo("Updated Location");
    }

    @Test
    void updateBranch_withStatus_shouldUpdateStatus() {
        // Given
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setStatus(BranchStatus.INACTIVE);

        // When
        branchService.updateBranch(existingBranch.getId(), request);

        // Then
        Branches updated = branchesRepository.findById(existingBranch.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(BranchStatus.INACTIVE);
    }

    @Test
    void updateBranch_withManager_shouldUpdateManager() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(null);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setManagerId(managerUser.getId());

        // When
        branchService.updateBranch(existingBranch.getId(), request);

        // Then
        Branches updated = branchesRepository.findById(existingBranch.getId()).orElseThrow();
        assertThat(updated.getManager()).isNotNull();
        assertThat(updated.getManager().getEmployeeId()).isEqualTo(managerEmployee.getEmployeeId());
    }

    @Test
    void updateBranch_withDuplicateName_shouldThrowException() {
        // Given
        Branches anotherBranch = new Branches();
        anotherBranch.setBranchName("Another Branch");
        anotherBranch.setLocation("Another Location");
        anotherBranch.setStatus(BranchStatus.ACTIVE);
        Branches savedAnotherBranch = branchesRepository.save(anotherBranch);

        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("Existing Branch");

        // When & Then
        assertThatThrownBy(() -> branchService.updateBranch(savedAnotherBranch.getId(), request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên chi nhánh đã tồn tại");
    }

    @Test
    void updateBranch_withInvalidId_shouldThrowException() {
        // Given
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("Updated Name");

        // When & Then
        assertThatThrownBy(() -> branchService.updateBranch(99999, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void getBranchById_shouldReturnBranch() {
        // When
        BranchResponse result = branchService.getBranchById(existingBranch.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingBranch.getId());
        assertThat(result.getBranchName()).isEqualTo("Existing Branch");
        assertThat(result.getLocation()).isEqualTo("123 Existing Street");
    }

    @Test
    void getBranchById_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> branchService.getBranchById(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void getBranchById_withManager_shouldIncludeManagerInfo() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(existingBranch);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        existingBranch.setManager(managerEmployee);
        branchesRepository.save(existingBranch);

        // When
        BranchResponse result = branchService.getBranchById(existingBranch.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getManagerId()).isEqualTo(managerUser.getId());
        assertThat(result.getManagerName()).isEqualTo("Test Manager");
        assertThat(result.getPhone()).isEqualTo("0987654321");
    }

    @Test
    void deleteBranch_shouldSetStatusToInactive() {
        // When
        Integer result = branchService.deleteBranch(existingBranch.getId());

        // Then
        assertThat(result).isEqualTo(existingBranch.getId());
        Branches deleted = branchesRepository.findById(existingBranch.getId()).orElseThrow();
        assertThat(deleted.getStatus()).isEqualTo(BranchStatus.INACTIVE);
    }

    @Test
    void deleteBranch_withInvalidId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> branchService.deleteBranch(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void getBranchByUserId_shouldReturnBranch() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(existingBranch);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        // When
        BranchResponse result = branchService.getBranchByUserId(managerUser.getId());

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(existingBranch.getId());
        assertThat(result.getBranchName()).isEqualTo("Existing Branch");
    }

    @Test
    void getBranchByUserId_withInvalidUserId_shouldThrowException() {
        // When & Then
        assertThatThrownBy(() -> branchService.getBranchByUserId(99999))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User không thuộc chi nhánh nào");
    }

    @Test
    void getBranchByUserId_withEmployeeWithoutBranch_shouldThrowException() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(null);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        // When & Then
        assertThatThrownBy(() -> branchService.getBranchByUserId(managerUser.getId()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Employee chưa được gán chi nhánh");
    }

    @Test
    void getAllBranches_shouldReturnPagedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            Branches branch = new Branches();
            branch.setBranchName("Branch " + i);
            branch.setLocation("Location " + i);
            branch.setStatus(BranchStatus.ACTIVE);
            branchesRepository.save(branch);
        }

        // When
        PageResponse<?> result = branchService.getAllBranches(null, 1, 10, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void getAllBranches_withPagination_shouldReturnCorrectPage() {
        // Given
        for (int i = 0; i < 15; i++) {
            Branches branch = new Branches();
            branch.setBranchName("Pagination Branch " + i);
            branch.setLocation("Location " + i);
            branch.setStatus(BranchStatus.ACTIVE);
            branchesRepository.save(branch);
        }

        // When
        PageResponse<?> page1 = branchService.getAllBranches(null, 1, 10, null);
        PageResponse<?> page2 = branchService.getAllBranches(null, 2, 10, null);

        // Then
        assertThat(page1).isNotNull();
        assertThat(page1.getTotalElements()).isGreaterThanOrEqualTo(15);
        assertThat(page2).isNotNull();
        assertThat(page2.getPageNo()).isEqualTo(2);
    }

    @Test
    void getAllBranches_withSorting_shouldReturnSortedResults() {
        // Given
        for (int i = 0; i < 5; i++) {
            Branches branch = new Branches();
            branch.setBranchName("Branch " + i);
            branch.setLocation("Location " + i);
            branch.setStatus(BranchStatus.ACTIVE);
            branchesRepository.save(branch);
        }

        // When
        PageResponse<?> result = branchService.getAllBranches(null, 1, 10, "id:asc");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void getAllBranchesForSelection_shouldReturnOnlyActiveBranches() {
        // Given
        Branches activeBranch = new Branches();
        activeBranch.setBranchName("Active Branch");
        activeBranch.setLocation("Active Location");
        activeBranch.setStatus(BranchStatus.ACTIVE);
        branchesRepository.save(activeBranch);

        Branches inactiveBranch = new Branches();
        inactiveBranch.setBranchName("Inactive Branch");
        inactiveBranch.setLocation("Inactive Location");
        inactiveBranch.setStatus(BranchStatus.INACTIVE);
        branchesRepository.save(inactiveBranch);

        // When
        List<BranchResponse> result = branchService.getAllBranchesForSelection();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).anyMatch(b -> b.getBranchName().equals("Active Branch"));
        assertThat(result).noneMatch(b -> b.getBranchName().equals("Inactive Branch"));
    }

    @Test
    void getManagerDashboardStats_shouldReturnStats() {
        // Given
        managerEmployee = new Employees();
        managerEmployee.setUser(managerUser);
        managerEmployee.setBranch(existingBranch);
        managerEmployee.setRole(managerRole);
        managerEmployee.setStatus(EmployeeStatus.ACTIVE);
        managerEmployee = employeeRepository.save(managerEmployee);

        existingBranch.setManager(managerEmployee);
        branchesRepository.save(existingBranch);

        String period = YearMonth.now().toString();

        // When
        ManagerDashboardStatsResponse result = branchService.getManagerDashboardStats(
                existingBranch.getId(), period);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBranchInfo()).isNotNull();
        assertThat(result.getBranchInfo().getBranchId()).isEqualTo(existingBranch.getId());
        assertThat(result.getBranchInfo().getBranchName()).isEqualTo("Existing Branch");
        assertThat(result.getFinancialMetrics()).isNotNull();
        assertThat(result.getTripMetrics()).isNotNull();
        assertThat(result.getTopDrivers()).isNotNull();
        assertThat(result.getVehicleEfficiency()).isNotNull();
    }

    @Test
    void getManagerDashboardStats_withInvalidBranchId_shouldThrowException() {
        // Given
        String period = YearMonth.now().toString();

        // When & Then
        assertThatThrownBy(() -> branchService.getManagerDashboardStats(99999, period))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void createBranch_shouldTrimBranchName() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("  Trimmed Branch  ");
        request.setLocation("Location");

        // When
        BranchResponse result = branchService.createBranch(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getBranchName()).isEqualTo("Trimmed Branch");
    }

    @Test
    void updateBranch_shouldTrimBranchName() {
        // Given
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("  Updated Trimmed Branch  ");

        // When
        branchService.updateBranch(existingBranch.getId(), request);

        // Then
        Branches updated = branchesRepository.findById(existingBranch.getId()).orElseThrow();
        assertThat(updated.getBranchName()).isEqualTo("Updated Trimmed Branch");
    }
}

