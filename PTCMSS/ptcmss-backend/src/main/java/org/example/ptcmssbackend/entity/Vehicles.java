package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.VehicleStatus;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "vehicles")
public class Vehicles {
    @Id
    @Column(name = "vehicleId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoryId", nullable = false)
    private VehicleCategoryPricing category;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branchId", nullable = false)
    private Branches branch;

    @Size(max = 20)
    @NotNull
    @Column(name = "licensePlate", nullable = false, length = 20)
    private String licensePlate;

    @Size(max = 100)
    @Column(name = "model", length = 100)
    private String model;

    @Size(max = 100)
    @Column(name = "brand", length = 100)
    private String brand;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "productionYear")
    private Integer productionYear;

    @Column(name = "registrationDate")
    private LocalDate registrationDate;

    @Column(name = "inspectionExpiry")
    private LocalDate inspectionExpiry;

    @Column(name = "insuranceExpiry")
    private LocalDate insuranceExpiry;

    @Column(name = "odometer")
    private Long odometer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VehicleStatus status= VehicleStatus.AVAILABLE;

}