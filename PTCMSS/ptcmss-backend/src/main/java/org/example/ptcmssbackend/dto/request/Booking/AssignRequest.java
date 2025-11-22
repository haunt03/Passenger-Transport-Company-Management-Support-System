package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AssignRequest {

    @NotNull(message = "Driver ID is required")
    private Integer driverId; // optional

    @NotNull(message = "Vehicle ID is required")
    private Integer vehicleId; // optional

    @NotNull(message = "Trip IDs is required")
    private List<Integer> tripIds; // optional, if empty -> apply to all trips of booking
    private String note; // optional
}
