package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "payment_history")
public class PaymentHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "paymentId")
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoiceId", nullable = false)
    private Invoices invoice;

    @NotNull
    @Column(name = "paymentDate", nullable = false)
    private Instant paymentDate;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @NotNull
    @Size(max = 50)
    @Column(name = "paymentMethod", nullable = false, length = 50)
    private String paymentMethod; // CASH, BANK_TRANSFER, QR, CREDIT_CARD

    // Bank transfer fields
    @Size(max = 100)
    @Column(name = "bankName", length = 100)
    private String bankName;

    @Size(max = 50)
    @Column(name = "bankAccount", length = 50)
    private String bankAccount;

    @Size(max = 50)
    @Column(name = "referenceNumber", length = 50)
    private String referenceNumber;

    // Cash fields
    @Size(max = 100)
    @Column(name = "cashierName", length = 100)
    private String cashierName;

    @Size(max = 50)
    @Column(name = "receiptNumber", length = 50)
    private String receiptNumber;

    @Size(max = 500)
    @Column(name = "note", length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createdBy")
    private Employees createdBy;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;
}
