package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "trip_drivers")
public class TripDrivers {
    @EmbeddedId
    private TripDriverId id;

    @MapsId("tripId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tripId", nullable = false)
    private Trips trip;

    @MapsId("driverId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driverId", nullable = false)
    private Drivers driver;

    @Size(max = 50)
    @ColumnDefault("'Main Driver'")
    @Column(name = "driverRole", length = 50)
    private String driverRole;

    @Column(name = "startTime")
    private Instant startTime;

    @Column(name = "endTime")
    private Instant endTime;

    @Size(max = 255)
    @Column(name = "note")
    private String note;

}