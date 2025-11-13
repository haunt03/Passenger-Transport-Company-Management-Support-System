package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.VehicleCategoryStatus;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
public class VehicleCategoryPricing {
    @Id
    @Column(name = "categoryId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Size(max = 100)
    @NotNull
    @Column(name = "categoryName", nullable = false, length = 100)
    private String categoryName;

    @Size(max = 255)
    @Column(name = "description")
    private String description;

    @Column(name = "baseFare", precision = 10, scale = 2)
    private BigDecimal baseFare;

    @Column(name = "pricePerKm", precision = 10, scale = 2)
    private BigDecimal pricePerKm;

    @Column(name = "highwayFee", precision = 10, scale = 2)
    private BigDecimal highwayFee;

    @Column(name = "fixedCosts", precision = 10, scale = 2)
    private BigDecimal fixedCosts;

    @ColumnDefault("(curdate())")
    @Column(name = "effectiveDate")
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VehicleCategoryStatus status = VehicleCategoryStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "createdAt")
    private Instant createdAt;

}