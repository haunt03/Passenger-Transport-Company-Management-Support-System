package org.example.ptcmssbackend.dto.response.dispatch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.ptcmssbackend.enums.BookingStatus;
import org.example.ptcmssbackend.enums.VehicleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSuggestionResponse {

    private TripSummary summary;
    private List<PairSuggestion> suggestions;
    private List<DriverCandidate> drivers;
    private List<VehicleCandidate> vehicles;
    private Integer recommendedDriverId;
    private Integer recommendedVehicleId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TripSummary {
        private Integer tripId;
        private Integer bookingId;
        private Integer branchId;
        private String branchName;
        private String customerName;
        private String customerPhone;
        private Instant startTime;
        private Instant endTime;
        private String startLocation;
        private String endLocation;
        private String hireType;
        private String vehicleType;
        private BookingStatus bookingStatus;
        private String routeLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverCandidate {
        private Integer id;
        private String name;
        private String phone;
        private String branchName;
        private String licenseClass;
        private BigDecimal rating;
        private Integer tripsToday;
        private Integer score;
        private boolean eligible;
        private List<String> reasons;
        private Boolean hasHistoryWithCustomer; // Đã từng đi chuyến với khách hàng này
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleCandidate {
        private Integer id;
        private String plate;
        private String model;
        private Integer capacity;
        private VehicleStatus status;
        private Integer score;
        private boolean eligible;
        private List<String> reasons;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PairSuggestion {
        private DriverBrief driver;
        private VehicleBrief vehicle;
        private Integer score;
        private List<String> reasons;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverBrief {
        private Integer id;
        private String name;
        private String phone;
        private Boolean hasHistoryWithCustomer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleBrief {
        private Integer id;
        private String plate;
        private String model;
    }
}
