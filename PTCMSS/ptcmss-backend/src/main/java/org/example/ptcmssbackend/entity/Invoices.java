package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.converter.InvoiceTypeConverter;
import org.example.ptcmssbackend.enums.InvoiceStatus;
import org.example.ptcmssbackend.enums.InvoiceType;
import org.example.ptcmssbackend.enums.PaymentStatus;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "invoices")
public class Invoices {
    @Id
    @Column(name = "invoiceId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Size(max = 50)
    @Column(name = "invoiceNumber", unique = true, length = 50)
    private String invoiceNumber;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bookingId")
    private Bookings booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customerId")
    private Customers customer;

    @NotNull
    @Convert(converter = InvoiceTypeConverter.class)
    @Column(name = "type", nullable = false)
    private InvoiceType type;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "isDeposit", nullable = false)
    private Boolean isDeposit = false;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "paymentStatus")
    private PaymentStatus paymentStatus= PaymentStatus.UNPAID;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private InvoiceStatus status= InvoiceStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "invoiceDate")
    private Instant invoiceDate;

    @Column(name = "dueDate")
    private LocalDate dueDate;

    @Size(max = 20)
    @Column(name = "paymentTerms", length = 20)
    private String paymentTerms = "NET_7"; // NET_7, NET_14, NET_30, NET_60

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

    @Size(max = 255)
    @Column(name = "img")
    private String img;

    @Size(max = 255)
    @Column(name = "note")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createdBy")
    private Employees createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approvedBy")
    private Employees approvedBy;

    @Column(name = "approvedAt")
    private Instant approvedAt;

    // Cancellation
    @Column(name = "cancelledAt")
    private Instant cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelledBy")
    private Employees cancelledBy;

    @Size(max = 500)
    @Column(name = "cancellationReason", length = 500)
    private String cancellationReason;

    // Sending
    @Column(name = "sentAt")
    private Instant sentAt;

    @Size(max = 100)
    @Column(name = "sentToEmail", length = 100)
    private String sentToEmail;

    // Debt management
    @Column(name = "promiseToPayDate")
    private LocalDate promiseToPayDate;

    @Size(max = 50)
    @Column(name = "debtLabel", length = 50)
    private String debtLabel; // VIP, TRANH_CHAP, NORMAL

    @Lob
    @Column(name = "contactNote", columnDefinition = "TEXT")
    private String contactNote;

}
