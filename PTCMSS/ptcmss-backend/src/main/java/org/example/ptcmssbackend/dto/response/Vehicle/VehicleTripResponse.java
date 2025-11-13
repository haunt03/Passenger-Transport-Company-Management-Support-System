package org.example.ptcmssbackend.dto.response.Vehicle;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class VehicleTripResponse {
    private Integer tripId;
    private Integer bookingId;
    private String startLocation;
    private String endLocation;
    private Instant startTime;
    private Instant endTime;
    private String status;
    private String note;
    private Instant assignedAt;
}


