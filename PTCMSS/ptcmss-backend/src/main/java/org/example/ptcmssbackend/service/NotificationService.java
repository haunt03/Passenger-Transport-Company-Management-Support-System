package org.example.ptcmssbackend.service;

import org.example.ptcmssbackend.dto.response.notification.AlertResponse;
import org.example.ptcmssbackend.dto.response.notification.ApprovalItemResponse;
import org.example.ptcmssbackend.dto.response.notification.NotificationDashboardResponse;

import java.util.List;
import java.util.Map;

public interface NotificationService {
    
    // Alerts
    List<AlertResponse> getAllAlerts(Integer branchId);
    AlertResponse acknowledgeAlert(Integer alertId, Integer userId);
    void generateSystemAlerts(); // Tự động tạo alerts (chạy scheduled)
    
    // Approvals
    List<ApprovalItemResponse> getPendingApprovals(Integer branchId);
    List<ApprovalItemResponse> getProcessedApprovals(Integer branchId, Integer processedByUserId, Integer limit); // Lấy các yêu cầu đã xử lý (APPROVED + REJECTED)
    ApprovalItemResponse approveRequest(Integer historyId, Integer userId, String note);
    ApprovalItemResponse rejectRequest(Integer historyId, Integer userId, String note);
    
    // Dashboard
    NotificationDashboardResponse getDashboard(Integer branchId);
    
    // User notifications
    Map<String, Object> getUserNotifications(Integer userId, int page, int limit);
    
    // Delete notification
    void deleteNotification(Integer notificationId, Integer userId);
    
    // Delete notification by approval type and related entity ID
    void deleteNotificationByApproval(String approvalType, Integer relatedEntityId, Integer userId);
    
    // Delete approval history (dismiss approval)
    void dismissApproval(Integer approvalHistoryId, Integer userId);
}
