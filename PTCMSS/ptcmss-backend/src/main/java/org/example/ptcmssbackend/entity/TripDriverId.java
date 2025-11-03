package org.example.ptcmssbackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.Hibernate;

import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@Embeddable
public class TripDriverId implements Serializable {
    private static final long serialVersionUID = 1165572442782977942L;
    @NotNull
    @Column(name = "tripId", nullable = false)
    private Integer tripId;

    @NotNull
    @Column(name = "driverId", nullable = false)
    private Integer driverId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        TripDriverId entity = (TripDriverId) o;
        return Objects.equals(this.driverId, entity.driverId) &&
                Objects.equals(this.tripId, entity.tripId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(driverId, tripId);
    }

}