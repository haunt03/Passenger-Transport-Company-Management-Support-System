package org.example.ptcmssbackend.dto.response.rating;

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
    private Integer branchId;
    private String branchName;
    
    // Stats 30 ngày gần nhất
    private Integer totalRatings;
    private BigDecimal avgPunctuality;
    private BigDecimal avgAttitude;
    private BigDecimal avgSafety;
    private BigDecimal avgCompliance;
    private BigDecimal avgOverall;
    
    // Thống kê chuyến
    private Integer totalTrips;
    private Integer completedTrips;
    
    // Đánh giá gần đây
    private List<RatingResponse> recentRatings;
}
