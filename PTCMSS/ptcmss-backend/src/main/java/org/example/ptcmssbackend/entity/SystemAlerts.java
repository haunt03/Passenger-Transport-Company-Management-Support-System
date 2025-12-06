                package org.example.ptcmssbackend.entity;

                import jakarta.persistence.*;
                import jakarta.validation.constraints.NotNull;
                import jakarta.validation.constraints.Size;
                import lombok.*;
                import org.example.ptcmssbackend.enums.AlertSeverity;
                import org.example.ptcmssbackend.enums.AlertType;
                import org.hibernate.annotations.CreationTimestamp;

                import java.time.Instant;

/**
 * SystemAlerts - Cảnh báo hệ thống
 * 
 * Các loại cảnh báo:
 * - VEHICLE_INSPECTION_EXPIRING: Xe sắp hết đăng kiểm
 * - VEHICLE_INSURANCE_EXPIRING: Bảo hiểm xe sắp hết hạn
 * - DRIVER_LICENSE_EXPIRING: Bằng lái sắp hết hạn
 * - DRIVER_HEALTH_CHECK_DUE: Sắp đến hạn khám sức khỏe
 * - SCHEDULE_CONFLICT: Xung đột lịch
 * - DRIVING_HOURS_EXCEEDED: Vượt giới hạn giờ lái
 */
@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "system_alerts")
public class SystemAlerts {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alertId")
    private Integer id;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "alertType", nullable = false, length = 50)
    private AlertType alertType;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private AlertSeverity severity;
    
    @Size(max = 200)
    @Column(name = "title", length = 200)
    private String title;
    
    @Size(max = 1000)
    @Column(name = "message", length = 1000)
    private String message;
    
    // Reference to related entity (driver, vehicle, trip, etc.)
    @Column(name = "relatedEntityType", length = 50)
    private String relatedEntityType; // DRIVER, VEHICLE, TRIP, etc.
    
    @Column(name = "relatedEntityId")
    private Integer relatedEntityId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branchId")
    private Branches branch;
    
    @Column(name = "isAcknowledged")
    @Builder.Default
    private Boolean isAcknowledged = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledgedBy")
    private Users acknowledgedBy;
    
    @Column(name = "acknowledgedAt")
    private Instant acknowledgedAt;
    
    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;
    
    @Column(name = "expiresAt")
    private Instant expiresAt; // Thời điểm cảnh báo hết hiệu lực
}
