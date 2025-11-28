package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.analytics.*;
import org.example.ptcmssbackend.entity.ApprovalHistory;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.repository.ApprovalHistoryRepository;
import org.example.ptcmssbackend.service.AnalyticsService;
import org.example.ptcmssbackend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Manager Dashboard Controller - Module 7
 * Branch-specific analytics for Manager role
 */
@RestController
@RequestMapping("/api/v1/manager")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Manager Dashboard", description = "Branch analytics for Manager")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class ManagerDashboardController {

    private final AnalyticsService analyticsService;
    private final NotificationService notificationService;
    private final ApprovalHistoryRepository approvalHistoryRepository;

    /**
     * Get Manager Dashboard (branch-specific)
     * GET /api/v1/manager/dashboard?branchId=1&period=THIS_MONTH
     */
    @GetMapping("/dashboard")
    @Operation(summary = "Get manager dashboard", description = "Returns branch-specific KPIs and metrics")
    public ResponseEntity<AdminDashboardResponse> getManagerDashboard(
            @RequestParam Integer branchId,
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period
    ) {
        log.info("GET /api/v1/manager/dashboard - branchId: {}, period: {}", branchId, period);
        AdminDashboardResponse response = analyticsService.getManagerDashboard(branchId, period);
        return ResponseEntity.ok(response);
    }

    /**
     * Get branch revenue trend
     * GET /api/v1/manager/analytics/revenue-trend?branchId=1
     */
    @GetMapping("/analytics/revenue-trend")
    @Operation(summary = "Get branch revenue trend")
    public ResponseEntity<List<RevenueTrendDTO>> getBranchRevenueTrend(
            @RequestParam Integer branchId
    ) {
        log.info("GET /api/v1/manager/analytics/revenue-trend - branchId: {}", branchId);
        List<RevenueTrendDTO> trend = analyticsService.getBranchRevenueTrend(branchId);
        return ResponseEntity.ok(trend);
    }

    /**
     * Get driver performance for branch
     * GET /api/v1/manager/analytics/driver-performance?branchId=1&limit=5&period=THIS_MONTH
     */
    @GetMapping("/analytics/driver-performance")
    @Operation(summary = "Get top driver performance")
    public ResponseEntity<List<Map<String, Object>>> getDriverPerformance(
            @RequestParam Integer branchId,
            @RequestParam(required = false, defaultValue = "5") Integer limit,
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period
    ) {
        log.info("GET /api/v1/manager/analytics/driver-performance - branchId: {}, limit: {}, period: {}", branchId, limit, period);
        List<Map<String, Object>> performance = analyticsService.getDriverPerformance(branchId, limit, period);
        return ResponseEntity.ok(performance);
    }

    /**
     * Get vehicle utilization for branch
     * GET /api/v1/manager/analytics/vehicle-utilization?branchId=1
     */
    @GetMapping("/analytics/vehicle-utilization")
    @Operation(summary = "Get branch vehicle utilization")
    public ResponseEntity<Map<String, Object>> getVehicleUtilization(
            @RequestParam Integer branchId
    ) {
        log.info("GET /api/v1/manager/analytics/vehicle-utilization - branchId: {}", branchId);
        Map<String, Object> utilization = analyticsService.getVehicleUtilization(branchId);
        return ResponseEntity.ok(utilization);
    }

    /**
     * Get vehicle efficiency (cost per km) for branch
     * GET /api/v1/manager/analytics/vehicle-efficiency?branchId=1&period=THIS_MONTH
     */
    @GetMapping("/analytics/vehicle-efficiency")
    @Operation(summary = "Get branch vehicle efficiency")
    public ResponseEntity<List<Map<String, Object>>> getVehicleEfficiency(
            @RequestParam Integer branchId,
            @RequestParam(defaultValue = "THIS_MONTH") String period
    ) {
        log.info("GET /api/v1/manager/analytics/vehicle-efficiency - branchId: {}, period: {}", branchId, period);
        List<Map<String, Object>> efficiency = analyticsService.getVehicleEfficiency(branchId, period);
        return ResponseEntity.ok(efficiency);
    }

    /**
     * Get expense breakdown by category
     * GET /api/v1/manager/analytics/expense-breakdown?branchId=1
     */
    @GetMapping("/analytics/expense-breakdown")
    @Operation(summary = "Get expense breakdown by category")
    public ResponseEntity<List<Map<String, Object>>> getExpenseBreakdown(
            @RequestParam Integer branchId
    ) {
        log.info("GET /api/v1/manager/analytics/expense-breakdown - branchId: {}", branchId);
        List<Map<String, Object>> breakdown = analyticsService.getExpenseBreakdown(branchId);
        return ResponseEntity.ok(breakdown);
    }

    /**
     * Get pending approvals for branch
     * GET /api/v1/manager/approvals/pending?branchId=1
     */
    @GetMapping("/approvals/pending")
    @Operation(summary = "Get pending approvals for branch")
    public ResponseEntity<List<Map<String, Object>>> getPendingApprovals(
            @RequestParam Integer branchId
    ) {
        log.info("GET /api/v1/manager/approvals/pending - branchId: {}", branchId);
        List<Map<String, Object>> approvals = analyticsService.getPendingApprovals(branchId);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Get branch alerts
     * GET /api/v1/manager/alerts?branchId=1&severity=HIGH,CRITICAL
     */
    @GetMapping("/alerts")
    @Operation(summary = "Get branch alerts")
    public ResponseEntity<List<SystemAlertDTO>> getBranchAlerts(
            @RequestParam Integer branchId,
            @RequestParam(required = false) String severity
    ) {
        log.info("GET /api/v1/manager/alerts - branchId: {}, severity: {}", branchId, severity);
        List<SystemAlertDTO> alerts = analyticsService.getBranchAlerts(branchId, severity);
        return ResponseEntity.ok(alerts);
    }

    /**
     * Approve day-off request
     * POST /api/v1/manager/day-off/{dayOffId}/approve
     */
    @PostMapping("/day-off/{dayOffId}/approve")
    @Operation(summary = "Approve day-off request")
    public ResponseEntity<Map<String, String>> approveDayOff(
            @PathVariable Integer dayOffId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        log.info("POST /api/v1/manager/day-off/{}/approve", dayOffId);

        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not authenticated"));
        }

        // Find approval history for this day-off
        ApprovalHistory approvalHistory = approvalHistoryRepository
                .findByApprovalTypeAndRelatedEntityIdAndStatus(
                        ApprovalType.DRIVER_DAY_OFF, dayOffId, ApprovalStatus.PENDING)
                .orElse(null);

        if (approvalHistory == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pending approval not found for this day-off request"));
        }

        String note = body != null ? body.getOrDefault("note", "") : "";
        try {
            notificationService.approveRequest(approvalHistory.getId(), userId, note);
            return ResponseEntity.ok(Map.of("message", "Day-off request approved successfully"));
        } catch (Exception e) {
            log.error("Error approving day-off request", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reject day-off request
     * POST /api/v1/manager/day-off/{dayOffId}/reject
     */
    @PostMapping("/day-off/{dayOffId}/reject")
    @Operation(summary = "Reject day-off request")
    public ResponseEntity<Map<String, String>> rejectDayOff(
            @PathVariable Integer dayOffId,
            @RequestBody Map<String, String> body
    ) {
        log.info("POST /api/v1/manager/day-off/{}/reject - reason: {}", dayOffId, body.get("reason"));

        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not authenticated"));
        }

        // Find approval history for this day-off
        ApprovalHistory approvalHistory = approvalHistoryRepository
                .findByApprovalTypeAndRelatedEntityIdAndStatus(
                        ApprovalType.DRIVER_DAY_OFF, dayOffId, ApprovalStatus.PENDING)
                .orElse(null);

        if (approvalHistory == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pending approval not found for this day-off request"));
        }

        String reason = body.getOrDefault("reason", "");
        try {
            notificationService.rejectRequest(approvalHistory.getId(), userId, reason);
            return ResponseEntity.ok(Map.of("message", "Day-off request rejected"));
        } catch (Exception e) {
            log.error("Error rejecting day-off request", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Approve expense request
     * POST /api/v1/manager/expense-requests/{id}/approve
     */
    @PostMapping("/expense-requests/{id}/approve")
    @Operation(summary = "Approve expense request")
    public ResponseEntity<Map<String, String>> approveExpenseRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        log.info("POST /api/v1/manager/expense-requests/{}/approve", id);

        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not authenticated"));
        }

        // Find approval history for this expense request
        ApprovalHistory approvalHistory = approvalHistoryRepository
                .findByApprovalTypeAndRelatedEntityIdAndStatus(
                        ApprovalType.EXPENSE_REQUEST, id, ApprovalStatus.PENDING)
                .orElse(null);

        if (approvalHistory == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pending approval not found for this expense request"));
        }

        String note = body != null ? body.getOrDefault("note", "") : "";
        try {
            notificationService.approveRequest(approvalHistory.getId(), userId, note);
            return ResponseEntity.ok(Map.of("message", "Expense request approved successfully"));
        } catch (Exception e) {
            log.error("Error approving expense request", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reject expense request
     * POST /api/v1/manager/expense-requests/{id}/reject
     */
    @PostMapping("/expense-requests/{id}/reject")
    @Operation(summary = "Reject expense request")
    public ResponseEntity<Map<String, String>> rejectExpenseRequest(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body
    ) {
        log.info("POST /api/v1/manager/expense-requests/{}/reject - reason: {}", id, body.get("reason"));

        Integer userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not authenticated"));
        }

        // Find approval history for this expense request
        ApprovalHistory approvalHistory = approvalHistoryRepository
                .findByApprovalTypeAndRelatedEntityIdAndStatus(
                        ApprovalType.EXPENSE_REQUEST, id, ApprovalStatus.PENDING)
                .orElse(null);

        if (approvalHistory == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Pending approval not found for this expense request"));
        }

        String reason = body.getOrDefault("reason", "");
        try {
            notificationService.rejectRequest(approvalHistory.getId(), userId, reason);
            return ResponseEntity.ok(Map.of("message", "Expense request rejected"));
        } catch (Exception e) {
            log.error("Error rejecting expense request", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Helper: Get current user ID from authentication
     */
    private Integer getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof org.example.ptcmssbackend.entity.Users) {
            org.example.ptcmssbackend.entity.Users user =
                    (org.example.ptcmssbackend.entity.Users) authentication.getPrincipal();
            return user.getId();
        }
        return null;
    }
}