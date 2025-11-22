package org.example.ptcmssbackend.dto.response.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.AlertType;
import org.example.ptcmssbackend.enums.AlertSeverity;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private Integer id;
    private AlertType alertType;
    private AlertSeverity severity;
    private String title;
    private String message;
    private String relatedEntityType;
    private Integer relatedEntityId;
    private Integer branchId;
    private String branchName;
    private Boolean isAcknowledged;
    private Integer acknowledgedBy;
    private String acknowledgedByName;
    private Instant acknowledgedAt;
    private Instant createdAt;
    private Instant expiresAt;
}
