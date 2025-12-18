package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.DriverDayOffStatus;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.ApprovalSyncServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApprovalSyncServiceImplTest {

    @Mock
    private DriverDayOffRepository driverDayOffRepository;

    @Mock
    private ExpenseRequestRepository expenseRequestRepository;

    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    @Mock
    private DriverRepository driverRepository;

    @InjectMocks
    private ApprovalSyncServiceImpl approvalSyncService;

    // ==================== syncDriverDayOffApprovals() Tests ====================

    @Test
    void syncDriverDayOffApprovals_whenPendingDayOffsExist_shouldCreateApprovalHistory() {
        // Given
        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(1);
        dayOff.setReason("Nghỉ phép");

        Drivers driver = new Drivers();
        driver.setId(1);

        Employees employee = new Employees();
        employee.setEmployeeId(1);

        Users user = new Users();
        user.setId(100);
        user.setFullName("Nguyễn Văn A");
        employee.setUser(user);
        driver.setEmployee(employee);

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        driver.setBranch(branch);
        dayOff.setDriver(driver);

        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenReturn(List.of(dayOff));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.DRIVER_DAY_OFF, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.empty());
        when(approvalHistoryRepository.save(any(ApprovalHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        approvalSyncService.syncDriverDayOffApprovals();

        // Then
        verify(driverDayOffRepository).findByStatus(DriverDayOffStatus.PENDING);
        verify(approvalHistoryRepository).findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.DRIVER_DAY_OFF, 1, ApprovalStatus.PENDING);
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    @Test
    void syncDriverDayOffApprovals_whenApprovalHistoryExists_shouldNotCreateDuplicate() {
        // Given
        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(1);
        dayOff.setReason("Nghỉ phép");

        Drivers driver = new Drivers();
        driver.setId(1);
        dayOff.setDriver(driver);

        ApprovalHistory existingHistory = new ApprovalHistory();
        existingHistory.setId(1);

        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenReturn(List.of(dayOff));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.DRIVER_DAY_OFF, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.of(existingHistory));

        // When
        approvalSyncService.syncDriverDayOffApprovals();

        // Then
        verify(approvalHistoryRepository, never()).save(any(ApprovalHistory.class));
    }

    @Test
    void syncDriverDayOffApprovals_whenNoUser_shouldNotCreateApprovalHistory() {
        // Given
        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(1);
        dayOff.setReason("Nghỉ phép");

        Drivers driver = new Drivers();
        driver.setId(1);
        driver.setEmployee(null); // No employee
        dayOff.setDriver(driver);

        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenReturn(List.of(dayOff));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.DRIVER_DAY_OFF, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.empty());

        // When
        approvalSyncService.syncDriverDayOffApprovals();

        // Then
        verify(approvalHistoryRepository, never()).save(any(ApprovalHistory.class));
    }

    @Test
    void syncDriverDayOffApprovals_whenException_shouldNotThrow() {
        // Given
        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenThrow(new RuntimeException("Database error"));

        // When & Then - Should not throw exception
        approvalSyncService.syncDriverDayOffApprovals();

        // Verify it handled the exception gracefully
        verify(driverDayOffRepository).findByStatus(DriverDayOffStatus.PENDING);
    }

    // ==================== syncExpenseRequestApprovals() Tests ====================

    @Test
    void syncExpenseRequestApprovals_whenPendingExpensesExist_shouldCreateApprovalHistory() {
        // Given
        ExpenseRequests expense = new ExpenseRequests();
        expense.setId(1);
        expense.setType("FUEL");
        expense.setAmount(new BigDecimal("500000"));

        Users requester = new Users();
        requester.setId(100);
        requester.setFullName("Nguyễn Văn A");
        expense.setRequester(requester);

        Branches branch = new Branches();
        branch.setId(1);
        branch.setBranchName("Chi nhánh Hà Nội");
        expense.setBranch(branch);

        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(expense));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.empty());
        when(approvalHistoryRepository.save(any(ApprovalHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        approvalSyncService.syncExpenseRequestApprovals();

        // Then
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.PENDING);
        verify(approvalHistoryRepository).findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, 1, ApprovalStatus.PENDING);
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    @Test
    void syncExpenseRequestApprovals_whenApprovalHistoryExists_shouldNotCreateDuplicate() {
        // Given
        ExpenseRequests expense = new ExpenseRequests();
        expense.setId(1);
        expense.setType("FUEL");
        expense.setAmount(new BigDecimal("500000"));

        ApprovalHistory existingHistory = new ApprovalHistory();
        existingHistory.setId(1);

        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(expense));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.of(existingHistory));

        // When
        approvalSyncService.syncExpenseRequestApprovals();

        // Then
        verify(approvalHistoryRepository, never()).save(any(ApprovalHistory.class));
    }

    @Test
    void syncExpenseRequestApprovals_whenNoRequester_shouldNotCreateApprovalHistory() {
        // Given
        ExpenseRequests expense = new ExpenseRequests();
        expense.setId(1);
        expense.setType("FUEL");
        expense.setAmount(new BigDecimal("500000"));
        expense.setRequester(null); // No requester

        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(expense));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(
                ApprovalType.EXPENSE_REQUEST, 1, ApprovalStatus.PENDING))
                .thenReturn(Optional.empty());

        // When
        approvalSyncService.syncExpenseRequestApprovals();

        // Then
        verify(approvalHistoryRepository, never()).save(any(ApprovalHistory.class));
    }

    @Test
    void syncExpenseRequestApprovals_whenException_shouldNotThrow() {
        // Given
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenThrow(new RuntimeException("Database error"));

        // When & Then - Should not throw exception
        approvalSyncService.syncExpenseRequestApprovals();

        // Verify it handled the exception gracefully
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.PENDING);
    }

    // ==================== syncAll() Tests ====================

    @Test
    void syncAll_shouldCallBothSyncMethods() {
        // Given
        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenReturn(List.of());
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of());

        // When
        approvalSyncService.syncAll();

        // Then
        verify(driverDayOffRepository).findByStatus(DriverDayOffStatus.PENDING);
        verify(expenseRequestRepository).findByStatus(ExpenseRequestStatus.PENDING);
    }

    @Test
    void syncAll_whenMultiplePendingItems_shouldCreateAllApprovalHistories() {
        // Given
        // Driver Day Off
        DriverDayOff dayOff = new DriverDayOff();
        dayOff.setId(1);
        dayOff.setReason("Nghỉ phép");

        Drivers driver = new Drivers();
        driver.setId(1);

        Employees employee = new Employees();
        Users user = new Users();
        user.setId(100);
        employee.setUser(user);
        driver.setEmployee(employee);

        Branches branch = new Branches();
        branch.setId(1);
        driver.setBranch(branch);
        dayOff.setDriver(driver);

        // Expense Request
        ExpenseRequests expense = new ExpenseRequests();
        expense.setId(1);
        expense.setType("FUEL");
        expense.setAmount(new BigDecimal("500000"));
        expense.setRequester(user);
        expense.setBranch(branch);

        when(driverDayOffRepository.findByStatus(DriverDayOffStatus.PENDING))
                .thenReturn(List.of(dayOff));
        when(expenseRequestRepository.findByStatus(ExpenseRequestStatus.PENDING))
                .thenReturn(List.of(expense));
        when(approvalHistoryRepository.findByApprovalTypeAndRelatedEntityIdAndStatus(any(), anyInt(), any()))
                .thenReturn(Optional.empty());
        when(approvalHistoryRepository.save(any(ApprovalHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        approvalSyncService.syncAll();

        // Then
        verify(approvalHistoryRepository, times(2)).save(any(ApprovalHistory.class));
    }
}

