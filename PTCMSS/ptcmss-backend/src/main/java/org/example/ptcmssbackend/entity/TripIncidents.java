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
@Table(name = "trip_incidents")
public class TripIncidents {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incidentId", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tripId", nullable = false)
    private Trips trip;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driverId", nullable = false)
    private Drivers driver;

    @Lob
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Size(max = 50)
    @Column(name = "severity", length = 50)
    private String severity = "NORMAL"; // ví dụ: NORMAL, CRITICAL, BLOCKER

    @Column(name = "resolved", nullable = false)
    private Boolean resolved = false;

    @CreationTimestamp
    @Column(name = "createdAt", updatable = false)
    private Instant createdAt;
}