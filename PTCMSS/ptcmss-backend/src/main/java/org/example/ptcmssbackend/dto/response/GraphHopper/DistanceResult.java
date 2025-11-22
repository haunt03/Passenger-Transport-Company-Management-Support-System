package org.example.ptcmssbackend.dto.response.GraphHopper;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistanceResult {
    private Double distanceKm;       // Khoảng cách (km)
    private Double durationMinutes;  // Thời gian (phút)
    private String from;             // Địa chỉ điểm đi
    private String to;               // Địa chỉ điểm đến
}