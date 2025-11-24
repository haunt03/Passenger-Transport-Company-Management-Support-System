package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.ptcmssbackend.enums.AssignmentAction;
import org.hibernate.annotations.CreationTimestamp;


import java.time.Instant;

@Entity
@Table(name = "trip_assignment_history")
@Getter
@Setter
public class TripAssignmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tripId", nullable = false)
    private Trips trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driverId")
    private Drivers driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicleId")
    private Vehicles vehicle;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private AssignmentAction action; // ASSIGN, REASSIGN, UNASSIGN, ACCEPT

    @Column(name = "note")
    private String note;

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();
}