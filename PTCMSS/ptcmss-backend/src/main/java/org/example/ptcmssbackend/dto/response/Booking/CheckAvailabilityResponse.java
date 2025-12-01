package org.example.ptcmssbackend.dto.response.Booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class CheckAvailabilityResponse {
    private boolean ok;
    private int availableCount;
    private int needed;
    private int totalCandidates;
    private int busyCount;

    // Suggestions khi xe không khả dụng
    private List<AlternativeCategory> alternativeCategories;
    private List<NextAvailableSlot> nextAvailableSlots;

    /**
     * Loại xe thay thế có sẵn tại thời điểm yêu cầu
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlternativeCategory {
        private Integer categoryId;
        private String categoryName;
        private Integer seats;
        private int availableCount;
        private java.math.BigDecimal pricePerKm;
        private java.math.BigDecimal estimatedPrice;
    }

    /**
     * Thời gian rảnh tiếp theo của loại xe được yêu cầu
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NextAvailableSlot {
        private Instant availableFrom;
        private Instant availableUntil;
        private int availableCount;
        private String vehicleLicensePlate;
        private Integer vehicleId;
    }
}

