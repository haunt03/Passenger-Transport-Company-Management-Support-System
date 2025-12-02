package org.example.ptcmssbackend.dto.response.Driver;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.TripStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DriverScheduleResponse {
    private Integer tripId;
    private String startLocation;
    private String endLocation;
    private Instant startTime;
    private Instant endTime;
    private TripStatus status;
    private BigDecimal rating; // Overall rating from DriverRatings
    private String ratingComment; // Comment from DriverRatings
}

