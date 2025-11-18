package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class TripResponse {
    private Integer id;
    private Integer bookingId;
    private Instant startTime;
    private Instant endTime;
    private String startLocation;
    private String endLocation;
    private Boolean useHighway;
    private String status;

    // Thông tin điều phối (nếu đã gán)
    private Integer driverId;
    private String driverName;
    private Integer vehicleId;
    private String vehicleLicensePlate;
}
