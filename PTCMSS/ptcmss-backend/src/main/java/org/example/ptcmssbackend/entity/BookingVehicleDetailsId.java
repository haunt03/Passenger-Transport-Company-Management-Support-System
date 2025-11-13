package org.example.ptcmssbackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class BookingVehicleDetailsId implements Serializable {

    @Column(name = "bookingId")
    private Integer bookingId;

    @Column(name = "vehicleCategoryId")
    private Integer vehicleCategoryId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BookingVehicleDetailsId)) return false;
        BookingVehicleDetailsId that = (BookingVehicleDetailsId) o;
        return Objects.equals(bookingId, that.bookingId) &&
                Objects.equals(vehicleCategoryId, that.vehicleCategoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bookingId, vehicleCategoryId);
    }
}