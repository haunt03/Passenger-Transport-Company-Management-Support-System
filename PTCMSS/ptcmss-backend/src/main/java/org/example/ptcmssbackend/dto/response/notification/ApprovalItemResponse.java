package org.example.ptcmssbackend.dto.response.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.ApprovalStatus;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalItemResponse {
    private Integer id;
    private ApprovalType approvalType;
    private Integer relatedEntityId;
    private ApprovalStatus status;
    private Integer requestedBy;
    private String requestedByName;
    private String requestReason;
    private Integer approvedBy;
    private String approvedByName;
    private String approvalNote;
    private Instant requestedAt;
    private Instant processedAt;
    private Integer branchId;
    private String branchName;

    // Additional details based on type
    private Object details; // DriverDayOffDetails, ExpenseRequestDetails, etc.
}
