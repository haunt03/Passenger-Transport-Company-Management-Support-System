package org.example.ptcmssbackend.dto.response.dispatch;

import lombok.Builder;
import lombok.Data;
import org.example.ptcmssbackend.enums.BookingStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class PendingTripResponse {

    private Integer tripId;
    private Integer bookingId;

    // Branch
    private Integer branchId;
    private String branchName;

    // Customer
    private String customerName;
    private String customerPhone;

    // Route
    private String startLocation;
    private String endLocation;

    private Instant startTime;
    private Instant endTime;

    private Boolean useHighway;

    // Booking info
    private String hireTypeName;
    private BigDecimal estimatedCost;
    private BookingStatus bookingStatus;
}

