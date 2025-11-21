package org.example.ptcmssbackend.dto.response.dispatch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispatchDashboardResponse {

    private List<PendingTripResponse> pendingTrips;
    private List<DriverScheduleItem> driverSchedules;
    private List<VehicleScheduleItem> vehicleSchedules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverScheduleItem {
        private Integer driverId;
        private String driverName;
        private String driverPhone;
        private ScheduleWindow shift;
        private List<ScheduleBlock> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleScheduleItem {
        private Integer vehicleId;
        private String licensePlate;
        private String model;
        private ScheduleWindow shift;
        private List<ScheduleBlock> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleWindow {
        private Instant start;
        private Instant end;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleBlock {
        private Instant start;
        private Instant end;
        private String type;
        private String ref;
        private String note;
    }
}
