package org.example.ptcmssbackend.dto.response.dispatch;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AssignRespone {

    private Integer bookingId;
    private String bookingStatus;

    private List<AssignedTripInfo> trips;

    @Data
    @Builder
    public static class AssignedTripInfo {
        private Integer tripId;
        private String tripStatus;

        private Integer driverId;
        private String driverName;

        private Integer vehicleId;
        private String vehicleLicensePlate;
    }
}