package org.example.ptcmssbackend.dto.response.Trip;

import lombok.*;
import org.example.ptcmssbackend.entity.*;
import org.example.ptcmssbackend.enums.AssignmentAction;
import org.example.ptcmssbackend.enums.TripStatus;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

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

    private String vehiclePlate;
    private String vehicleModel;

    private TripStatus status;

    // Thông tin từ Booking
    private String bookingNote;
    private java.math.BigDecimal totalCost;
    private java.math.BigDecimal depositAmount;
    private java.math.BigDecimal remainingAmount;

    // Rating từ DriverRatings
    private java.math.BigDecimal rating;
    private String ratingComment;

    private List<AssignmentHistoryItem> history;

    @Data
    @Builder
    public static class AssignmentHistoryItem {
        private Instant time;
        private AssignmentAction action;
        private String driverName;
        private String vehiclePlate;
        private String note;
    }
}