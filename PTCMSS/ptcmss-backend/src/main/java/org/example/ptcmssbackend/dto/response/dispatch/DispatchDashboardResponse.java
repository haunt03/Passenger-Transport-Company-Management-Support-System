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

    // Thống kê tổng quan
    private Integer pendingCount;      // Số chuyến chờ gắn lịch
    private Integer assignedCount;     // Số chuyến đã gắn lịch
    private Integer cancelledCount;    // Số chuyến đã hủy
    private Integer completedCount;    // Số chuyến đã hoàn thành
    private Integer inProgressCount;   // Số chuyến đang thực hiện

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
