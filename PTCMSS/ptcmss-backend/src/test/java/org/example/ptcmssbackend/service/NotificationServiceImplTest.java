package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.response.notification.AlertResponse;
import org.example.ptcmssbackend.dto.response.notification.ApprovalItemResponse;
import org.example.ptcmssbackend.dto.response.notification.NotificationDashboardResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.*;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private SystemAlertsRepository alertsRepository;
    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private VehicleRepository vehicleRepository;
    @Mock
    private DriverDayOffRepository driverDayOffRepository;
    @Mock
    private ExpenseRequestRepository expenseRequestRepository;
    @Mock
    private UsersRepository userRepository;
    @Mock
    private TripDriverRepository tripDriverRepository;
    @Mock
    private SystemSettingService systemSettingService;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    // ==================== getAllAlerts() Tests ====================

    @Test
    void getAllAlerts_whenBranchIdProvided_shouldReturnBranchAlerts() {
        // Given
        Integer branchId = 10;
        SystemAlerts alert1 = createTestAlert(100, branchId);
        SystemAlerts alert2 = createTestAlert(101, branchId);
        List<SystemAlerts> alerts = List.of(alert1, alert2);

        when(alertsRepository.findByBranch_IdAndIsAcknowledgedFalseOrderByCreatedAtDesc(branchId))
                .thenReturn(alerts);

        // When
        List<AlertResponse> result = notificationService.getAllAlerts(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(alertsRepository).findByBranch_IdAndIsAcknowledgedFalseOrderByCreatedAtDesc(branchId);
    }

    @Test
    void getAllAlerts_whenNoBranchId_shouldReturnAllAlerts() {
        // Given
        SystemAlerts alert1 = createTestAlert(100, 10);
        SystemAlerts alert2 = createTestAlert(101, 20);
        List<SystemAlerts> alerts = List.of(alert1, alert2);

        when(alertsRepository.findByIsAcknowledgedFalseOrderByCreatedAtDesc()).thenReturn(alerts);

        // When
        List<AlertResponse> result = notificationService.getAllAlerts(null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(alertsRepository).findByIsAcknowledgedFalseOrderByCreatedAtDesc();
    }

    // ==================== acknowledgeAlert() Tests ====================

    @Test
    void acknowledgeAlert_whenValidRequest_shouldAcknowledgeSuccessfully() {
        // Given
        Integer alertId = 100;
        Integer userId = 200;
        SystemAlerts alert = createTestAlert(alertId, 10);
        Users user = createTestUser(userId);

        when(alertsRepository.findById(alertId)).thenReturn(Optional.of(alert));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(alertsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        AlertResponse result = notificationService.acknowledgeAlert(alertId, userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(alert.getIsAcknowledged()).isTrue();
        assertThat(alert.getAcknowledgedBy()).isEqualTo(user);
        assertThat(alert.getAcknowledgedAt()).isNotNull();
        verify(alertsRepository).save(alert);
    }

    @Test
    void acknowledgeAlert_whenAlertNotFound_shouldThrowException() {
        // Given
        Integer alertId = 999;
        Integer userId = 200;

        when(alertsRepository.findById(alertId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> notificationService.acknowledgeAlert(alertId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy cảnh báo");
    }

    @Test
    void acknowledgeAlert_whenUserNotFound_shouldThrowException() {
        // Given
        Integer alertId = 100;
        Integer userId = 999;
        SystemAlerts alert = createTestAlert(alertId, 10);

        when(alertsRepository.findById(alertId)).thenReturn(Optional.of(alert));
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> notificationService.acknowledgeAlert(alertId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy người dùng");
    }

    // ==================== getPendingApprovals() Tests ====================

    @Test
    void getPendingApprovals_whenApprovalsExist_shouldReturnApprovals() {
        // Given
        Integer branchId = 10;
        ApprovalHistory approval1 = createTestApproval(100, ApprovalStatus.PENDING);
        ApprovalHistory approval2 = createTestApproval(101, ApprovalStatus.PENDING);
        List<ApprovalHistory> approvals = List.of(approval1, approval2);

        when(approvalHistoryRepository.findByBranch_IdAndStatusOrderByRequestedAtDesc(branchId, ApprovalStatus.PENDING))
                .thenReturn(approvals);
        when(driverDayOffRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(expenseRequestRepository.findById(anyInt())).thenReturn(Optional.empty());

        // When
        List<ApprovalItemResponse> result = notificationService.getPendingApprovals(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(2);
        verify(approvalHistoryRepository).findByBranch_IdAndStatusOrderByRequestedAtDesc(branchId, ApprovalStatus.PENDING);
    }

    @Test
    void getPendingApprovals_whenNoBranchId_shouldReturnAllApprovals() {
        // Given
        ApprovalHistory approval = createTestApproval(100, ApprovalStatus.PENDING);
        List<ApprovalHistory> approvals = List.of(approval);

        when(approvalHistoryRepository.findByStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING))
                .thenReturn(approvals);
        when(driverDayOffRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(expenseRequestRepository.findById(anyInt())).thenReturn(Optional.empty());

        // When
        List<ApprovalItemResponse> result = notificationService.getPendingApprovals(null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.size()).isEqualTo(1);
    }

    // ==================== approveRequest() Tests ====================

    @Test
    void approveRequest_whenValidRequest_shouldApproveSuccessfully() {
        // Given
        Integer historyId = 100;
        Integer userId = 200;
        String note = "Approved";
        ApprovalHistory history = createTestApproval(historyId, ApprovalStatus.PENDING);
        Users user = createTestUser(userId);
        Roles role = createTestRole("ADMIN");
        user.setRole(role);

        when(approvalHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(approvalHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(driverDayOffRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(expenseRequestRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(notificationRepository.save(any())).thenAnswer(inv -> {
            Notifications n = inv.getArgument(0);
            n.setId(300);
            return n;
        });
        doNothing().when(webSocketNotificationService).sendUserNotification(anyInt(), anyString(), anyString(), anyString());

        // When
        ApprovalItemResponse result = notificationService.approveRequest(historyId, userId, note);

        // Then
        assertThat(result).isNotNull();
        assertThat(history.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        assertThat(history.getApprovedBy()).isEqualTo(user);
        assertThat(history.getApprovalNote()).isEqualTo(note);
        verify(approvalHistoryRepository).save(history);
    }

    @Test
    void approveRequest_whenAlreadyProcessed_shouldThrowException() {
        // Given
        Integer historyId = 100;
        Integer userId = 200;
        ApprovalHistory history = createTestApproval(historyId, ApprovalStatus.APPROVED);

        when(approvalHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));

        // When & Then
        assertThatThrownBy(() -> notificationService.approveRequest(historyId, userId, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Yêu cầu đã được xử lý");
    }

    @Test
    void approveRequest_whenCoordinatorApprovesNonDayOff_shouldThrowException() {
        // Given
        Integer historyId = 100;
        Integer userId = 200;
        ApprovalHistory history = createTestApproval(historyId, ApprovalStatus.PENDING);
        history.setApprovalType(ApprovalType.EXPENSE_REQUEST); // Not DRIVER_DAY_OFF
        Users user = createTestUser(userId);
        Roles role = createTestRole("COORDINATOR");
        user.setRole(role);

        when(approvalHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // When & Then
        assertThatThrownBy(() -> notificationService.approveRequest(historyId, userId, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Coordinator chỉ được duyệt yêu cầu nghỉ phép");
    }

    // ==================== rejectRequest() Tests ====================

    @Test
    void rejectRequest_whenValidRequest_shouldRejectSuccessfully() {
        // Given
        Integer historyId = 100;
        Integer userId = 200;
        String note = "Rejected";
        ApprovalHistory history = createTestApproval(historyId, ApprovalStatus.PENDING);
        Users user = createTestUser(userId);
        Roles role = createTestRole("ADMIN");
        user.setRole(role);

        when(approvalHistoryRepository.findById(historyId)).thenReturn(Optional.of(history));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(approvalHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(driverDayOffRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(expenseRequestRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(notificationRepository.save(any())).thenAnswer(inv -> {
            Notifications n = inv.getArgument(0);
            n.setId(300);
            return n;
        });
        doNothing().when(webSocketNotificationService).sendUserNotification(anyInt(), anyString(), anyString(), anyString());

        // When
        ApprovalItemResponse result = notificationService.rejectRequest(historyId, userId, note);

        // Then
        assertThat(result).isNotNull();
        assertThat(history.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
        assertThat(history.getApprovedBy()).isEqualTo(user);
        assertThat(history.getApprovalNote()).isEqualTo(note);
        verify(approvalHistoryRepository).save(history);
    }

    // ==================== getDashboard() Tests ====================

    @Test
    void getDashboard_whenValidRequest_shouldReturnDashboard() {
        // Given
        Integer branchId = 10;
        SystemAlerts alert = createTestAlert(100, branchId);
        ApprovalHistory approval = createTestApproval(200, ApprovalStatus.PENDING);

        when(alertsRepository.findByBranch_IdAndIsAcknowledgedFalseOrderByCreatedAtDesc(branchId))
                .thenReturn(List.of(alert));
        when(approvalHistoryRepository.findByBranch_IdAndStatusOrderByRequestedAtDesc(branchId, ApprovalStatus.PENDING))
                .thenReturn(List.of(approval));
        when(alertsRepository.countByBranch_IdAndIsAcknowledgedFalse(branchId)).thenReturn(1L);
        when(approvalHistoryRepository.countByBranch_IdAndStatus(branchId, ApprovalStatus.PENDING)).thenReturn(1L);
        when(driverDayOffRepository.findById(anyInt())).thenReturn(Optional.empty());
        when(expenseRequestRepository.findById(anyInt())).thenReturn(Optional.empty());

        // When
        NotificationDashboardResponse result = notificationService.getDashboard(branchId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getAlerts()).isNotNull();
        assertThat(result.getPendingApprovals()).isNotNull();
        assertThat(result.getStats()).isNotNull();
        assertThat(result.getStats().getTotalAlerts()).isEqualTo(1L);
        assertThat(result.getStats().getTotalPendingApprovals()).isEqualTo(1L);
    }

    // ==================== getUserNotifications() Tests ====================

    @Test
    void getUserNotifications_whenNotificationsExist_shouldReturnNotifications() {
        // Given
        Integer userId = 200;
        int page = 1;
        int limit = 10;
        Notifications notification1 = createTestNotification(100, userId);
        Notifications notification2 = createTestNotification(101, userId);
        org.springframework.data.domain.Page<Notifications> notificationPage = 
                new org.springframework.data.domain.PageImpl<>(List.of(notification1, notification2));

        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(eq(userId), any()))
                .thenReturn(notificationPage);

        // When
        Map<String, Object> result = notificationService.getUserNotifications(userId, page, limit);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.get("total")).isEqualTo(2L);
        assertThat(result.get("page")).isEqualTo(1);
        assertThat(result.get("limit")).isEqualTo(10);
    }

    // ==================== deleteNotification() Tests ====================

    @Test
    void deleteNotification_whenValidNotification_shouldDeleteSuccessfully() {
        // Given
        Integer notificationId = 100;
        Integer userId = 200;
        Notifications notification = createTestNotification(notificationId, userId);

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));
        doNothing().when(notificationRepository).delete(notification);

        // When
        notificationService.deleteNotification(notificationId, userId);

        // Then
        verify(notificationRepository).delete(notification);
    }

    @Test
    void deleteNotification_whenNotificationNotFound_shouldThrowException() {
        // Given
        Integer notificationId = 999;
        Integer userId = 200;

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> notificationService.deleteNotification(notificationId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không tìm thấy thông báo");
    }

    @Test
    void deleteNotification_whenWrongOwner_shouldThrowException() {
        // Given
        Integer notificationId = 100;
        Integer userId = 200;
        Notifications notification = createTestNotification(notificationId, 300); // Different user

        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        // When & Then
        assertThatThrownBy(() -> notificationService.deleteNotification(notificationId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Thông báo không thuộc về người dùng");
    }

    // ==================== dismissApproval() Tests ====================

    @Test
    void dismissApproval_whenPendingApproval_shouldDeleteSuccessfully() {
        // Given
        Integer approvalHistoryId = 100;
        Integer userId = 200;
        ApprovalHistory history = createTestApproval(approvalHistoryId, ApprovalStatus.PENDING);

        when(approvalHistoryRepository.findById(approvalHistoryId)).thenReturn(Optional.of(history));
        doNothing().when(approvalHistoryRepository).delete(history);
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId))
                .thenReturn(Collections.emptyList());

        // When
        notificationService.dismissApproval(approvalHistoryId, userId);

        // Then
        verify(approvalHistoryRepository).delete(history);
    }

    @Test
    void dismissApproval_whenAlreadyProcessed_shouldThrowException() {
        // Given
        Integer approvalHistoryId = 100;
        Integer userId = 200;
        ApprovalHistory history = createTestApproval(approvalHistoryId, ApprovalStatus.APPROVED);

        when(approvalHistoryRepository.findById(approvalHistoryId)).thenReturn(Optional.of(history));

        // When & Then
        assertThatThrownBy(() -> notificationService.dismissApproval(approvalHistoryId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Không thể xóa approval đã được xử lý");
    }

    // ==================== Helper Methods ====================

    private SystemAlerts createTestAlert(Integer alertId, Integer branchId) {
        SystemAlerts alert = new SystemAlerts();
        alert.setId(alertId);
        alert.setAlertType(AlertType.VEHICLE_INSPECTION_EXPIRING);
        alert.setSeverity(AlertSeverity.HIGH);
        alert.setTitle("Test Alert");
        alert.setMessage("Test message");
        alert.setIsAcknowledged(false);

        Branches branch = new Branches();
        branch.setId(branchId);
        alert.setBranch(branch);

        return alert;
    }

    private ApprovalHistory createTestApproval(Integer historyId, ApprovalStatus status) {
        ApprovalHistory history = new ApprovalHistory();
        history.setId(historyId);
        history.setApprovalType(ApprovalType.DRIVER_DAY_OFF);
        history.setStatus(status);
        history.setRelatedEntityId(500);
        history.setRequestedAt(Instant.now());

        Users requester = createTestUser(300);
        history.setRequestedBy(requester);

        Branches branch = new Branches();
        branch.setId(10);
        history.setBranch(branch);

        return history;
    }

    private Notifications createTestNotification(Integer notificationId, Integer userId) {
        Notifications notification = new Notifications();
        notification.setId(notificationId);
        notification.setTitle("Test Notification");
        notification.setMessage("Test message");
        notification.setIsRead(false);
        notification.setCreatedAt(Instant.now());

        Users user = createTestUser(userId);
        notification.setUser(user);

        return notification;
    }

    private Users createTestUser(Integer userId) {
        Users user = new Users();
        user.setId(userId);
        user.setFullName("User " + userId);
        return user;
    }

    private Roles createTestRole(String roleName) {
        Roles role = new Roles();
        role.setId(1);
        role.setRoleName(roleName);
        return role;
    }
}

