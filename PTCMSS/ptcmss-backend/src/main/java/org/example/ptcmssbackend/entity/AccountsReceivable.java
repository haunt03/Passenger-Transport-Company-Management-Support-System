package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.ARStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
public class AccountsReceivable {
    @Id
    @Column(name = "arId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customerId", nullable = false)
    private Customers customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bookingId")
    private Bookings booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoiceId")
    private Invoices invoice;

    @Column(name = "totalAmount", precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paidAmount", precision = 18, scale = 2)
    private BigDecimal paidAmount;

    @Formula("(totalAmount - paidAmount)")
    @Column(name = "remainingAmount", precision = 18, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "dueDate")
    private LocalDate dueDate;

    @Column(name = "lastPaymentDate")
    private LocalDate lastPaymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ARStatus status = ARStatus.UNPAID;

    @Size(max = 255)
    @Column(name = "note")
    private String note;

    @CreationTimestamp // Tự động gán thời gian khi tạo
    @Column(name = "createdAt")
    private Instant createdAt;

    @UpdateTimestamp // Tự động gán thời gian khi cập nhật
    @Column(name = "updatedAt")
    private Instant updatedAt;

}