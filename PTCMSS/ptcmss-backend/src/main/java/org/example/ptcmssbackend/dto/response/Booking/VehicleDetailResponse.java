package org.example.ptcmssbackend.dto.response.Booking;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VehicleDetailResponse {
    private Integer vehicleCategoryId;
    private String categoryName;
    private Integer quantity;
    private Integer capacity; // Sức chứa của loại xe
}
