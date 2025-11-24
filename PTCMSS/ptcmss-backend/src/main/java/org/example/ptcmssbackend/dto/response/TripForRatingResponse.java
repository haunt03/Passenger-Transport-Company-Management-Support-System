package org.example.ptcmssbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripForRatingResponse {
    private Integer tripId;
    private Integer bookingId;
    private Integer driverId;
    private String driverName;
    private Integer customerId;
    private String customerName;
    private String startLocation;
    private String endLocation;
    private Instant startTime;
    private Instant endTime;
    private String status;
}
