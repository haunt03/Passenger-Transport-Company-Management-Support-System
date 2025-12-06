package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@Entity
@Table(name = "booking_vehicle_details")
public class BookingVehicleDetails implements Serializable {
    @EmbeddedId
    private BookingVehicleDetailsId id;

    @MapsId("bookingId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bookingId", nullable = false)
    private Bookings booking;

    @MapsId("vehicleCategoryId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicleCategoryId", nullable = false)
    private VehicleCategoryPricing vehicleCategory;

    @NotNull
    @Column(name = "quantity", nullable = false)
    private Integer quantity;

}