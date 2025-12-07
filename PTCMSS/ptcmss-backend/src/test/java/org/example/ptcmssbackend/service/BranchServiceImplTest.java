package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.Branch.CreateBranchRequest;
import org.example.ptcmssbackend.dto.request.Branch.UpdateBranchRequest;
import org.example.ptcmssbackend.dto.response.Branch.BranchResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.BranchStatus;
import org.example.ptcmssbackend.enums.EmployeeStatus;
import org.example.ptcmssbackend.repository.BranchesRepository;
import org.example.ptcmssbackend.repository.EmployeeRepository;
import org.example.ptcmssbackend.repository.InvoiceRepository;
import org.example.ptcmssbackend.repository.TripDriverRepository;
import org.example.ptcmssbackend.repository.TripRepository;
import org.example.ptcmssbackend.repository.TripVehicleRepository;
import org.example.ptcmssbackend.service.impl.BranchServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BranchServiceImplTest {

    @Mock
    private BranchesRepository branchesRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private TripVehicleRepository tripVehicleRepository;

    @InjectMocks
    private BranchServiceImpl branchService;

    // ==================== createBranch() Tests ====================

    @Test
    void createBranch_whenValidRequest_shouldCreateSuccessfully() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Chi nhánh Hà Nội");
        request.setLocation("123 Đường ABC");
        request.setManagerId(100);

        Employees manager = createTestEmployee(1, 100);

        when(branchesRepository.existsByBranchNameIgnoreCase("Chi nhánh Hà Nội")).thenReturn(false);
        when(employeeRepository.findByUserId(100)).thenReturn(Optional.of(manager));
        when(branchesRepository.findByManager_EmployeeId(1)).thenReturn(null);
        when(branchesRepository.save(any())).thenAnswer(inv -> {
            Branches b = inv.getArgument(0);
            b.setId(10);
            return b;
        });
        when(employeeRepository.countActiveByBranchId(10, EmployeeStatus.INACTIVE)).thenReturn(0L);

        // When
        BranchResponse result = branchService.createBranch(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10);
        assertThat(result.getBranchName()).isEqualTo("Chi nhánh Hà Nội");
        assertThat(result.getLocation()).isEqualTo("123 Đường ABC");
        verify(branchesRepository).save(any());
    }

    @Test
    void createBranch_whenDuplicateName_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Chi nhánh Hà Nội");

        when(branchesRepository.existsByBranchNameIgnoreCase("Chi nhánh Hà Nội")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên chi nhánh đã tồn tại");
    }

    @Test
    void createBranch_whenManagerNotFound_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Chi nhánh Hà Nội");
        request.setManagerId(999);

        when(branchesRepository.existsByBranchNameIgnoreCase("Chi nhánh Hà Nội")).thenReturn(false);
        when(employeeRepository.findByUserId(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy employee");
    }

    @Test
    void createBranch_whenManagerAlreadyAssigned_shouldThrowException() {
        // Given
        CreateBranchRequest request = new CreateBranchRequest();
        request.setBranchName("Chi nhánh Hà Nội");
        request.setManagerId(100);

        Employees manager = createTestEmployee(1, 100);
        Branches existingBranch = createTestBranch(20, "Chi nhánh khác");

        when(branchesRepository.existsByBranchNameIgnoreCase("Chi nhánh Hà Nội")).thenReturn(false);
        when(employeeRepository.findByUserId(100)).thenReturn(Optional.of(manager));
        when(branchesRepository.findByManager_EmployeeId(1)).thenReturn(existingBranch);

        // When & Then
        assertThatThrownBy(() -> branchService.createBranch(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("đã được gán cho chi nhánh");
    }

    // ==================== updateBranch() Tests ====================

    @Test
    void updateBranch_whenValidRequest_shouldUpdateSuccessfully() {
        // Given
        Integer branchId = 10;
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("Chi nhánh Hà Nội Mới");
        request.setLocation("456 Đường XYZ");

        Branches branch = createTestBranch(branchId, "Chi nhánh Hà Nội");

        when(branchesRepository.findById(branchId)).thenReturn(Optional.of(branch));
        when(branchesRepository.existsByBranchNameIgnoreCaseAndIdNot("Chi nhánh Hà Nội Mới", branchId))
                .thenReturn(false);
        when(branchesRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = branchService.updateBranch(branchId, request);

        // Then
        assertThat(result).isEqualTo(branchId);
        assertThat(branch.getBranchName()).isEqualTo("Chi nhánh Hà Nội Mới");
        assertThat(branch.getLocation()).isEqualTo("456 Đường XYZ");
        verify(branchesRepository).save(branch);
    }

    @Test
    void updateBranch_whenBranchNotFound_shouldThrowException() {
        // Given
        Integer branchId = 999;
        UpdateBranchRequest request = new UpdateBranchRequest();

        when(branchesRepository.findById(branchId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> branchService.updateBranch(branchId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    @Test
    void updateBranch_whenDuplicateName_shouldThrowException() {
        // Given
        Integer branchId = 10;
        UpdateBranchRequest request = new UpdateBranchRequest();
        request.setBranchName("Chi nhánh đã tồn tại");

        Branches branch = createTestBranch(branchId, "Chi nhánh Hà Nội");

        when(branchesRepository.findById(branchId)).thenReturn(Optional.of(branch));
        when(branchesRepository.existsByBranchNameIgnoreCaseAndIdNot("Chi nhánh đã tồn tại", branchId))
                .thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> branchService.updateBranch(branchId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tên chi nhánh đã tồn tại");
    }

    // ==================== getBranchById() Tests ====================

    @Test
    void getBranchById_whenBranchExists_shouldReturnBranch() {
        // Given
        Integer branchId = 10;
        Branches branch = createTestBranch(branchId, "Chi nhánh Hà Nội");

        when(branchesRepository.findById(branchId)).thenReturn(Optional.of(branch));
        when(employeeRepository.countActiveByBranchId(branchId, EmployeeStatus.INACTIVE)).thenReturn(5L);

        // When
        BranchResponse result = branchService.getBranchById(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(branchId);
        assertThat(result.getBranchName()).isEqualTo("Chi nhánh Hà Nội");
        assertThat(result.getEmployeeCount()).isEqualTo(5);
    }

    @Test
    void getBranchById_whenBranchNotFound_shouldThrowException() {
        // Given
        Integer branchId = 999;

        when(branchesRepository.findById(branchId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> branchService.getBranchById(branchId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    // ==================== deleteBranch() Tests ====================

    @Test
    void deleteBranch_whenValidBranch_shouldSetInactive() {
        // Given
        Integer branchId = 10;
        Branches branch = createTestBranch(branchId, "Chi nhánh Hà Nội");
        branch.setStatus(BranchStatus.ACTIVE);

        when(branchesRepository.findById(branchId)).thenReturn(Optional.of(branch));
        when(branchesRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Integer result = branchService.deleteBranch(branchId);

        // Then
        assertThat(result).isEqualTo(branchId);
        assertThat(branch.getStatus()).isEqualTo(BranchStatus.INACTIVE);
        verify(branchesRepository).save(branch);
    }

    @Test
    void deleteBranch_whenBranchNotFound_shouldThrowException() {
        // Given
        Integer branchId = 999;

        when(branchesRepository.findById(branchId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> branchService.deleteBranch(branchId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh");
    }

    // ==================== getBranchByUserId() Tests ====================

    @Test
    void getBranchByUserId_whenEmployeeExists_shouldReturnBranch() {
        // Given
        Integer userId = 100;
        Employees employee = createTestEmployee(1, userId);
        Branches branch = createTestBranch(10, "Chi nhánh Hà Nội");
        employee.setBranch(branch);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));
        when(employeeRepository.countActiveByBranchId(10, EmployeeStatus.INACTIVE)).thenReturn(5L);

        // When
        BranchResponse result = branchService.getBranchByUserId(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(10);
        assertThat(result.getBranchName()).isEqualTo("Chi nhánh Hà Nội");
    }

    @Test
    void getBranchByUserId_whenEmployeeNotFound_shouldThrowException() {
        // Given
        Integer userId = 999;

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> branchService.getBranchByUserId(userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("User không thuộc chi nhánh nào");
    }

    @Test
    void getBranchByUserId_whenEmployeeNoBranch_shouldThrowException() {
        // Given
        Integer userId = 100;
        Employees employee = createTestEmployee(1, userId);
        employee.setBranch(null);

        when(employeeRepository.findByUserId(userId)).thenReturn(Optional.of(employee));

        // When & Then
        assertThatThrownBy(() -> branchService.getBranchByUserId(userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Employee chưa được gán chi nhánh");
    }

    // ==================== getAllBranchesForSelection() Tests ====================

    @Test
    void getAllBranchesForSelection_whenBranchesExist_shouldReturnActiveBranches() {
        // Given
        Branches branch1 = createTestBranch(10, "Chi nhánh Hà Nội");
        branch1.setStatus(BranchStatus.ACTIVE);
        Branches branch2 = createTestBranch(20, "Chi nhánh HCM");
        branch2.setStatus(BranchStatus.ACTIVE);
        List<Branches> branches = List.of(branch1, branch2);

        when(branchesRepository.findByStatus(BranchStatus.ACTIVE)).thenReturn(branches);

        // When
        List<BranchResponse> result = branchService.getAllBranchesForSelection();

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(branchesRepository).findByStatus(BranchStatus.ACTIVE);
    }

    @Test
    void getAllBranchesForSelection_whenNoBranches_shouldReturnEmptyList() {
        // Given
        when(branchesRepository.findByStatus(BranchStatus.ACTIVE)).thenReturn(Collections.emptyList());

        // When
        List<BranchResponse> result = branchService.getAllBranchesForSelection();

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ==================== Helper Methods ====================

    private Branches createTestBranch(Integer branchId, String branchName) {
        Branches branch = new Branches();
        branch.setId(branchId);
        branch.setBranchName(branchName);
        branch.setLocation("123 Đường ABC");
        branch.setStatus(BranchStatus.ACTIVE);
        return branch;
    }

    private Employees createTestEmployee(Integer employeeId, Integer userId) {
        Employees employee = new Employees();
        employee.setEmployeeId(employeeId);

        Users user = new Users();
        user.setId(userId);
        user.setFullName("Manager " + userId);
        user.setPhone("0912345678");
        employee.setUser(user);

        return employee;
    }
}

