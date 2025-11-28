package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "bookings")
public class Bookings {
    @Id
    @Column(name = "bookingId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customerId", nullable = false)
    private Customers customer;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultantId")
    private Employees consultant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hireTypeId")
    private HireTypes hireType;

    @Column(name = "useHighway")
    private Boolean useHighway;

    @ColumnDefault("0")
    @Column(name = "isHoliday")
    private Boolean isHoliday = false;

    @ColumnDefault("0")
    @Column(name = "isWeekend")
    private Boolean isWeekend = false;

    @ColumnDefault("0")
    @Column(name = "additionalPickupPoints")
    private Integer additionalPickupPoints = 0;

    @ColumnDefault("0")
    @Column(name = "additionalDropoffPoints")
    private Integer additionalDropoffPoints = 0;

    @CreationTimestamp // Gán thời gian khi tạo booking
    @Column(name = "bookingDate")
    private Instant bookingDate;

    @Column(name = "estimatedCost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @ColumnDefault("0.00")
    @Column(name = "depositAmount", precision = 12, scale = 2)
    private BigDecimal depositAmount;

    @ColumnDefault("0.00")
    @Column(name = "totalCost", precision = 12, scale = 2)
    private BigDecimal totalCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BookingStatus status = BookingStatus.PENDING;

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