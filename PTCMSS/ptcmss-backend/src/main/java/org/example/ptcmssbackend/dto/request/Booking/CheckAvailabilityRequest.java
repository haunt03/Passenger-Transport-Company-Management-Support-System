package org.example.ptcmssbackend.dto.request.Booking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class CheckAvailabilityRequest {

    @NotNull(message = "Branch ID is required")
    private Integer branchId;

    @NotNull(message = "Category ID is required")
    private Integer categoryId;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    @NotNull(message = "End time is required")
    private Instant endTime;

    @Min(1)
    private Integer quantity = 1;
}
