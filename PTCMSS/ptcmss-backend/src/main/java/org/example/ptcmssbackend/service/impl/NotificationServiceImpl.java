package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.response.notification.AlertResponse;
import org.example.ptcmssbackend.dto.response.notification.ApprovalItemResponse;
import org.example.ptcmssbackend.dto.response.notification.NotificationDashboardResponse;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.*;
import org.example.ptcmssbackend.repository.*;
import org.example.ptcmssbackend.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {
    
    private final SystemAlertsRepository alertsRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverDayOffRepository driverDayOffRepository;
    private final ExpenseRequestRepository expenseRequestRepository;
    private final UsersRepository userRepository;
    private final TripDriverRepository tripDriverRepository;
    
    private static final int EXPIRY_WARNING_DAYS = 30; // Cảnh báo trước 30 ngày
    private static final int CRITICAL_WARNING_DAYS = 7; // Cảnh báo khẩn cấp trước 7 ngày
    
    @Override
    public List<AlertResponse> getAllAlerts(Integer branchId) {
        log.info("[Notification] Get all alerts for branch {}", branchId);
        
        List<SystemAlerts> alerts;
        if (branchId == null) {
            // Admin xem tất cả
            alerts = alertsRepository.findByIsAcknowledgedFalseOrderByCreatedAtDesc();
        } else {
            alerts = alertsRepository.findByBranch_IdAndIsAcknowledgedFalseOrderByCreatedAtDesc(branchId);
        }
        
        return alerts.stream().map(this::mapToAlertResponse).collect(Collectors.toList());
    }
    
    @Override
    public AlertResponse acknowledgeAlert(Integer alertId, Integer userId) {
        log.info("[Notification] Acknowledge alert {} by user {}", alertId, userId);
        
        SystemAlerts alert = alertsRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + alertId));
        
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        alert.setIsAcknowledged(true);
        alert.setAcknowledgedBy(user);
        alert.setAcknowledgedAt(Instant.now());
        
        alertsRepository.save(alert);
        
        return mapToAlertResponse(alert);
    }
    
    @Override
    @Scheduled(cron = "0 0 6 * * *") // Chạy mỗi ngày lúc 6h sáng
    public void generateSystemAlerts() {
        log.info("[Notification] Generating system alerts...");
        
        try {
            generateVehicleInspectionAlerts();
            generateVehicleInsuranceAlerts();
            generateDriverLicenseAlerts();
            generateDriverHealthCheckAlerts();
            
            // Xóa alerts đã hết hạn
            alertsRepository.deleteExpiredAlerts(Instant.now());
            
            log.info("[Notification] System alerts generated successfully");
        } catch (Exception e) {
            log.error("[Notification] Failed to generate system alerts", e);
        }
    }
    
    private void generateVehicleInspectionAlerts() {
        List<Vehicles> vehicles = vehicleRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(EXPIRY_WARNING_DAYS);
        LocalDate criticalDate = today.plusDays(CRITICAL_WARNING_DAYS);
        
        for (Vehicles vehicle : vehicles) {
            if (vehicle.getInspectionExpiry() == null) continue;
            
            LocalDate expiry = vehicle.getInspectionExpiry();
            if (expiry.isBefore(today)) {
                // Đã hết hạn
                createOrUpdateAlert(
                        AlertType.VEHICLE_INSPECTION_EXPIRING,
                        AlertSeverity.CRITICAL,
                        "Xe đã hết hạn đăng kiểm",
                        String.format("Xe %s đã hết hạn đăng kiểm từ ngày %s", 
                                vehicle.getLicensePlate(), expiry),
                        "VEHICLE",
                        vehicle.getId(),
                        vehicle.getBranch()
                );
            } else if (expiry.isBefore(criticalDate)) {
                // Sắp hết hạn (< 7 ngày)
                long daysLeft = ChronoUnit.DAYS.between(today, expiry);
                createOrUpdateAlert(
                        AlertType.VEHICLE_INSPECTION_EXPIRING,
                        AlertSeverity.HIGH,
                        "Xe sắp hết hạn đăng kiểm",
                        String.format("Xe %s sẽ hết hạn đăng kiểm trong %d ngày (ngày %s)", 
                                vehicle.getLicensePlate(), daysLeft, expiry),
                        "VEHICLE",
                        vehicle.getId(),
                        vehicle.getBranch()
                );
            } else if (expiry.isBefore(warningDate)) {
                // Cảnh báo trước (< 30 ngày)
                long daysLeft = ChronoUnit.DAYS.between(today, expiry);
                createOrUpdateAlert(
                        AlertType.VEHICLE_INSPECTION_EXPIRING,
                        AlertSeverity.MEDIUM,
                        "Xe sắp hết hạn đăng kiểm",
                        String.format("Xe %s sẽ hết hạn đăng kiểm trong %d ngày (ngày %s)", 
                                vehicle.getLicensePlate(), daysLeft, expiry),
                        "VEHICLE",
                        vehicle.getId(),
                        vehicle.getBranch()
                );
            }
        }
    }
    
    private void generateVehicleInsuranceAlerts() {
        List<Vehicles> vehicles = vehicleRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(EXPIRY_WARNING_DAYS);
        LocalDate criticalDate = today.plusDays(CRITICAL_WARNING_DAYS);
        
        for (Vehicles vehicle : vehicles) {
            if (vehicle.getInsuranceExpiry() == null) continue;
            
            LocalDate expiry = vehicle.getInsuranceExpiry();
            AlertSeverity severity = AlertSeverity.MEDIUM;
            
            if (expiry.isBefore(today)) {
                severity = AlertSeverity.CRITICAL;
            } else if (expiry.isBefore(criticalDate)) {
                severity = AlertSeverity.HIGH;
            } else if (!expiry.isBefore(warningDate)) {
                continue; // Chưa cần cảnh báo
            }
            
            long daysLeft = ChronoUnit.DAYS.between(today, expiry);
            String message = daysLeft < 0 
                    ? String.format("Bảo hiểm xe %s đã hết hạn từ ngày %s", vehicle.getLicensePlate(), expiry)
                    : String.format("Bảo hiểm xe %s sẽ hết hạn trong %d ngày (ngày %s)", 
                            vehicle.getLicensePlate(), daysLeft, expiry);
            
            createOrUpdateAlert(
                    AlertType.VEHICLE_INSURANCE_EXPIRING,
                    severity,
                    "Bảo hiểm xe sắp hết hạn",
                    message,
                    "VEHICLE",
                    vehicle.getId(),
                    vehicle.getBranch()
            );
        }
    }
    
    private void generateDriverLicenseAlerts() {
        List<Drivers> drivers = driverRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(EXPIRY_WARNING_DAYS);
        LocalDate criticalDate = today.plusDays(CRITICAL_WARNING_DAYS);
        
        for (Drivers driver : drivers) {
            if (driver.getLicenseExpiry() == null) continue;
            
            LocalDate expiry = driver.getLicenseExpiry();
            AlertSeverity severity = AlertSeverity.MEDIUM;
            
            if (expiry.isBefore(today)) {
                severity = AlertSeverity.CRITICAL;
            } else if (expiry.isBefore(criticalDate)) {
                severity = AlertSeverity.HIGH;
            } else if (!expiry.isBefore(warningDate)) {
                continue;
            }
            
            long daysLeft = ChronoUnit.DAYS.between(today, expiry);
            String driverName = extractDriverName(driver);
            String message = daysLeft < 0 
                    ? String.format("Bằng lái của tài xế %s đã hết hạn từ ngày %s", driverName, expiry)
                    : String.format("Bằng lái của tài xế %s sẽ hết hạn trong %d ngày (ngày %s)", 
                            driverName, daysLeft, expiry);
            
            createOrUpdateAlert(
                    AlertType.DRIVER_LICENSE_EXPIRING,
                    severity,
                    "Bằng lái sắp hết hạn",
                    message,
                    "DRIVER",
                    driver.getId(),
                    driver.getBranch()
            );
        }
    }
    
    private void generateDriverHealthCheckAlerts() {
        List<Drivers> drivers = driverRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(EXPIRY_WARNING_DAYS);
        
        for (Drivers driver : drivers) {
            if (driver.getHealthCheckDate() == null) continue;
            
            // Giả sử khám sức khỏe định kỳ 1 năm/lần
            LocalDate nextCheckDue = driver.getHealthCheckDate().plusYears(1);
            
            if (nextCheckDue.isBefore(warningDate)) {
                long daysLeft = ChronoUnit.DAYS.between(today, nextCheckDue);
                String driverName = extractDriverName(driver);
                AlertSeverity severity = daysLeft < CRITICAL_WARNING_DAYS ? AlertSeverity.HIGH : AlertSeverity.MEDIUM;
                
                String message = daysLeft < 0 
                        ? String.format("Tài xế %s đã quá hạn khám sức khỏe định kỳ", driverName)
                        : String.format("Tài xế %s cần khám sức khỏe định kỳ trong %d ngày", driverName, daysLeft);
                
                createOrUpdateAlert(
                        AlertType.DRIVER_HEALTH_CHECK_DUE,
                        severity,
                        "Sắp đến hạn khám sức khỏe",
                        message,
                        "DRIVER",
                        driver.getId(),
                        driver.getBranch()
                );
            }
        }
    }
    
    private void createOrUpdateAlert(
            AlertType type,
            AlertSeverity severity,
            String title,
            String message,
            String entityType,
            Integer entityId,
            Branches branch) {
        
        // Kiểm tra xem đã có alert tương tự chưa
        List<SystemAlerts> existing = alertsRepository
                .findByRelatedEntityTypeAndRelatedEntityIdAndIsAcknowledgedFalse(entityType, entityId);
        
        boolean found = existing.stream()
                .anyMatch(a -> a.getAlertType() == type);
        
        if (!found) {
            SystemAlerts alert = SystemAlerts.builder()
                    .alertType(type)
                    .severity(severity)
                    .title(title)
                    .message(message)
                    .relatedEntityType(entityType)
                    .relatedEntityId(entityId)
                    .branch(branch)
                    .isAcknowledged(false)
                    .expiresAt(Instant.now().plus(90, ChronoUnit.DAYS)) // Hết hạn sau 90 ngày
                    .build();
            
            alertsRepository.save(alert);
            log.debug("[Notification] Created alert: {} for {} {}", type, entityType, entityId);
        }
    }
    
    @Override
    public List<ApprovalItemResponse> getPendingApprovals(Integer branchId) {
        log.info("[Notification] Get pending approvals for branch {}", branchId);
        
        List<ApprovalHistory> approvals;
        if (branchId == null) {
            approvals = approvalHistoryRepository.findByStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING);
        } else {
            approvals = approvalHistoryRepository.findByBranch_IdAndStatusOrderByRequestedAtDesc(
                    branchId, ApprovalStatus.PENDING);
        }
        
        log.info("[Notification] Found {} pending approvals", approvals.size());
        
        List<ApprovalItemResponse> result = approvals.stream()
                .map(this::mapToApprovalItemResponse)
                .collect(Collectors.toList());
        
        log.info("[Notification] Mapped {} approval responses", result.size());
        
        return result;
    }

    @Override
    public List<ApprovalItemResponse> getProcessedApprovals(Integer branchId, Integer limit) {
        log.info("[Notification] Get processed approvals for branch {} (limit: {})", branchId, limit);

        List<ApprovalHistory> approved = branchId == null
                ? approvalHistoryRepository.findByStatusOrderByRequestedAtDesc(ApprovalStatus.APPROVED)
                : approvalHistoryRepository.findByBranch_IdAndStatusOrderByRequestedAtDesc(branchId, ApprovalStatus.APPROVED);

        List<ApprovalHistory> rejected = branchId == null
                ? approvalHistoryRepository.findByStatusOrderByRequestedAtDesc(ApprovalStatus.REJECTED)
                : approvalHistoryRepository.findByBranch_IdAndStatusOrderByRequestedAtDesc(branchId, ApprovalStatus.REJECTED);

        // Gộp và sắp xếp theo processedAt (mới nhất trước)
        List<ApprovalHistory> allProcessed = new ArrayList<>();
        allProcessed.addAll(approved);
        allProcessed.addAll(rejected);

        // Sắp xếp theo processedAt DESC (nếu có) hoặc requestedAt DESC
        allProcessed.sort((a, b) -> {
            Instant aTime = a.getProcessedAt() != null ? a.getProcessedAt() : a.getRequestedAt();
            Instant bTime = b.getProcessedAt() != null ? b.getProcessedAt() : b.getRequestedAt();
            return bTime.compareTo(aTime); // DESC
        });

        // Giới hạn số lượng
        if (limit != null && limit > 0) {
            allProcessed = allProcessed.stream().limit(limit).collect(Collectors.toList());
        }

        log.info("[Notification] Found {} processed approvals", allProcessed.size());

        return allProcessed.stream()
                .map(this::mapToApprovalItemResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    public ApprovalItemResponse approveRequest(Integer historyId, Integer userId, String note) {
        log.info("[Notification] Approve request {} by user {}", historyId, userId);
        
        ApprovalHistory history = approvalHistoryRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("Approval history not found: " + historyId));
        
        if (history.getStatus() != ApprovalStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }
        
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        history.setStatus(ApprovalStatus.APPROVED);
        history.setApprovedBy(user);
        history.setApprovalNote(note);
        history.setProcessedAt(Instant.now());
        
        approvalHistoryRepository.save(history);
        
        // Cập nhật entity liên quan
        updateRelatedEntity(history, true);
        
        return mapToApprovalItemResponse(history);
    }
    
    @Override
    public ApprovalItemResponse rejectRequest(Integer historyId, Integer userId, String note) {
        log.info("[Notification] Reject request {} by user {}", historyId, userId);
        
        ApprovalHistory history = approvalHistoryRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("Approval history not found: " + historyId));
        
        if (history.getStatus() != ApprovalStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }
        
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        history.setStatus(ApprovalStatus.REJECTED);
        history.setApprovedBy(user);
        history.setApprovalNote(note);
        history.setProcessedAt(Instant.now());
        
        approvalHistoryRepository.save(history);
        
        // Cập nhật entity liên quan
        updateRelatedEntity(history, false);
        
        return mapToApprovalItemResponse(history);
    }
    
    private void updateRelatedEntity(ApprovalHistory history, boolean approved) {
        switch (history.getApprovalType()) {
            case DRIVER_DAY_OFF:
                DriverDayOff dayOff = driverDayOffRepository.findById(history.getRelatedEntityId())
                        .orElse(null);
                if (dayOff != null) {
                    dayOff.setStatus(approved ? DriverDayOffStatus.APPROVED : DriverDayOffStatus.REJECTED);
                    // ApprovedBy trong DriverDayOff là Employees, cần tìm employee từ user
                    if (history.getApprovedBy() != null) {
                        // Tìm employee từ userId (giả sử có quan hệ)
                        // Tạm thời set null nếu không tìm được
                        dayOff.setApprovedBy(null);
                    }
                    driverDayOffRepository.save(dayOff);
                }
                break;
                
            case EXPENSE_REQUEST:
                ExpenseRequests expenseRequest = expenseRequestRepository.findById(history.getRelatedEntityId())
                        .orElse(null);
                if (expenseRequest != null) {
                    expenseRequest.setStatus(approved ? ExpenseRequestStatus.APPROVED : ExpenseRequestStatus.REJECTED);
                    expenseRequest.setApprovedBy(history.getApprovedBy());
                    expenseRequest.setApprovedAt(Instant.now());
                    if (!approved && history.getApprovalNote() != null) {
                        expenseRequest.setRejectionReason(history.getApprovalNote());
                    }
                    expenseRequestRepository.save(expenseRequest);
                }
                break;
                
            // TODO: Add other approval types
            default:
                log.warn("[Notification] Unknown approval type: {}", history.getApprovalType());
        }
    }
    
    @Override
    public NotificationDashboardResponse getDashboard(Integer branchId) {
        log.info("[Notification] Get notification dashboard for branch {}", branchId);
        
        List<AlertResponse> alerts = getAllAlerts(branchId);
        List<ApprovalItemResponse> pendingApprovals = getPendingApprovals(branchId);
        
        // Calculate stats
        long totalAlerts = branchId == null 
                ? alertsRepository.countByIsAcknowledgedFalse()
                : alertsRepository.countByBranch_IdAndIsAcknowledgedFalse(branchId);
        
        long criticalAlerts = alerts.stream()
                .filter(a -> a.getSeverity() == AlertSeverity.CRITICAL)
                .count();
        
        long highAlerts = alerts.stream()
                .filter(a -> a.getSeverity() == AlertSeverity.HIGH)
                .count();
        
        long totalPendingApprovals = branchId == null
                ? approvalHistoryRepository.countByStatus(ApprovalStatus.PENDING)
                : approvalHistoryRepository.countByBranch_IdAndStatus(branchId, ApprovalStatus.PENDING);
        
        Map<ApprovalType, Long> approvalCounts = pendingApprovals.stream()
                .collect(Collectors.groupingBy(ApprovalItemResponse::getApprovalType, Collectors.counting()));
        
        NotificationDashboardResponse.NotificationStats stats = NotificationDashboardResponse.NotificationStats.builder()
                .totalAlerts(totalAlerts)
                .criticalAlerts(criticalAlerts)
                .highAlerts(highAlerts)
                .totalPendingApprovals(totalPendingApprovals)
                .driverDayOffRequests(approvalCounts.getOrDefault(ApprovalType.DRIVER_DAY_OFF, 0L))
                .expenseRequests(approvalCounts.getOrDefault(ApprovalType.EXPENSE_REQUEST, 0L))
                .discountRequests(approvalCounts.getOrDefault(ApprovalType.DISCOUNT_REQUEST, 0L))
                .build();
        
        return NotificationDashboardResponse.builder()
                .alerts(alerts)
                .pendingApprovals(pendingApprovals)
                .stats(stats)
                .build();
    }
    
    private AlertResponse mapToAlertResponse(SystemAlerts alert) {
        return AlertResponse.builder()
                .id(alert.getId())
                .alertType(alert.getAlertType())
                .severity(alert.getSeverity())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .relatedEntityType(alert.getRelatedEntityType())
                .relatedEntityId(alert.getRelatedEntityId())
                .branchId(alert.getBranch() != null ? alert.getBranch().getId() : null)
                .branchName(alert.getBranch() != null ? alert.getBranch().getBranchName() : null)
                .isAcknowledged(alert.getIsAcknowledged())
                .acknowledgedBy(alert.getAcknowledgedBy() != null ? alert.getAcknowledgedBy().getId() : null)
                .acknowledgedByName(alert.getAcknowledgedBy() != null ? alert.getAcknowledgedBy().getFullName() : null)
                .acknowledgedAt(alert.getAcknowledgedAt())
                .createdAt(alert.getCreatedAt())
                .expiresAt(alert.getExpiresAt())
                .build();
    }
    
    private ApprovalItemResponse mapToApprovalItemResponse(ApprovalHistory history) {
        Object details = null;
        
        // Load details based on approval type
        if (history.getApprovalType() == ApprovalType.DRIVER_DAY_OFF) {
            DriverDayOff dayOff = driverDayOffRepository.findById(history.getRelatedEntityId()).orElse(null);
            if (dayOff != null) {
                details = Map.of(
                        "startDate", dayOff.getStartDate(),
                        "endDate", dayOff.getEndDate(),
                        "reason", dayOff.getReason() != null ? dayOff.getReason() : "",
                        "driverId", dayOff.getDriver().getId(),
                        "driverName", extractDriverName(dayOff.getDriver())
                );
            }
        } else if (history.getApprovalType() == ApprovalType.EXPENSE_REQUEST) {
            ExpenseRequests expense = expenseRequestRepository.findById(history.getRelatedEntityId()).orElse(null);
            if (expense != null) {
                details = Map.of(
                        "amount", expense.getAmount(),
                        "type", expense.getType() != null ? expense.getType() : "",
                        "note", expense.getNote() != null ? expense.getNote() : "",
                        "requesterId", expense.getRequester() != null ? expense.getRequester().getId() : 0,
                        "requesterName", expense.getRequester() != null ? expense.getRequester().getFullName() : ""
                );
            }
        }
        
        return ApprovalItemResponse.builder()
                .id(history.getId())
                .approvalType(history.getApprovalType())
                .relatedEntityId(history.getRelatedEntityId())
                .status(history.getStatus())
                .requestedBy(history.getRequestedBy().getId())
                .requestedByName(history.getRequestedBy().getFullName())
                .requestReason(history.getRequestReason())
                .approvedBy(history.getApprovedBy() != null ? history.getApprovedBy().getId() : null)
                .approvedByName(history.getApprovedBy() != null ? history.getApprovedBy().getFullName() : null)
                .approvalNote(history.getApprovalNote())
                .requestedAt(history.getRequestedAt())
                .processedAt(history.getProcessedAt())
                .branchId(history.getBranch() != null ? history.getBranch().getId() : null)
                .branchName(history.getBranch() != null ? history.getBranch().getBranchName() : null)
                .details(details)
                .build();
    }
    
    private String extractDriverName(Drivers driver) {
        if (driver.getEmployee() != null && driver.getEmployee().getUser() != null) {
            return driver.getEmployee().getUser().getFullName();
        }
        return "Driver #" + driver.getId();
    }
}
