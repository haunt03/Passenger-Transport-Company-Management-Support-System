package org.example.ptcmssbackend.dto.request.Trip;

import lombok.Data;
import org.example.ptcmssbackend.entity.Bookings;
import org.example.ptcmssbackend.entity.Trips;
import org.example.ptcmssbackend.enums.TripStatus;

import java.time.Instant;

@Data
public class TripSearchRequest {

    private String status;
    private Integer branchId;
    private Instant startFrom;
    private Instant startTo;
    private String keyword;

    public boolean match(Trips trip) {
        if (trip == null) return false;

        Bookings booking = trip.getBooking();

        // Lọc theo status
        if (status != null && !status.isBlank()) {
            try {
                TripStatus filterStatus =
                        TripStatus.valueOf(status.trim().toUpperCase().replace("-", "_"));
                if (trip.getStatus() != filterStatus) return false;
            } catch (Exception ignored) {}
        }

        // Lọc theo chi nhánh
        if (branchId != null) {
            if (booking == null || booking.getBranch() == null) return false;
            if (!booking.getBranch().getId().equals(branchId)) return false;
        }

        // Lọc theo thời gian
        if (startFrom != null && (trip.getStartTime() == null ||
                trip.getStartTime().isBefore(startFrom))) {
            return false;
        }
        if (startTo != null && (trip.getStartTime() == null ||
                trip.getStartTime().isAfter(startTo))) {
            return false;
        }

        // Lọc theo keyword (bookingId, customer name, phone)
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();

            if (booking != null) {
                if (String.valueOf(booking.getId()).contains(kw)) return true;

                if (booking.getCustomer() != null) {
                    if (booking.getCustomer().getFullName().toLowerCase().contains(kw))
                        return true;
                    if (booking.getCustomer().getPhone().toLowerCase().contains(kw))
                        return true;
                }
            }
            return false;
        }

        return true;
    }
}
