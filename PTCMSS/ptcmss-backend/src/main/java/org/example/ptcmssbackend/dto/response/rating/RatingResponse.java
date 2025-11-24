package org.example.ptcmssbackend.dto.response.rating;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingResponse {
    private Integer id;
    private Integer tripId;
    private Integer driverId;
    private String driverName;
    private Integer customerId;
    private String customerName;
    
    private Integer punctualityRating;
    private Integer attitudeRating;
    private Integer safetyRating;
    private Integer complianceRating;
    private BigDecimal overallRating;
    
    private String comment;
    private Integer ratedBy;
    private String ratedByName;
    private Instant ratedAt;
}
