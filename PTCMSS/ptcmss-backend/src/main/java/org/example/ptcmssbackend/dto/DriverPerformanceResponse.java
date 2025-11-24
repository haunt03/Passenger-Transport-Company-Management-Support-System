package org.example.ptcmssbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverPerformanceResponse {
    private Integer driverId;
    private String driverName;
    private Integer days;
    
    // Rating statistics
    private Integer totalRatings;
    private BigDecimal avgPunctuality;
    private BigDecimal avgAttitude;
    private BigDecimal avgSafety;
    private BigDecimal avgCompliance;
    private BigDecimal avgOverall;
    
    // Recent ratings
    private List<RatingResponse> recentRatings;
}
