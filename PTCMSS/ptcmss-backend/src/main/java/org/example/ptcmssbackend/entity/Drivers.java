package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.DriverStatus;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "drivers")
public class Drivers {
    @Id
    @Column(name = "driverId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employeeId", nullable = false)
    private Employees employee;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @Size(max = 50)
    @NotNull
    @Column(name = "licenseNumber", nullable = false, length = 50)
    private String licenseNumber;

    @Size(max = 10)
    @Column(name = "licenseClass", length = 10)
    private String licenseClass;

    @Column(name = "licenseExpiry")
    private LocalDate licenseExpiry;

    @Column(name = "healthCheckDate")
    private LocalDate healthCheckDate;

    @ColumnDefault("5.00")
    @Column(name = "rating", precision = 3, scale = 2)
    private BigDecimal rating;

    @ColumnDefault("1")
    @Column(name = "priorityLevel")
    private Integer priorityLevel;

    @Size(max = 255)
    @Column(name = "note")
    private String note;

    @ColumnDefault("'AVAILABLE'")
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private DriverStatus status=DriverStatus.AVAILABLE;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

}