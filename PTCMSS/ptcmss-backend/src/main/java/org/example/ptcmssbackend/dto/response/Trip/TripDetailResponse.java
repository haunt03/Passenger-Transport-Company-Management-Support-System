package org.example.ptcmssbackend.dto.response.Trip;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.TripStatus;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripDetailResponse {

    private Integer tripId;

    private Integer bookingId;
    private String customerName;
    private String customerPhone;

    private String startLocation;
    private String endLocation;

    private Instant startTime;
    private Instant endTime;

    private Boolean useHighway;

    private String driverName;
    private String driverPhone;

    private Integer vehicleId;
    private String vehiclePlate;
    private String vehicleModel;

    private TripStatus status;

    // Thông tin từ Booking
    private String bookingNote;
    private String hireType; // ONE_WAY, ROUND_TRIP, DAILY, MULTI_DAY
    private String hireTypeName; // Tên hiển thị: "Một chiều", "Hai chiều", "Theo ngày", etc.
    private java.math.BigDecimal totalCost;
    private java.math.BigDecimal depositAmount;
    private java.math.BigDecimal remainingAmount;

    // Rating từ DriverRatings
    private java.math.BigDecimal rating;
    private String ratingComment;
}