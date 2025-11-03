package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter
@Setter
@Entity
public class TripVehicles {
    @Id
    @Column(name = "tripVehicleId", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tripId", nullable = false)
    private Trips trip;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicleId", nullable = false)
    private Vehicles vehicle;

    @NotNull
    @CreationTimestamp
    @Column(name = "assignedAt", nullable = false)
    private Instant assignedAt;

    @Size(max = 255)
    @Column(name = "note")
    private String note;

}