package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class CheckAvailabilityRequest {
    @NotNull
    private Integer branchId;

    @NotNull
    private Integer categoryId;

    @NotNull
    private Instant startTime;

    @NotNull
    private Instant endTime;

    @Min(1)
    private Integer quantity = 1;
}
