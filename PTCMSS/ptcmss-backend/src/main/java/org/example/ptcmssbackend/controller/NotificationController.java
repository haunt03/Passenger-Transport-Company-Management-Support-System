package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.common.ResponseData;
import org.example.ptcmssbackend.dto.response.common.ResponseError;
import org.example.ptcmssbackend.dto.response.notification.AlertResponse;
import org.example.ptcmssbackend.dto.response.notification.ApprovalItemResponse;
import org.example.ptcmssbackend.dto.response.notification.NotificationDashboardResponse;
import org.example.ptcmssbackend.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications & Approvals", description = "API quản lý cảnh báo và phê duyệt")
public class NotificationController {

    private final NotificationService notificationService;
    private final org.example.ptcmssbackend.service.WebSocketNotificationService webSocketNotificationService;

    @Operation(
            summary = "Lấy dashboard notifications & approvals",
            description = "Trả về tổng quan cảnh báo và yêu cầu chờ duyệt"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    @GetMapping("/dashboard")
    public ResponseData<NotificationDashboardResponse> getDashboard(
            @RequestParam(required = false) Integer branchId) {
        try {
            NotificationDashboardResponse data = notificationService.getDashboard(branchId);
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to load dashboard", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Lấy danh sách cảnh báo",
            description = "Lấy tất cả cảnh báo chưa xác nhận"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    @GetMapping("/alerts")
    public ResponseData<List<AlertResponse>> getAlerts(
            @RequestParam(required = false) Integer branchId) {
        try {
            List<AlertResponse> data = notificationService.getAllAlerts(branchId);
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to load alerts", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Xác nhận đã biết cảnh báo",
            description = "Đánh dấu cảnh báo là đã xem/xử lý"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    @PostMapping("/alerts/{alertId}/acknowledge")
    public ResponseData<AlertResponse> acknowledgeAlert(
            @PathVariable Integer alertId,
            @RequestBody Map<String, Integer> body) {
        try {
            Integer userId = body.get("userId");
            if (userId == null) {
                throw new IllegalArgumentException("userId is required");
            }
            AlertResponse data = notificationService.acknowledgeAlert(alertId, userId);
            return new ResponseData<>(HttpStatus.OK.value(), "Alert acknowledged", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to acknowledge alert {}", alertId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Lấy danh sách yêu cầu chờ duyệt",
            description = "Lấy tất cả yêu cầu pending (nghỉ phép, tạm ứng, giảm giá, etc.)"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','COORDINATOR')")
    @GetMapping("/approvals/pending")
    public ResponseData<List<ApprovalItemResponse>> getPendingApprovals(
            @RequestParam(required = false) Integer branchId) {
        try {
            List<ApprovalItemResponse> data = notificationService.getPendingApprovals(branchId);
            return new ResponseData<>(HttpStatus.OK.value(), "Success", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to load pending approvals", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Phê duyệt yêu cầu",
            description = "Approve một yêu cầu (nghỉ phép, tạm ứng, etc.)"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @PostMapping("/approvals/{historyId}/approve")
    public ResponseData<ApprovalItemResponse> approveRequest(
            @PathVariable Integer historyId,
            @RequestBody Map<String, Object> body) {
        try {
            Integer userId = (Integer) body.get("userId");
            String note = (String) body.get("note");

            if (userId == null) {
                throw new IllegalArgumentException("userId is required");
            }

            ApprovalItemResponse data = notificationService.approveRequest(historyId, userId, note);
            return new ResponseData<>(HttpStatus.OK.value(), "Request approved", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to approve request {}", historyId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Từ chối yêu cầu",
            description = "Reject một yêu cầu (nghỉ phép, tạm ứng, etc.)"
    )
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @PostMapping("/approvals/{historyId}/reject")
    public ResponseData<ApprovalItemResponse> rejectRequest(
            @PathVariable Integer historyId,
            @RequestBody Map<String, Object> body) {
        try {
            Integer userId = (Integer) body.get("userId");
            String note = (String) body.get("note");

            if (userId == null) {
                throw new IllegalArgumentException("userId is required");
            }

            ApprovalItemResponse data = notificationService.rejectRequest(historyId, userId, note);
            return new ResponseData<>(HttpStatus.OK.value(), "Request rejected", data);
        } catch (Exception e) {
            log.error("[Notification] Failed to reject request {}", historyId, e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Tạo cảnh báo hệ thống (manual trigger)",
            description = "Trigger thủ công để tạo cảnh báo (thường chạy tự động mỗi ngày)"
    )
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/alerts/generate")
    public ResponseData<String> generateAlerts() {
        try {
            notificationService.generateSystemAlerts();
            return new ResponseData<>(HttpStatus.OK.value(), "Alerts generated successfully", null);
        } catch (Exception e) {
            log.error("[Notification] Failed to generate alerts", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    @Operation(
            summary = "Test WebSocket notification",
            description = "Gửi test notification qua WebSocket"
    )
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/test-websocket")
    public ResponseData<String> testWebSocket(@RequestBody Map<String, Object> body) {
        try {
            String title = (String) body.getOrDefault("title", "Test Notification");
            String message = (String) body.getOrDefault("message", "This is a test message");
            String type = (String) body.getOrDefault("type", "INFO");
            Integer userId = (Integer) body.get("userId");

            if (userId != null) {
                webSocketNotificationService.sendUserNotification(userId, title, message, type);
            } else {
                webSocketNotificationService.sendGlobalNotification(title, message, type);
            }

            return new ResponseData<>(HttpStatus.OK.value(), "WebSocket notification sent", null);
        } catch (Exception e) {
            log.error("[Notification] Failed to send WebSocket test", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }

    private final org.example.ptcmssbackend.service.impl.ApprovalSyncServiceImpl approvalSyncService;

    @Operation(
            summary = "Sync approval history (manual trigger)",
            description = "Trigger thủ công để sync approval history từ DriverDayOff và ExpenseRequests"
    )
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/approvals/sync")
    public ResponseData<String> syncApprovals() {
        try {
            approvalSyncService.syncAll();
            return new ResponseData<>(HttpStatus.OK.value(), "Sync triggered successfully", null);
        } catch (Exception e) {
            log.error("[Notification] Failed to sync approvals", e);
            return new ResponseError(HttpStatus.BAD_REQUEST.value(), e.getMessage());
        }
    }
}
