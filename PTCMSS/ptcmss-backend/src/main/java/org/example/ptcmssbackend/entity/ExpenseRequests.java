package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.ExpenseRequestStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
@Getter
@Setter
@Entity
@Table(name = "expense_requests")
public class ExpenseRequests {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "expenseRequestId")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicleId")
    private Vehicles vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requesterId")
    private Users requester;

    @Column(name = "expenseType", nullable = false, length = 100)
    private String type;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "note", length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ExpenseRequestStatus status = ExpenseRequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "createdAt", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updatedAt")
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approvedBy")
    private Users approvedBy;

    @Column(name = "approvedAt")
    private Instant approvedAt;

    @Column(name = "rejectionReason", length = 500)
    private String rejectionReason;

    @Column(name = "receiptImages", columnDefinition = "TEXT")
    private String receiptImages; // JSON array of image URLs: ["/uploads/file1.jpg", "/uploads/file2.jpg"]
}
