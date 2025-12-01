package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.analytics.*;
import org.example.ptcmssbackend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin Dashboard Controller - Module 7
 * Reporting & Analytics for Admin role
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Dashboard", description = "Analytics and reporting for Admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final AnalyticsService analyticsService;

    /**
     * Get Admin Dashboard overview
     * GET /api/v1/admin/dashboard?period=THIS_MONTH
     */
    @GetMapping("/dashboard")
    @Operation(summary = "Get admin dashboard overview", description = "Returns KPIs and metrics for entire company")
    public ResponseEntity<AdminDashboardResponse> getAdminDashboard(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period
    ) {
        log.info("GET /api/v1/admin/dashboard - period: {}", period);
        AdminDashboardResponse response = analyticsService.getAdminDashboard(period);
        return ResponseEntity.ok(response);
    }

    /**
     * Get revenue & expense trend (12 months)
     * GET /api/v1/admin/analytics/revenue-trend
     */
    @GetMapping("/analytics/revenue-trend")
    @Operation(summary = "Get revenue trend", description = "Returns revenue/expense data for last 12 months")
    public ResponseEntity<List<RevenueTrendDTO>> getRevenueTrend() {
        log.info("GET /api/v1/admin/analytics/revenue-trend");
        List<RevenueTrendDTO> trend = analyticsService.getRevenueTrend();
        return ResponseEntity.ok(trend);
    }

    /**
     * Get branch performance comparison
     * GET /api/v1/admin/analytics/branch-comparison?period=THIS_MONTH
     */
    @GetMapping("/analytics/branch-comparison")
    @Operation(summary = "Get branch comparison", description = "Compare performance across all branches")
    public ResponseEntity<List<BranchComparisonDTO>> getBranchComparison(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period
    ) {
        log.info("GET /api/v1/admin/analytics/branch-comparison - period: {}", period);
        List<BranchComparisonDTO> comparison = analyticsService.getBranchComparison(period);
        return ResponseEntity.ok(comparison);
    }

    /**
     * Get fleet utilization statistics
     * GET /api/v1/admin/analytics/fleet-utilization
     */
    @GetMapping("/analytics/fleet-utilization")
    @Operation(summary = "Get fleet utilization", description = "Returns fleet usage stats by branch")
    public ResponseEntity<List<BranchComparisonDTO>> getFleetUtilization() {
        log.info("GET /api/v1/admin/analytics/fleet-utilization");
        // Reuse branch comparison with vehicle focus
        List<BranchComparisonDTO> fleet = analyticsService.getBranchComparison("THIS_MONTH");
        return ResponseEntity.ok(fleet);
    }

    /**
     * Get top routes
     * GET /api/v1/admin/analytics/top-routes?period=THIS_MONTH&limit=5
     */
    @GetMapping("/analytics/top-routes")
    @Operation(summary = "Get top routes", description = "Returns most popular routes")
    public ResponseEntity<List<Map<String, Object>>> getTopRoutes(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String period,
            @RequestParam(required = false, defaultValue = "5") Integer limit
    ) {
        log.info("GET /api/v1/admin/analytics/top-routes - period: {}, limit: {}", period, limit);
        List<Map<String, Object>> routes = analyticsService.getTopRoutes(period, limit);
        return ResponseEntity.ok(routes);
    }

    /**
     * Get system alerts
     * GET /api/v1/admin/alerts?severity=HIGH,CRITICAL
     */
    @GetMapping("/alerts")
    @Operation(summary = "Get system alerts", description = "Returns system warnings and alerts")
    public ResponseEntity<List<SystemAlertDTO>> getSystemAlerts(
            @RequestParam(required = false) String severity
    ) {
        log.info("GET /api/v1/admin/alerts - severity: {}", severity);
        List<SystemAlertDTO> alerts = analyticsService.getSystemAlerts(severity);
        return ResponseEntity.ok(alerts);
    }

    /**
     * Acknowledge alert
     * POST /api/v1/admin/alerts/{alertId}/acknowledge
     */
    @PostMapping("/alerts/{alertId}/acknowledge")
    @Operation(summary = "Acknowledge alert", description = "Mark alert as acknowledged")
    public ResponseEntity<Map<String, String>> acknowledgeAlert(@PathVariable Integer alertId) {
        log.info("POST /api/v1/admin/alerts/{}/acknowledge", alertId);

        // Note: System alerts are generated dynamically, so we don't store them in DB
        // This endpoint is for future implementation if we want to track acknowledged alerts
        // For now, we just return success
        return ResponseEntity.ok(Map.of("message", "Alert acknowledged"));
    }

    /**
     * Get pending approvals
     * GET /api/v1/admin/approvals/pending
     */
    @GetMapping("/approvals/pending")
    @Operation(summary = "Get pending approvals", description = "Returns all pending approval requests")
    public ResponseEntity<List<Map<String, Object>>> getPendingApprovals() {
        log.info("GET /api/v1/admin/approvals/pending");
        // Pass null branchId to get all pending approvals
        List<Map<String, Object>> approvals = analyticsService.getPendingApprovals(null);
        return ResponseEntity.ok(approvals);
    }
}
