package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.TripStatus;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
public class Trips {
    @Id
    @Column(name = "tripId", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bookingId", nullable = false)
    private Bookings booking;

    @Column(name = "useHighway")
    private Boolean useHighway;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Size(max = 255)
    @Column(name = "startLocation")
    private String startLocation;

    @Size(max = 255)
    @Column(name = "endLocation")
    private String endLocation;

    @Column(name = "distance", precision = 10, scale = 2)
    private BigDecimal distance;

    @ColumnDefault("0.00")
    @Column(name = "incidentalCosts", precision = 10, scale = 2)
    private BigDecimal incidentalCosts;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private TripStatus status= TripStatus.SCHEDULED;

}