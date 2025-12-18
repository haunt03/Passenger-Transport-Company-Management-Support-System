package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.request.expense.CreateExpenseRequest;
import org.example.ptcmssbackend.dto.response.expense.ExpenseRequestResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.ExpenseRequestServiceImpl;
import org.example.ptcmssbackend.service.WebSocketNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExpenseRequestService Tests")
class ExpenseRequestServiceImplTest {

    @Mock
    private ExpenseRequestRepository expenseRequestRepository;
    @Mock
    private BranchesRepository branchesRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private UsersRepository usersRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    @InjectMocks
    private ExpenseRequestServiceImpl expenseRequestService;

    private Branches testBranch;
    private Vehicles testVehicle;
    private Users testRequester;
    private Employees testAccountant;
    private ExpenseRequests testExpenseRequest;

    @BeforeEach
    void setUp() {
        // Setup test branch
        testBranch = new Branches();
        testBranch.setId(1);
        testBranch.setBranchName("Chi nhánh Hà Nội");

        // Setup test vehicle
        testVehicle = new Vehicles();
        testVehicle.setId(10);
        testVehicle.setLicensePlate("29A-111.11");
        testVehicle.setBranch(testBranch);

        // Setup test requester
        testRequester = new Users();
        testRequester.setId(100);
        testRequester.setFullName("Tài xế Test");
        testRequester.setEmail("driver@test.com");

        // Setup test accountant
        testAccountant = new Employees();
        testAccountant.setEmployeeId(200);
        testAccountant.setUser(new Users());
        testAccountant.getUser().setId(201);
        testAccountant.getUser().setUsername("accountant@test.com");

        // Setup test expense request
        testExpenseRequest = new ExpenseRequests();
        testExpenseRequest.setId(1);
        testExpenseRequest.setBranch(testBranch);
        testExpenseRequest.setVehicle(testVehicle);
        testExpenseRequest.setRequester(testRequester);
        testExpenseRequest.setType("FUEL");
        testExpenseRequest.setAmount(new BigDecimal("500000"));
        testExpenseRequest.setNote("Test note");
        testExpenseRequest.setStatus(ExpenseRequestStatus.PENDING);
        testExpenseRequest.setCreatedAt(Instant.now());
    }

    // ==================== createExpenseRequest Tests ====================

    @Test
    @DisplayName("Should create expense request successfully with all fields")
    void createExpenseRequest_WhenValidRequestWithAllFields_ShouldReturnResponse() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("FUEL");
        request.setBranchId(1);
        request.setVehicleId(10);
        request.setRequesterUserId(100);
        request.setAmount(new BigDecimal("500000"));
        request.setNote("Test note");

        when(branchesRepository.findById(1)).thenReturn(Optional.of(testBranch));
        when(vehicleRepository.findById(10)).thenReturn(Optional.of(testVehicle));
        when(usersRepository.findById(100)).thenReturn(Optional.of(testRequester));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenAnswer(invocation -> {
            ExpenseRequests entity = invocation.getArgument(0);
            entity.setId(1);
            entity.setCreatedAt(Instant.now());
            return entity;
        });

        // When
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getType()).isEqualTo("FUEL");
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getBranchId()).isEqualTo(1);
        assertThat(response.getVehicleId()).isEqualTo(10);
        assertThat(response.getRequesterUserId()).isEqualTo(100);

        verify(expenseRequestRepository).save(any(ExpenseRequests.class));
        verify(notificationRepository, atLeastOnce()).save(any(Notifications.class));
        verify(webSocketNotificationService, atLeastOnce()).sendUserNotification(anyInt(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Should create expense request without vehicle when vehicleId is null")
    void createExpenseRequest_WhenVehicleIdIsNull_ShouldCreateWithoutVehicle() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("FUEL");
        request.setBranchId(1);
        request.setVehicleId(null);
        request.setRequesterUserId(100);
        request.setAmount(new BigDecimal("300000"));
        request.setNote("No vehicle");

        when(branchesRepository.findById(1)).thenReturn(Optional.of(testBranch));
        when(usersRepository.findById(100)).thenReturn(Optional.of(testRequester));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenAnswer(invocation -> {
            ExpenseRequests entity = invocation.getArgument(0);
            entity.setId(1);
            entity.setCreatedAt(Instant.now());
            return entity;
        });

        // When
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getVehicleId()).isNull();
        assertThat(response.getVehiclePlate()).isNull();
        verify(vehicleRepository, never()).findById(anyInt());
    }

    @Test
    @DisplayName("Should create expense request without requester when requesterUserId is null")
    void createExpenseRequest_WhenRequesterUserIdIsNull_ShouldCreateWithoutRequester() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("TOLL");
        request.setBranchId(1);
        request.setVehicleId(10);
        request.setRequesterUserId(null);
        request.setAmount(new BigDecimal("200000"));

        when(branchesRepository.findById(1)).thenReturn(Optional.of(testBranch));
        when(vehicleRepository.findById(10)).thenReturn(Optional.of(testVehicle));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenAnswer(invocation -> {
            ExpenseRequests entity = invocation.getArgument(0);
            entity.setId(1);
            entity.setCreatedAt(Instant.now());
            return entity;
        });

        // When
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getRequesterUserId()).isNull();
        assertThat(response.getRequesterName()).isNull();
        verify(usersRepository, never()).findById(anyInt());
    }

    @Test
    @DisplayName("Should throw exception when branch not found")
    void createExpenseRequest_WhenBranchNotFound_ShouldThrowException() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("FUEL");
        request.setBranchId(999);
        request.setAmount(new BigDecimal("500000"));

        when(branchesRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.createExpenseRequest(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy chi nhánh: 999");

        verify(expenseRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when vehicle not found")
    void createExpenseRequest_WhenVehicleNotFound_ShouldThrowException() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("FUEL");
        request.setBranchId(1);
        request.setVehicleId(999);
        request.setAmount(new BigDecimal("500000"));

        when(branchesRepository.findById(1)).thenReturn(Optional.of(testBranch));
        when(vehicleRepository.findById(999)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.createExpenseRequest(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy xe: 999");

        verify(expenseRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should set status to PENDING by default")
    void createExpenseRequest_WhenCreated_ShouldSetStatusToPending() {
        // Given
        CreateExpenseRequest request = new CreateExpenseRequest();
        request.setType("FUEL");
        request.setBranchId(1);
        request.setAmount(new BigDecimal("500000"));

        when(branchesRepository.findById(1)).thenReturn(Optional.of(testBranch));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenAnswer(invocation -> {
            ExpenseRequests entity = invocation.getArgument(0);
            entity.setId(1);
            entity.setCreatedAt(Instant.now());
            return entity;
        });

        // When
        ExpenseRequestResponse response = expenseRequestService.createExpenseRequest(request);

        // Then
        assertThat(response.getStatus()).isEqualTo("PENDING");

        ArgumentCaptor<ExpenseRequests> captor = ArgumentCaptor.forClass(ExpenseRequests.class);
        verify(expenseRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ExpenseRequestStatus.PENDING);
    }

    // ==================== approveRequest Tests ====================

    @Test
    @DisplayName("Should approve request successfully")
    void approveRequest_WhenValidRequest_ShouldApproveAndReturnResponse() {
        // Given
        Integer requestId = 1;
        String note = "Approved note";

        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.of(testExpenseRequest));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenReturn(testExpenseRequest);
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(anyInt()))
                .thenReturn(Collections.emptyList());

        // When
        ExpenseRequestResponse response = expenseRequestService.approveRequest(requestId, note);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("APPROVED");

        ArgumentCaptor<ExpenseRequests> captor = ArgumentCaptor.forClass(ExpenseRequests.class);
        verify(expenseRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ExpenseRequestStatus.APPROVED);
        assertThat(captor.getValue().getNote()).contains("Duyệt: " + note);
    }

    @Test
    @DisplayName("Should throw exception when request not found")
    void approveRequest_WhenRequestNotFound_ShouldThrowException() {
        // Given
        Integer requestId = 999;
        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.approveRequest(requestId, "note"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu chi phí: 999");
    }

    @Test
    @DisplayName("Should approve request without note")
    void approveRequest_WhenNoteIsNull_ShouldApproveWithoutNote() {
        // Given
        Integer requestId = 1;
        testExpenseRequest.setNote("Original note");

        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.of(testExpenseRequest));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenReturn(testExpenseRequest);
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(anyInt()))
                .thenReturn(Collections.emptyList());

        // When
        ExpenseRequestResponse response = expenseRequestService.approveRequest(requestId, null);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("Should update approval history when approving")
    void approveRequest_WhenApproving_ShouldUpdateApprovalHistory() {
        // Given
        Integer requestId = 1;
        String note = "Approved";

        ApprovalHistory approvalHistory = new ApprovalHistory();
        approvalHistory.setId(1);
        approvalHistory.setStatus(ApprovalStatus.PENDING);
        approvalHistory.setApprovalType(ApprovalType.EXPENSE_REQUEST);
        approvalHistory.setRelatedEntityId(requestId);

        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.of(testExpenseRequest));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenReturn(testExpenseRequest);
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, requestId, ApprovalStatus.PENDING))
                .thenReturn(Optional.of(approvalHistory));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(anyInt()))
                .thenReturn(Collections.emptyList());

        // When
        expenseRequestService.approveRequest(requestId, note);

        // Then
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    // ==================== rejectRequest Tests ====================

    @Test
    @DisplayName("Should reject request successfully")
    void rejectRequest_WhenValidRequest_ShouldRejectAndReturnResponse() {
        // Given
        Integer requestId = 1;
        String note = "Rejection reason";

        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.of(testExpenseRequest));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenReturn(testExpenseRequest);
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(anyInt()))
                .thenReturn(Collections.emptyList());

        // When
        ExpenseRequestResponse response = expenseRequestService.rejectRequest(requestId, note);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("REJECTED");

        ArgumentCaptor<ExpenseRequests> captor = ArgumentCaptor.forClass(ExpenseRequests.class);
        verify(expenseRequestRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ExpenseRequestStatus.REJECTED);
        assertThat(captor.getValue().getNote()).contains("Từ chối: " + note);
    }

    @Test
    @DisplayName("Should throw exception when request not found for rejection")
    void rejectRequest_WhenRequestNotFound_ShouldThrowException() {
        // Given
        Integer requestId = 999;
        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> expenseRequestService.rejectRequest(requestId, "reason"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy yêu cầu chi phí: 999");
    }

    @Test
    @DisplayName("Should update approval history when rejecting")
    void rejectRequest_WhenRejecting_ShouldUpdateApprovalHistory() {
        // Given
        Integer requestId = 1;
        String note = "Rejected";

        ApprovalHistory approvalHistory = new ApprovalHistory();
        approvalHistory.setId(1);
        approvalHistory.setStatus(ApprovalStatus.PENDING);
        approvalHistory.setApprovalType(ApprovalType.EXPENSE_REQUEST);
        approvalHistory.setRelatedEntityId(requestId);

        when(expenseRequestRepository.findById(requestId)).thenReturn(Optional.of(testExpenseRequest));
        when(expenseRequestRepository.save(any(ExpenseRequests.class))).thenReturn(testExpenseRequest);
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, requestId, ApprovalStatus.PENDING))
                .thenReturn(Optional.of(approvalHistory));
        when(employeeRepository.findByRoleNameAndBranchId("Accountant", 1))
                .thenReturn(List.of(testAccountant));
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(anyInt()))
                .thenReturn(Collections.emptyList());

        // When
        expenseRequestService.rejectRequest(requestId, note);

        // Then
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    // ==================== getPendingRequests Tests ====================

    @Test
    @DisplayName("Should return pending requests for specific branch")
    void getPendingRequests_WhenBranchIdProvided_ShouldReturnBranchPendingRequests() {
        // Given
        Integer branchId = 1;
        when(expenseRequestRepository.findByStatusAndBranch_Id(ExpenseRequestStatus.PENDING, branchId))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getPendingRequests(branchId);

        // Then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getStatus()).isEqualTo("PENDING");
        assertThat(responses.get(0).getBranchId()).isEqualTo(branchId);
    }

    @Test
    @DisplayName("Should return all pending requests when branchId is null")
    void getPendingRequests_WhenBranchIdIsNull_ShouldReturnAllPendingRequests() {
        // Given
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getPendingRequests(null);

        // Then
        assertThat(responses).hasSize(1);
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.PENDING);
        verify(expenseRequestRepository, never()).findByStatusAndBranch_Id(any(), anyInt());
    }

    @Test
    @DisplayName("Should return empty list when no pending requests")
    void getPendingRequests_WhenNoPendingRequests_ShouldReturnEmptyList() {
        // Given
        Integer branchId = 1;
        when(expenseRequestRepository.findByStatusAndBranch_Id(ExpenseRequestStatus.PENDING, branchId))
                .thenReturn(Collections.emptyList());

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getPendingRequests(branchId);

        // Then
        assertThat(responses).isEmpty();
    }

    // ==================== getByDriverId Tests ====================

    @Test
    @DisplayName("Should return expense requests by driver userId")
    void getByDriverId_WhenValidDriverId_ShouldReturnRequests() {
        // Given
        Integer driverUserId = 100;
        when(expenseRequestRepository.findByRequester_Id(driverUserId))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getByDriverId(driverUserId);

        // Then
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getRequesterUserId()).isEqualTo(driverUserId);
    }

    @Test
    @DisplayName("Should return empty list when driver has no requests")
    void getByDriverId_WhenNoRequests_ShouldReturnEmptyList() {
        // Given
        Integer driverUserId = 100;
        when(expenseRequestRepository.findByRequester_Id(driverUserId))
                .thenReturn(Collections.emptyList());

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getByDriverId(driverUserId);

        // Then
        assertThat(responses).isEmpty();
    }

    // ==================== getAllRequests Tests ====================

    @Test
    @DisplayName("Should return all requests when status and branchId are null")
    void getAllRequests_WhenNoFilters_ShouldReturnAllRequests() {
        // Given
        when(expenseRequestRepository.findAll()).thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getAllRequests(null, null);

        // Then
        assertThat(responses).hasSize(1);
        verify(expenseRequestRepository).findAll();
    }

    @Test
    @DisplayName("Should return requests filtered by status only")
    void getAllRequests_WhenStatusProvided_ShouldReturnFilteredByStatus() {
        // Given
        String status = "PENDING";
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getAllRequests(status, null);

        // Then
        assertThat(responses).hasSize(1);
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.PENDING);
    }

    @Test
    @DisplayName("Should return requests filtered by branchId only")
    void getAllRequests_WhenBranchIdProvided_ShouldReturnFilteredByBranch() {
        // Given
        Integer branchId = 1;
        when(expenseRequestRepository.findByBranch_Id(branchId))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getAllRequests(null, branchId);

        // Then
        assertThat(responses).hasSize(1);
        verify(expenseRequestRepository).findByBranch_Id(branchId);
    }

    @Test
    @DisplayName("Should return requests filtered by both status and branchId")
    void getAllRequests_WhenStatusAndBranchIdProvided_ShouldReturnFiltered() {
        // Given
        String status = "APPROVED";
        Integer branchId = 1;
        when(expenseRequestRepository.findByStatusAndBranch_Id(ExpenseRequestStatus.APPROVED, branchId))
                .thenReturn(List.of(testExpenseRequest));

        // When
        List<ExpenseRequestResponse> responses = expenseRequestService.getAllRequests(status, branchId);

        // Then
        assertThat(responses).hasSize(1);
        verify(expenseRequestRepository).findByStatusAndBranch_Id(ExpenseRequestStatus.APPROVED, branchId);
    }
}

