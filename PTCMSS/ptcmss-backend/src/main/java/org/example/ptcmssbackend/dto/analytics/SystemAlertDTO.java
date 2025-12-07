package org.example.ptcmssbackend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * System Alert DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemAlertDTO {

    private Integer alertId;
    private String alertType; // VEHICLE_INSPECTION_EXPIRING, DRIVER_LICENSE_EXPIRING, INVOICE_OVERDUE, APPROVAL_PENDING
    private String severity; // CRITICAL, HIGH, MEDIUM, LOW
    private String message;

    // Related entity info
    private Integer relatedEntityId;
    private String relatedEntityType; // VEHICLE, DRIVER, INVOICE, APPROVAL

    // Specific details
    private String licensePlate; // For vehicle alerts
    private String driverName; // For driver alerts
    private String licenseNumber; // For driver license
    private String invoiceNumber; // For invoice alerts
    private String approvalType; // For approval alerts

    private LocalDate expiryDate;
    private LocalDate dueDate;
    private Integer daysUntilExpiry;
    private Integer daysOverdue;

    private String branchName;
    private Integer branchId;

    private String createdAt;
    private Boolean acknowledged;
}
