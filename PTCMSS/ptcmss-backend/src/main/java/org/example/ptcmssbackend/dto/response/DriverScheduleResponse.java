package org.example.ptcmssbackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.TripStatus;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverScheduleResponse {
    private Integer tripId;
    private String startLocation;
    private String endLocation;
    private Instant startTime;
    private TripStatus status;
}
