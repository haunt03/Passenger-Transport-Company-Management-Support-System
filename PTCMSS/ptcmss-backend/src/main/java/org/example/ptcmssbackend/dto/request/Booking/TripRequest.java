package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class TripRequest {
    private Instant startTime;
    private Instant endTime;

    @Size(max = 255, message = "Điểm đi không được quá 255 ký tự")
    private String startLocation;

    @Size(max = 255, message = "Điểm đến không được quá 255 ký tự")
    private String endLocation;

    private Boolean useHighway; // NULL = theo booking.useHighway
}
