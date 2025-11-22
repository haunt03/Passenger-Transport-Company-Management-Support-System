package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.example.ptcmssbackend.enums.ApprovalType;
import org.example.ptcmssbackend.enums.ApprovalStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * ApprovalHistory - Lịch sử phê duyệt
 * 
 * Lưu trữ tất cả các hành động approve/reject:
 * - Nghỉ phép tài xế (DriverDayOff)
 * - Yêu cầu giảm giá (Discount Request)
 * - Yêu cầu tạm ứng (Expense Request)
 * - Thay đổi lịch trình (Schedule Change)
 */
@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "Approval_history")
public class ApprovalHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "historyId")
    private Integer id;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "approvalType", nullable = false, length = 50)
    private ApprovalType approvalType;
    
    @NotNull
    @Column(name = "relatedEntityId", nullable = false)
    private Integer relatedEntityId; // ID của entity cần approve (dayOffId, expenseRequestId, etc.)
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApprovalStatus status;
    
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requestedBy", nullable = false)
    private Users requestedBy; // Người yêu cầu
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approvedBy")
    private Users approvedBy; // Người phê duyệt
    
    @Size(max = 500)
    @Column(name = "requestReason", length = 500)
    private String requestReason;
    
    @Size(max = 500)
    @Column(name = "approvalNote", length = 500)
    private String approvalNote; // Ghi chú khi approve/reject
    
    @CreationTimestamp
    @Column(name = "requestedAt")
    private Instant requestedAt;
    
    @Column(name = "processedAt")
    private Instant processedAt; // Thời điểm approve/reject
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branchId")
    private Branches branch;
}
